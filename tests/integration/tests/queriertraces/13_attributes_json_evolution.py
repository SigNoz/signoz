from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import (
    RequestType,
    assert_grouped_series,
    build_aggregation,
    build_group_by_field,
    build_traces_scalar_query,
    index_series_by_label,
    make_query_request,
)
from fixtures.traces import TraceIdGenerator, Traces


def test_traces_attributes_json_evolution(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    seed_attribute_evolution: Callable[[str, datetime], None],
) -> None:
    """Spans before the attribute JSON-evolution time write the endpoint attribute only to the
    legacy attributes_string map; spans at or after it dual-write the `attributes` JSON column too.
    A query window resolves the attribute to the map (before), the JSON column (after), or a
    map+JSON multiIf (straddling) — and must return identical rows across the boundary."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    evolution_time = datetime.now(tz=UTC).replace(second=0, microsecond=0) - timedelta(minutes=30)
    seed_attribute_evolution("traces", evolution_time)

    before_2 = evolution_time - timedelta(minutes=10)
    before_1 = evolution_time - timedelta(minutes=5)
    after_1 = evolution_time + timedelta(minutes=5)
    after_2 = evolution_time + timedelta(minutes=10)

    insert_traces(
        [
            Traces(
                timestamp=before_2,
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name="before 2",
                attributes={"endpoint": "/d"},
                attribute_write_mode="legacy_only",
            ),
            Traces(
                timestamp=before_1,
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name="before 1",
                attributes={"endpoint": "/c"},
                attribute_write_mode="legacy_only",
            ),
            Traces(
                timestamp=after_1,
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name="after 1",
                attributes={"endpoint": "/a", "retries": 5, "cache_hit": True},
                attribute_write_mode="dual_write",
            ),
            Traces(
                timestamp=after_2,
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name="after 2",
                attributes={"endpoint": "/b", "retries": 1, "cache_hit": False},
                attribute_write_mode="dual_write",
            ),
        ]
    )

    # before window -> map-only resolution
    response = make_query_request(
        signoz,
        token,
        start_ms=int((before_2 - timedelta(minutes=1)).timestamp() * 1000),
        end_ms=int((before_1 + timedelta(minutes=1)).timestamp() * 1000),
        request_type=RequestType.TIME_SERIES,
        queries=[
            build_traces_scalar_query(
                aggregations=[build_aggregation("count()")],
                group_by=[build_group_by_field("endpoint", field_context="attribute")],
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK
    before_series = index_series_by_label(
        response.json()["data"]["data"]["results"][0]["aggregations"][0]["series"], "endpoint"
    )
    assert_grouped_series(
        before_series,
        expected_values_by_group={
            "/d": {int(before_2.timestamp() * 1000): 1},
            "/c": {int(before_1.timestamp() * 1000): 1},
        },
    )

    # after window -> JSON-only resolution
    response = make_query_request(
        signoz,
        token,
        start_ms=int((after_1 - timedelta(minutes=1)).timestamp() * 1000),
        end_ms=int((after_2 + timedelta(minutes=1)).timestamp() * 1000),
        request_type=RequestType.TIME_SERIES,
        queries=[
            build_traces_scalar_query(
                aggregations=[build_aggregation("count()")],
                group_by=[build_group_by_field("endpoint", field_context="attribute")],
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK
    after_series = index_series_by_label(
        response.json()["data"]["data"]["results"][0]["aggregations"][0]["series"], "endpoint"
    )
    assert_grouped_series(
        after_series,
        expected_values_by_group={
            "/a": {int(after_1.timestamp() * 1000): 1},
            "/b": {int(after_2.timestamp() * 1000): 1},
        },
    )

    # straddling window -> map + JSON multiIf resolution
    response = make_query_request(
        signoz,
        token,
        start_ms=int(before_2.timestamp() * 1000),
        end_ms=int((after_2 + timedelta(minutes=1)).timestamp() * 1000),
        request_type=RequestType.TIME_SERIES,
        queries=[
            build_traces_scalar_query(
                aggregations=[build_aggregation("count()")],
                group_by=[build_group_by_field("endpoint", field_context="attribute")],
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK
    spanning_series = index_series_by_label(
        response.json()["data"]["data"]["results"][0]["aggregations"][0]["series"], "endpoint"
    )
    assert_grouped_series(
        spanning_series,
        expected_values_by_group={
            "/d": {int(before_2.timestamp() * 1000): 1},
            "/c": {int(before_1.timestamp() * 1000): 1},
            "/a": {int(after_1.timestamp() * 1000): 1},
            "/b": {int(after_2.timestamp() * 1000): 1},
        },
    )


def test_traces_attributes_json_typed_filters(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    seed_attribute_evolution: Callable[[str, datetime], None],
) -> None:
    """In the JSON-only window each attribute data type reads through its native cast:
    string (::String), Int64 (toFloat64(...::Nullable(Float64))), Bool (::Nullable(Bool)),
    and existence via the raw path. Filters must select the same rows the Map path would."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    evolution_time = datetime.now(tz=UTC).replace(second=0, microsecond=0) - timedelta(minutes=30)
    seed_attribute_evolution("traces", evolution_time)

    hit = evolution_time + timedelta(minutes=5)
    miss = evolution_time + timedelta(minutes=6)

    insert_traces(
        [
            Traces(
                timestamp=hit,
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name="hit",
                attributes={"endpoint": "/a", "retries": 5, "cache_hit": True},
                attribute_write_mode="dual_write",
            ),
            Traces(
                timestamp=miss,
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name="miss",
                attributes={"endpoint": "/b", "retries": 1, "cache_hit": False},
                attribute_write_mode="dual_write",
            ),
        ]
    )

    start_ms = int((hit - timedelta(minutes=1)).timestamp() * 1000)
    end_ms = int((miss + timedelta(minutes=1)).timestamp() * 1000)

    for label, filter_expression, expected in [
        ("string_eq", "endpoint = '/a'", {"/a"}),
        ("int_gt", "retries > 1", {"/a"}),
        ("bool_eq", "cache_hit = true", {"/a"}),
        ("exists", "cache_hit EXISTS", {"/a", "/b"}),
    ]:
        response = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type=RequestType.TIME_SERIES,
            queries=[
                build_traces_scalar_query(
                    aggregations=[build_aggregation("count()")],
                    group_by=[build_group_by_field("endpoint", field_context="attribute")],
                    filter_expression=filter_expression,
                )
            ],
        )
        assert response.status_code == HTTPStatus.OK, label
        series = index_series_by_label(
            response.json()["data"]["data"]["results"][0]["aggregations"][0]["series"], "endpoint"
        )
        assert set(series.keys()) == expected, label
