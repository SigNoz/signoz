from collections.abc import Callable
from datetime import datetime, timedelta
from http import HTTPStatus

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import (
    assert_grouped_series,
    build_group_by_field,
    build_logs_aggregation,
    get_resource_evolution_time,
    index_series_by_label,
    make_query_request,
)
from fixtures.traces import TraceIdGenerator, Traces


# Spans with timestamps before the evolution time will have resources written only to resources_string.
# Spans with timestamps at or after the evolution time will have resources written to both resources_string and resource (JSON).
def _build_evolved_span(
    timestamp: datetime,
    evolution_time: datetime,
    service_name: str,
    name: str,
) -> Traces:
    resource_write_mode = "legacy_only" if timestamp < evolution_time else "dual_write"
    return Traces(
        timestamp=timestamp,
        trace_id=TraceIdGenerator.trace_id(),
        span_id=TraceIdGenerator.span_id(),
        name=name,
        resources={
            "service.name": service_name,
            "deployment.environment": "integration",
        },
        resource_write_mode=resource_write_mode,
    )


def _query_grouped_trace_series(
    signoz: types.SigNoz,
    token: str,
    start: datetime,
    end: datetime,
    group_by: str = "service.name",
    aggregation: str = "count()",
) -> dict[str, list[dict]]:
    response = make_query_request(
        signoz,
        token,
        start_ms=int(start.timestamp() * 1000),
        end_ms=int(end.timestamp() * 1000),
        request_type="time_series",
        queries=[
            {
                "type": "builder_query",
                "spec": {
                    "name": "A",
                    "signal": "traces",
                    "stepInterval": 60,
                    "disabled": False,
                    "groupBy": [build_group_by_field(group_by)],
                    "having": {"expression": ""},
                    "aggregations": [build_logs_aggregation(aggregation)],
                },
            }
        ],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1

    aggregations = results[0]["aggregations"]
    assert len(aggregations) == 1

    return index_series_by_label(aggregations[0]["series"], group_by)


def _test_traces_resource_evolution(
    signoz: types.SigNoz,
    token: str,
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    # 1. Get the evolution time.
    # 2. Ingest spans before the evolution time.
    # 3. Ingest spans after the evolution time.
    # 4. Query the spans before the evolution time.
    # 5. Query the spans after the evolution time.
    # Both aggregation and group by should be checked.
    """
    evolution_time = get_resource_evolution_time(signoz, "traces")
    evolution_time = evolution_time.replace(second=0, microsecond=0)

    before_2 = evolution_time - timedelta(minutes=10)
    before_1 = evolution_time - timedelta(minutes=5)
    after_1 = evolution_time + timedelta(minutes=5)
    after_2 = evolution_time + timedelta(minutes=10)

    insert_traces(
        [
            _build_evolved_span(
                timestamp=before_2,
                evolution_time=evolution_time,
                service_name="svc-before-2",
                name="span before evolution 2",
            ),
            _build_evolved_span(
                timestamp=before_1,
                evolution_time=evolution_time,
                service_name="svc-before-1",
                name="span before evolution 1",
            ),
            _build_evolved_span(
                timestamp=after_1,
                evolution_time=evolution_time,
                service_name="svc-after-1",
                name="span after evolution 1",
            ),
            _build_evolved_span(
                timestamp=after_2,
                evolution_time=evolution_time,
                service_name="svc-after-2",
                name="span after evolution 2",
            ),
        ]
    )

    before_series = _query_grouped_trace_series(signoz, token, before_2 - timedelta(minutes=1), before_1 + timedelta(minutes=1))
    assert_grouped_series(
        before_series,
        expected_values_by_group={
            "svc-before-2": {
                int(before_2.timestamp() * 1000): 1,
            },
            "svc-before-1": {
                int(before_1.timestamp() * 1000): 1,
            },
        },
    )

    after_series = _query_grouped_trace_series(signoz, token, after_1 - timedelta(minutes=1), after_2 + timedelta(minutes=1))
    assert_grouped_series(
        after_series,
        expected_values_by_group={
            "svc-after-1": {
                int(after_1.timestamp() * 1000): 1,
            },
            "svc-after-2": {
                int(after_2.timestamp() * 1000): 1,
            },
        },
    )

    spanning_series = _query_grouped_trace_series(signoz, token, before_2, after_2 + timedelta(minutes=1))
    assert_grouped_series(
        spanning_series,
        expected_values_by_group={
            "svc-before-2": {
                int(before_2.timestamp() * 1000): 1,
            },
            "svc-before-1": {
                int(before_1.timestamp() * 1000): 1,
            },
            "svc-after-1": {
                int(after_1.timestamp() * 1000): 1,
            },
            "svc-after-2": {
                int(after_2.timestamp() * 1000): 1,
            },
        },
    )

    # query to check aggregation on the resource field like count_distinct(service.name)
    aggregation_series = _query_grouped_trace_series(
        signoz,
        token,
        before_2,
        after_2 + timedelta(minutes=1),
        group_by="deployment.environment",
        aggregation="count_distinct(service.name)",
    )
    assert_grouped_series(
        aggregation_series,
        expected_values_by_group={
            "integration": {
                int(before_2.timestamp() * 1000): 1,
                int(before_1.timestamp() * 1000): 1,
                int(after_1.timestamp() * 1000): 1,
                int(after_2.timestamp() * 1000): 1,
            },
        },
    )


def test_traces_resource_evolution(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    _test_traces_resource_evolution(signoz, token, insert_traces)
