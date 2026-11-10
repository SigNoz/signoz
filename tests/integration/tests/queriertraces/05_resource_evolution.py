from collections.abc import Callable
from datetime import timedelta
from http import HTTPStatus

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import (
    RequestType,
    assert_grouped_series,
    build_aggregation,
    build_group_by_field,
    build_traces_scalar_query,
    get_resource_evolution_time,
    index_series_by_label,
    make_query_request,
)
from fixtures.traces import TraceIdGenerator, Traces


def test_traces_resource_evolution(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
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
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    evolution_time = get_resource_evolution_time(signoz, "traces")
    evolution_time = evolution_time.replace(second=0, microsecond=0)

    before_2 = evolution_time - timedelta(minutes=10)
    before_1 = evolution_time - timedelta(minutes=5)
    after_1 = evolution_time + timedelta(minutes=5)
    after_2 = evolution_time + timedelta(minutes=10)

    # Spans with timestamps before the evolution time will have resources written only to resources_string.
    # Spans with timestamps at or after the evolution time will have resources written to both resources_string and resource (JSON).
    insert_traces(
        [
            Traces(
                timestamp=before_2,
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name="span before evolution 2",
                resources={
                    "service.name": "svc-before-2",
                    "deployment.environment": "integration",
                },
                resource_write_mode="legacy_only",
            ),
            Traces(
                timestamp=before_1,
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name="span before evolution 1",
                resources={
                    "service.name": "svc-before-1",
                    "deployment.environment": "integration",
                },
                resource_write_mode="legacy_only",
            ),
            Traces(
                timestamp=after_1,
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name="span after evolution 1",
                resources={
                    "service.name": "svc-after-1",
                    "deployment.environment": "integration",
                },
                resource_write_mode="dual_write",
            ),
            Traces(
                timestamp=after_2,
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name="span after evolution 2",
                resources={
                    "service.name": "svc-after-2",
                    "deployment.environment": "integration",
                },
                resource_write_mode="dual_write",
            ),
        ]
    )

    response = make_query_request(
        signoz,
        token,
        start_ms=int((before_2 - timedelta(minutes=1)).timestamp() * 1000),
        end_ms=int((before_1 + timedelta(minutes=1)).timestamp() * 1000),
        request_type=RequestType.TIME_SERIES,
        queries=[
            build_traces_scalar_query(
                aggregations=[build_aggregation("count()")],
                group_by=[build_group_by_field("service.name")],
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    aggregations = results[0]["aggregations"]
    assert len(aggregations) == 1
    before_series = index_series_by_label(aggregations[0]["series"], "service.name")
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

    response = make_query_request(
        signoz,
        token,
        start_ms=int((after_1 - timedelta(minutes=1)).timestamp() * 1000),
        end_ms=int((after_2 + timedelta(minutes=1)).timestamp() * 1000),
        request_type=RequestType.TIME_SERIES,
        queries=[
            build_traces_scalar_query(
                aggregations=[build_aggregation("count()")],
                group_by=[build_group_by_field("service.name")],
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    aggregations = results[0]["aggregations"]
    assert len(aggregations) == 1
    after_series = index_series_by_label(aggregations[0]["series"], "service.name")
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

    response = make_query_request(
        signoz,
        token,
        start_ms=int(before_2.timestamp() * 1000),
        end_ms=int((after_2 + timedelta(minutes=1)).timestamp() * 1000),
        request_type=RequestType.TIME_SERIES,
        queries=[
            build_traces_scalar_query(
                aggregations=[build_aggregation("count()")],
                group_by=[build_group_by_field("service.name")],
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    aggregations = results[0]["aggregations"]
    assert len(aggregations) == 1
    spanning_series = index_series_by_label(aggregations[0]["series"], "service.name")
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
    response = make_query_request(
        signoz,
        token,
        start_ms=int(before_2.timestamp() * 1000),
        end_ms=int((after_2 + timedelta(minutes=1)).timestamp() * 1000),
        request_type=RequestType.TIME_SERIES,
        queries=[
            build_traces_scalar_query(
                aggregations=[build_aggregation("count_distinct(service.name)")],
                group_by=[build_group_by_field("deployment.environment")],
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    aggregations = results[0]["aggregations"]
    assert len(aggregations) == 1
    aggregation_series = index_series_by_label(aggregations[0]["series"], "deployment.environment")
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
