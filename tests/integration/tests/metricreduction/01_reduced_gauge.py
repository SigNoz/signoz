from collections.abc import Callable
from datetime import UTC, datetime, timedelta

import clickhouse_connect.driver.client
import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metricreduction import assert_spans_shards
from fixtures.metrics import (
    Metrics,
    MetricsReducedSampleLast60s,
    MetricsReducedTimeSeries,
)
from fixtures.querier import aligned_epoch, query_metric_values


def test_query_spanning_rule_activation_combines_raw_and_reduced_data(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
    insert_reduced_metrics: Callable[..., None],
    clickhouse_node_conns: list[clickhouse_connect.driver.client.Client],
) -> None:
    """Before a reduction rule activates, data lives in the raw tables; after,
    only the reduced tables have data. A single query spanning the activation
    time must return one continuous series with no gap and no double counting:
    32 raw series at 2.0 collapse into 16 groups whose per-minute total is
    4.0, so the summed value stays 320 per step on both sides. Enough series
    are seeded that both shards hold data (checked below), so correct totals
    also prove the queries read every shard."""
    metric_name = "test_reduction_activation_boundary"
    base_epoch = aligned_epoch(timedelta(hours=30), step_seconds=300)
    services = [f"svc-{i:02d}" for i in range(16)]

    # first 30 minutes: raw data (2 pods per service, one sample per minute)
    insert_metrics(
        [
            Metrics(
                metric_name=metric_name,
                labels={"service": service, "pod": f"{service}-pod-{pod}"},
                timestamp=datetime.fromtimestamp(base_epoch + minute * 60, tz=UTC),
                value=2.0,
                type_="Gauge",
                is_monotonic=False,
            )
            for service in services
            for pod in range(2)
            for minute in range(30)
        ]
    )

    # next 30 minutes: reduced data only (one row per service per minute)
    time_series = [
        MetricsReducedTimeSeries(
            metric_name=metric_name,
            kept_labels={"service": service},
            timestamp=datetime.fromtimestamp(base_epoch + 30 * 60, tz=UTC),
        )
        for service in services
    ]
    insert_reduced_metrics(
        time_series,
        [
            MetricsReducedSampleLast60s(
                metric_name=metric_name,
                reduced_fingerprint=ts.fingerprint,
                timestamp=datetime.fromtimestamp(base_epoch + (30 + minute) * 60, tz=UTC),
                sum_last=4.0,
                min_value=2.0,
                max_value=2.0,
                sum_values=4.0,
                count_series=2,
                count_samples=2,
            )
            for ts in time_series
            for minute in range(30)
        ],
    )

    assert_spans_shards(clickhouse_node_conns, "time_series_v4", metric_name, total=len(services) * 2)
    assert_spans_shards(clickhouse_node_conns, "time_series_v4_reduced", metric_name, total=len(services))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    values = query_metric_values(signoz, token, metric_name, base_epoch, base_epoch + 3600, "sum", "sum", step_interval=300)

    assert [v["timestamp"] for v in values] == [(base_epoch + step * 300) * 1000 for step in range(12)]
    assert [v["value"] for v in values] == [320.0] * 12


@pytest.mark.parametrize(
    "space_agg, expected",
    [
        ("sum", 12.0),  # sum_last: 4 + 8
        ("avg", 3.0),  # sum(sum_last) / sum(count_series): 12 / 4
        ("min", 1.0),  # min(min)
        ("max", 6.0),  # max(max)
    ],
)
def test_aggregations_across_series(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_reduced_metrics: Callable[..., None],
    space_agg: str,
    expected: float,
) -> None:
    """Aggregating across series reads the pre-aggregated reduced columns:
    sum/avg from sum_last with the count_series weight, min/max from the
    min/max columns."""
    metric_name = f"test_reduction_across_series_{space_agg}"
    base_epoch = aligned_epoch(timedelta(hours=30), step_seconds=300)

    groups = [
        # (service, sum_last, min, max, count_series)
        ("a", 4.0, 1.0, 3.0, 2),
        ("b", 8.0, 2.0, 6.0, 2),
    ]
    time_series = {
        service: MetricsReducedTimeSeries(
            metric_name=metric_name,
            kept_labels={"service": service},
            timestamp=datetime.fromtimestamp(base_epoch, tz=UTC),
        )
        for service, _, _, _, _ in groups
    }
    insert_reduced_metrics(
        list(time_series.values()),
        [
            MetricsReducedSampleLast60s(
                metric_name=metric_name,
                reduced_fingerprint=time_series[service].fingerprint,
                timestamp=datetime.fromtimestamp(base_epoch + minute * 60, tz=UTC),
                sum_last=sum_last,
                min_value=min_value,
                max_value=max_value,
                sum_values=sum_last,
                count_series=count_series,
                count_samples=count_series,
            )
            for service, sum_last, min_value, max_value, count_series in groups
            for minute in range(20)
        ],
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    values = query_metric_values(signoz, token, metric_name, base_epoch, base_epoch + 20 * 60, "avg", space_agg, step_interval=300)

    assert [v["timestamp"] for v in values] == [(base_epoch + step * 300) * 1000 for step in range(4)]
    assert [v["value"] for v in values] == [expected] * 4


def test_recomputed_minutes_use_only_the_newest_values(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_reduced_metrics: Callable[..., None],
) -> None:
    """The collector rewrites recent minutes on every refresh, so the same
    minute exists multiple times with increasing computed_at. Queries must
    count each minute once, using its newest version: write the same minutes
    twice with different values and only the second write may show up."""
    metric_name = "test_reduction_recompute"
    base_epoch = aligned_epoch(timedelta(hours=30), step_seconds=300)

    time_series = [
        MetricsReducedTimeSeries(
            metric_name=metric_name,
            kept_labels={"service": service},
            timestamp=datetime.fromtimestamp(base_epoch, tz=UTC),
        )
        for service in ("a", "b")
    ]

    def minute_rows(sum_last: float, computed_at_offset_seconds: int) -> list[MetricsReducedSampleLast60s]:
        return [
            MetricsReducedSampleLast60s(
                metric_name=metric_name,
                reduced_fingerprint=ts.fingerprint,
                timestamp=datetime.fromtimestamp(base_epoch + minute * 60, tz=UTC),
                sum_last=sum_last,
                min_value=sum_last,
                max_value=sum_last,
                sum_values=sum_last,
                count_series=1,
                count_samples=1,
                computed_at=datetime.fromtimestamp(base_epoch + minute * 60 + computed_at_offset_seconds, tz=UTC),
            )
            for ts in time_series
            for minute in range(10)
        ]

    # first write says 1.0; a later rewrite of the same minutes says 5.0
    insert_reduced_metrics(time_series, minute_rows(sum_last=1.0, computed_at_offset_seconds=120))
    insert_reduced_metrics(time_series, minute_rows(sum_last=5.0, computed_at_offset_seconds=180))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    values = query_metric_values(signoz, token, metric_name, base_epoch, base_epoch + 10 * 60, "sum", "sum", step_interval=300)

    # 2 groups x 5 minutes x 5.0 per step; the 1.0 rows must not contribute
    assert [v["timestamp"] for v in values] == [(base_epoch + step * 300) * 1000 for step in range(2)]
    assert [v["value"] for v in values] == [50.0] * 2
