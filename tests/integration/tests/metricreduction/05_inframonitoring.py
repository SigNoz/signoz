"""Infra-monitoring v2 list endpoints on the metrics-reduction path.

With reduction enabled, every list endpoint unions raw and reduced series and
restricts each side with a fingerprint IN (samples) subquery. Those subqueries
must read local tables: a distributed subquery inside the distributed outer
query is rejected by ClickHouse with error 288 (distributed_product_mode =
'deny'), which only ever fires on a multi-shard cluster — exactly what this
package's fixtures provide. Seed raw-only and reduced-only entities and assert
each endpoint returns the union of both."""

from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import clickhouse_connect.driver.client
import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metricreduction import assert_spans_shards
from fixtures.metrics import (
    Metrics,
    MetricsReducedSampleLast60s,
    MetricsReducedTimeSeries,
)
from fixtures.querier import aligned_epoch

MINUTES = 5
COUNT_PER_SOURCE = 8

POD_EXTRA_LABELS = {
    "k8s.namespace.name": "ns-mr",
    "k8s.node.name": "node-mr",
    "k8s.cluster.name": "cluster-mr",
    "k8s.statefulset.name": "",
    "k8s.daemonset.name": "",
    "k8s.job.name": "",
    "k8s.cronjob.name": "",
    "k8s.pod.start_time": "2025-01-01T00:00:00Z",
}


@pytest.mark.parametrize(
    "endpoint, prefix, metric_names, labels_of, name_of",
    [
        pytest.param(
            "/api/v2/infra_monitoring/hosts",
            "host",
            ["system.cpu.load_average.15m"],
            lambda name: {"host.name": name, "os.type": "linux"},
            lambda record: record["hostName"],
            id="hosts",
        ),
        pytest.param(
            "/api/v2/infra_monitoring/nodes",
            "node",
            ["k8s.node.cpu.usage", "k8s.node.memory.working_set"],
            lambda name: {"k8s.node.name": name, "k8s.node.uid": f"{name}-uid", "k8s.cluster.name": "cluster-mr"},
            lambda record: record["nodeName"],
            id="nodes",
        ),
        pytest.param(
            "/api/v2/infra_monitoring/pods",
            "pod",
            ["k8s.pod.cpu.usage", "k8s.pod.memory.working_set"],
            lambda name: {"k8s.pod.uid": f"{name}-uid", "k8s.pod.name": name, "k8s.deployment.name": "dep-mr", **POD_EXTRA_LABELS},
            lambda record: record["meta"]["k8s.pod.name"],
            id="pods",
        ),
        pytest.param(
            "/api/v2/infra_monitoring/clusters",
            "cluster",
            ["k8s.node.cpu.usage", "k8s.node.memory.working_set"],
            lambda name: {"k8s.node.name": f"{name}-n1", "k8s.node.uid": f"{name}-n1-uid", "k8s.cluster.name": name},
            lambda record: record["clusterName"],
            id="clusters",
        ),
        pytest.param(
            "/api/v2/infra_monitoring/deployments",
            "deployment",
            ["k8s.pod.cpu.usage", "k8s.pod.memory.working_set"],
            lambda name: {"k8s.pod.uid": f"{name}-p1-uid", "k8s.pod.name": f"{name}-p1", "k8s.deployment.name": name, **POD_EXTRA_LABELS},
            lambda record: record["deploymentName"],
            id="deployments",
        ),
    ],
)
def test_list_merges_raw_and_reduced_entities(  # pylint: disable=too-many-arguments,too-many-positional-arguments,too-many-locals
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
    insert_reduced_metrics: Callable[..., None],
    clickhouse_node_conns: list[clickhouse_connect.driver.client.Client],
    endpoint: str,
    prefix: str,
    metric_names: list[str],
    labels_of: Callable[[str], dict],
    name_of: Callable[[dict], str],
) -> None:
    """One set of entities exists only in the raw tables, another only in the
    reduced tables. The list response must contain both sets: pre-fix, the
    reduced branch's fingerprint subquery on distributed tables made every one
    of these endpoints fail with ClickHouse error 288."""
    base_epoch = aligned_epoch(timedelta(hours=30), step_seconds=300)
    raw_names = [f"{prefix}-raw-{i}" for i in range(COUNT_PER_SOURCE)]
    reduced_names = [f"{prefix}-red-{i}" for i in range(COUNT_PER_SOURCE)]

    insert_metrics(
        [
            Metrics(
                metric_name=metric,
                labels=labels_of(name),
                timestamp=datetime.fromtimestamp(base_epoch + minute * 60, tz=UTC),
                value=0.5,
                type_="Gauge",
                is_monotonic=False,
            )
            for name in raw_names
            for metric in metric_names
            for minute in range(MINUTES)
        ]
    )

    time_series = [
        MetricsReducedTimeSeries(
            metric_name=metric,
            kept_labels=labels_of(name),
            timestamp=datetime.fromtimestamp(base_epoch, tz=UTC),
        )
        for name in reduced_names
        for metric in metric_names
    ]
    insert_reduced_metrics(
        time_series,
        [
            MetricsReducedSampleLast60s(
                metric_name=ts.metric_name,
                reduced_fingerprint=ts.fingerprint,
                timestamp=datetime.fromtimestamp(base_epoch + minute * 60, tz=UTC),
                sum_last=0.5,
                min_value=0.5,
                max_value=0.5,
                sum_values=0.5,
                count_series=1,
                count_samples=1,
            )
            for ts in time_series
            for minute in range(MINUTES)
        ],
    )

    assert_spans_shards(clickhouse_node_conns, "time_series_v4", metric_names[0], total=COUNT_PER_SOURCE)
    assert_spans_shards(clickhouse_node_conns, "time_series_v4_reduced", metric_names[0], total=COUNT_PER_SOURCE)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.post(
        signoz.self.host_configs["8080"].get(endpoint),
        headers={"authorization": f"Bearer {token}"},
        json={
            "start": base_epoch * 1000,
            "end": (base_epoch + 30 * 60) * 1000,
            "limit": 50,
        },
        timeout=30,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    records = response.json()["data"]["records"]
    assert {name_of(r) for r in records} == set(raw_names) | set(reduced_names)


def test_hosts_groupby_counts_span_raw_and_reduced(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
    insert_reduced_metrics: Callable[..., None],
    clickhouse_node_conns: list[clickhouse_connect.driver.client.Client],
) -> None:
    """Grouped hosts responses build per-group status counts over the same
    raw + reduced union (a hosts-only query, separate from the list path).
    Raw hosts are seeded as linux and reduced hosts as windows, so each group's
    host count proves its side of the union was read."""
    metric_name = "system.cpu.load_average.15m"
    base_epoch = aligned_epoch(timedelta(hours=30), step_seconds=300)
    raw_names = [f"grp-raw-{i}" for i in range(COUNT_PER_SOURCE)]
    reduced_names = [f"grp-red-{i}" for i in range(COUNT_PER_SOURCE)]

    insert_metrics(
        [
            Metrics(
                metric_name=metric_name,
                labels={"host.name": name, "os.type": "linux"},
                timestamp=datetime.fromtimestamp(base_epoch + minute * 60, tz=UTC),
                value=1.5,
                type_="Gauge",
                is_monotonic=False,
            )
            for name in raw_names
            for minute in range(MINUTES)
        ]
    )

    time_series = [
        MetricsReducedTimeSeries(
            metric_name=metric_name,
            kept_labels={"host.name": name, "os.type": "windows"},
            timestamp=datetime.fromtimestamp(base_epoch, tz=UTC),
        )
        for name in reduced_names
    ]
    insert_reduced_metrics(
        time_series,
        [
            MetricsReducedSampleLast60s(
                metric_name=metric_name,
                reduced_fingerprint=ts.fingerprint,
                timestamp=datetime.fromtimestamp(base_epoch + minute * 60, tz=UTC),
                sum_last=1.5,
                min_value=1.5,
                max_value=1.5,
                sum_values=1.5,
                count_series=1,
                count_samples=1,
            )
            for ts in time_series
            for minute in range(MINUTES)
        ],
    )

    assert_spans_shards(clickhouse_node_conns, "time_series_v4", metric_name, total=COUNT_PER_SOURCE)
    assert_spans_shards(clickhouse_node_conns, "time_series_v4_reduced", metric_name, total=COUNT_PER_SOURCE)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/infra_monitoring/hosts"),
        headers={"authorization": f"Bearer {token}"},
        json={
            "start": base_epoch * 1000,
            "end": (base_epoch + 30 * 60) * 1000,
            "limit": 50,
            "groupBy": [
                {
                    "name": "os.type",
                    "fieldDataType": "string",
                    "fieldContext": "resource",
                },
            ],
        },
        timeout=30,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    records = response.json()["data"]["records"]
    by_group = {r["meta"]["os.type"]: r for r in records}
    assert set(by_group.keys()) == {"linux", "windows"}
    for group in ("linux", "windows"):
        rec = by_group[group]
        assert rec["activeHostCount"] + rec["inactiveHostCount"] == COUNT_PER_SOURCE, f"{group}: got {rec['activeHostCount']} active + {rec['inactiveHostCount']} inactive"
