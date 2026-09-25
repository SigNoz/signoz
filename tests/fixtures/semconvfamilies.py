from collections.abc import Callable, Generator
from datetime import UTC, datetime, timedelta
from http import HTTPStatus
from time import sleep

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs, insert_logs_to_clickhouse
from fixtures.metrics import Metrics
from fixtures.querier import (
    RequestType,
    build_metrics_aggregation,
    build_order_by,
    build_raw_query,
    build_scalar_query,
    get_column_data_from_response,
    get_scalar_table_data,
    make_query_request,
)
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode, insert_traces_to_clickhouse

PREFIX = "semconv-fam"
CURRENT_KEY = "deployment.environment.name"
OLD_KEY = "deployment.environment"

# Tests compare identity sets filtered by PREFIX, so reruns on a reused stack
# with leftover rows stay stable.
OLD = f"{PREFIX}-old"
NEW = f"{PREFIX}-new"
BOTH = f"{PREFIX}-both"  # current "staging" and old "production" - the conflict row
NEITHER = f"{PREFIX}-neither"

_ROWS = [
    (OLD, {OLD_KEY: "production"}, timedelta(seconds=4)),
    (NEW, {CURRENT_KEY: "production"}, timedelta(seconds=3)),
    (BOTH, {CURRENT_KEY: "staging", OLD_KEY: "production"}, timedelta(seconds=2)),
    (NEITHER, {}, timedelta(seconds=1)),
]


@pytest.fixture(name="family_fleet", scope="package")
def family_fleet(clickhouse: types.TestContainerClickhouse) -> Generator[datetime]:
    """Seeds one time per package. The base aligns to the minute, so no row
    offset crosses a 60s time-series bucket boundary."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0) - timedelta(minutes=1)

    def insert_traces(traces: list[Traces]) -> None:
        insert_traces_to_clickhouse(clickhouse.conn, traces)

    def insert_logs(logs: list[Logs]) -> None:
        insert_logs_to_clickhouse(clickhouse.conn, logs)

    insert_traces(
        [
            Traces(
                timestamp=now - offset,
                duration=timedelta(milliseconds=10),
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name=identity,
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                resources={"service.name": identity, **family},
                attributes=dict(family),
            )
            for identity, family, offset in _ROWS
        ]
    )
    insert_logs(
        [
            Logs(
                timestamp=now - offset,
                body=identity,
                resources={"service.name": identity, **family},
                attributes=dict(family),
            )
            for identity, family, offset in _ROWS
        ]
    )
    yield now


def query_identities(
    signoz: types.SigNoz,
    token: str,
    base: datetime,
    expression: str,
    signal: str,
    identity_field: str,
    identity_column: str,
) -> set[str]:
    response = make_query_request(
        signoz,
        token,
        start_ms=int((base - timedelta(minutes=2)).timestamp() * 1000),
        end_ms=int((base + timedelta(minutes=1)).timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[
            build_raw_query(
                "A",
                signal,
                limit=100,
                filter_expression=expression,
                order=[build_order_by("timestamp", "asc")],
                select_fields=[{"name": identity_field}],
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    return {name for name in get_column_data_from_response(response.json(), identity_column) if name.startswith(PREFIX)}


LABEL_METRIC = "semconv.fam.label.metric"
OLD_NAME_METRIC = "k8s.pod.cpu.utilization"
CURRENT_NAME_METRIC = "k8s.pod.cpu.usage"
NORMALIZED_OLD_NAME_METRIC = "k8s_pod_cpu_utilization"
NORMALIZED_CURRENT_NAME_METRIC = "k8s_pod_cpu_usage"


def scalar_query(
    signoz: types.SigNoz,
    token: str,
    now: datetime,
    metric_name: str,
    filter_expression: str | None = None,
    group_by: list[dict] | None = None,
):
    return make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=30)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type=RequestType.SCALAR,
        queries=[
            build_scalar_query(
                name="A",
                signal="metrics",
                aggregations=[build_metrics_aggregation(metric_name, "latest", "sum", "unspecified", reduce_to="last")],
                filter_expression=filter_expression,
                group_by=group_by,
            )
        ],
    )


def label_metric_sum(signoz: types.SigNoz, token: str, now: datetime, filter_expression: str) -> float:
    response = scalar_query(signoz, token, now, LABEL_METRIC, filter_expression=filter_expression)
    assert response.status_code == HTTPStatus.OK, response.text
    rows = get_scalar_table_data(response.json())
    return rows[0][-1] if rows else 0.0


@pytest.fixture(name="metric_family_fleet", scope="function")
def metric_family_fleet(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> datetime:
    """Every series has a power-of-two value, so a missed member is a unique
    wrong sum."""
    now = datetime.now(tz=UTC)
    # The querier clamps very recent metric samples (flux interval), so the
    # fleet sits in the past.
    seeded = now - timedelta(minutes=10)
    gauge = {"temporality": "Unspecified", "type_": "Gauge", "is_monotonic": False}
    insert_metrics(
        [
            Metrics(metric_name=LABEL_METRIC, labels={"deployment.environment.name": "staging"}, timestamp=seeded, value=1.0, **gauge),
            Metrics(metric_name=LABEL_METRIC, labels={"deployment.environment": "production"}, timestamp=seeded, value=2.0, **gauge),
            Metrics(metric_name=LABEL_METRIC, labels={"deployment_environment": "production"}, timestamp=seeded, value=4.0, **gauge),
            Metrics(metric_name=LABEL_METRIC, labels={"region": "keyless"}, timestamp=seeded, value=8.0, **gauge),
            Metrics(metric_name=OLD_NAME_METRIC, labels={"pod": "a"}, timestamp=seeded, value=16.0, **gauge),
            Metrics(metric_name=CURRENT_NAME_METRIC, labels={"pod": "b"}, timestamp=seeded, value=32.0, **gauge),
            Metrics(metric_name=LABEL_METRIC, labels={"deployment.environment.name": "staging", "deployment.environment": "production"}, timestamp=seeded, value=64.0, **gauge),
            Metrics(metric_name=LABEL_METRIC, labels={"resource_deployment_environment": "production"}, timestamp=seeded, value=128.0, **gauge),
            Metrics(metric_name=NORMALIZED_OLD_NAME_METRIC, labels={"pod": "c"}, timestamp=seeded, value=256.0, **gauge),
            Metrics(metric_name=NORMALIZED_CURRENT_NAME_METRIC, labels={"pod": "d"}, timestamp=seeded, value=512.0, **gauge),
        ]
    )

    # Metric metadata lags the insert. Each probe reads a label value only
    # its own series carries, so the family union of the flag-on instance
    # cannot pass before every member is queryable.
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    probes = [
        (LABEL_METRIC, "region = 'keyless'"),
        (OLD_NAME_METRIC, "pod = 'a'"),
        (CURRENT_NAME_METRIC, "pod = 'b'"),
        (NORMALIZED_OLD_NAME_METRIC, "pod = 'c'"),
        (NORMALIZED_CURRENT_NAME_METRIC, "pod = 'd'"),
    ]
    deadline = datetime.now(tz=UTC) + timedelta(seconds=60)
    while datetime.now(tz=UTC) < deadline:
        seen = [get_scalar_table_data(scalar_query(signoz, token, datetime.now(tz=UTC), metric, filter_expression=expression).json()) for metric, expression in probes]
        if all(rows for rows in seen):
            return now
        sleep(1)
    raise AssertionError(f"seeded metrics never became queryable: {seen}")
