from collections.abc import Callable, Generator
from datetime import UTC, datetime, timedelta

import pytest

from fixtures import types
from fixtures.metadata import AttributesMetadata
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode

SEMCONV_PHASE1_CURRENT = "deployment.environment.name"
SEMCONV_PHASE1_OLD = "deployment.environment"
SEMCONV_PHASE1_PREFIX = "semconv-phase1"


@pytest.fixture(name="semconv_phase1_data")
def semconv_phase1_data(
    insert_traces: Callable[[list[Traces]], None],
    insert_attributes_metadata: Callable[[list[AttributesMetadata]], None],
    clickhouse: types.TestContainerClickhouse,
) -> Generator[datetime]:
    now = datetime.now(tz=UTC).replace(microsecond=0) - timedelta(minutes=2)
    records = [
        (now - timedelta(seconds=5), "old", {SEMCONV_PHASE1_OLD: "production"}),
        (now - timedelta(seconds=4), "current", {SEMCONV_PHASE1_CURRENT: "production"}),
        (now - timedelta(seconds=3), "both", {SEMCONV_PHASE1_OLD: "production", SEMCONV_PHASE1_CURRENT: "production"}),
        (now - timedelta(seconds=2), "conflict", {SEMCONV_PHASE1_OLD: "staging", SEMCONV_PHASE1_CURRENT: "production"}),
        (now - timedelta(seconds=1), "staging", {SEMCONV_PHASE1_OLD: "staging"}),
        (now, "missing", {}),
    ]
    traces = []
    for timestamp, suffix, environment in records:
        service = f"{SEMCONV_PHASE1_PREFIX}-{suffix}"
        traces.append(
            Traces(
                timestamp=timestamp,
                duration=timedelta(milliseconds=10),
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name=service,
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                resources={"service.name": service, **environment},
                attributes=dict(environment),
            )
        )
    insert_traces(traces)

    # The production collector writes this deduplicated metadata table. Trace
    # fixtures insert storage rows directly, so mirror that write explicitly
    # to exercise the migration report against the same mixed-generation data.
    insert_attributes_metadata(
        [
            AttributesMetadata(
                data_source="traces",
                resource_attributes={"service.name": f"{SEMCONV_PHASE1_PREFIX}-{suffix}", **environment},
                attributes=environment,
                timestamp=timestamp,
            )
            for timestamp, suffix, environment in records
        ]
    )

    # Service-map rows are derived by the collector in production. Seed the
    # derived table directly so this test isolates the backend alias allowlist;
    # the collector repository owns its write-path integration test.
    for environment, suffix in (("production", "production"), ("staging", "staging")):
        clickhouse.conn.command(
            f"""
            INSERT INTO signoz_traces.distributed_dependency_graph_minutes_v2
                (src, dest, duration_quantiles_state, error_count, total_count, timestamp,
                 deployment_environment, k8s_cluster_name, k8s_namespace_name)
            SELECT
                '{SEMCONV_PHASE1_PREFIX}-map-{suffix}', '{SEMCONV_PHASE1_PREFIX}-map-child',
                quantilesState(0.5, 0.75, 0.9, 0.95, 0.99)(toFloat64(1000000)),
                toUInt64(0), toUInt64(1), toDateTime({int(now.timestamp())}),
                '{environment}', '', ''
            """
        )

    yield now

    cluster = clickhouse.env["SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_CLUSTER"]
    clickhouse.conn.command(f"ALTER TABLE signoz_traces.dependency_graph_minutes_v2 ON CLUSTER '{cluster}' DELETE WHERE startsWith(src, '{SEMCONV_PHASE1_PREFIX}-map-') SETTINGS mutations_sync = 1")
