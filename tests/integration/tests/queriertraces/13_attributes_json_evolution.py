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
    """`http.route` is a dotted key, so the `attributes` JSON column nests it under the path
    http.route while the legacy attributes_string map keys it verbatim. Spans before the attribute
    JSON-evolution time write only the map; spans at or after it dual-write the JSON column too. A
    query window resolves the attribute to the map (before), the JSON nested path (after), or a
    map+JSON multiIf (straddling), and must return identical rows across the boundary."""
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
                attributes={"http.route": "/d"},
                attribute_write_mode="legacy_only",
            ),
            Traces(
                timestamp=before_1,
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name="before 1",
                attributes={"http.route": "/c"},
                attribute_write_mode="legacy_only",
            ),
            Traces(
                timestamp=after_1,
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name="after 1",
                attributes={"http.route": "/a", "http.retry.count": 5, "http.cache.hit": True},
                attribute_write_mode="dual_write",
            ),
            Traces(
                timestamp=after_2,
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name="after 2",
                attributes={"http.route": "/b", "http.retry.count": 1, "http.cache.hit": False},
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
                group_by=[build_group_by_field("http.route", field_context="attribute")],
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK
    before_series = index_series_by_label(
        response.json()["data"]["data"]["results"][0]["aggregations"][0]["series"], "http.route"
    )
    assert_grouped_series(
        before_series,
        expected_values_by_group={
            "/d": {int(before_2.timestamp() * 1000): 1},
            "/c": {int(before_1.timestamp() * 1000): 1},
        },
    )

    # after window -> JSON-only resolution (nested path)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((after_1 - timedelta(minutes=1)).timestamp() * 1000),
        end_ms=int((after_2 + timedelta(minutes=1)).timestamp() * 1000),
        request_type=RequestType.TIME_SERIES,
        queries=[
            build_traces_scalar_query(
                aggregations=[build_aggregation("count()")],
                group_by=[build_group_by_field("http.route", field_context="attribute")],
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK
    after_series = index_series_by_label(
        response.json()["data"]["data"]["results"][0]["aggregations"][0]["series"], "http.route"
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
                group_by=[build_group_by_field("http.route", field_context="attribute")],
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK
    spanning_series = index_series_by_label(
        response.json()["data"]["data"]["results"][0]["aggregations"][0]["series"], "http.route"
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
    """In the JSON-only window each dotted attribute reads through the nested path with its native
    cast: string (::String), Int64 (toFloat64(...::Nullable(Float64))), Bool (::Nullable(Bool)),
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
                attributes={"http.route": "/a", "http.retry.count": 5, "http.cache.hit": True},
                attribute_write_mode="dual_write",
            ),
            Traces(
                timestamp=miss,
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name="miss",
                attributes={"http.route": "/b", "http.retry.count": 1, "http.cache.hit": False},
                attribute_write_mode="dual_write",
            ),
        ]
    )

    start_ms = int((hit - timedelta(minutes=1)).timestamp() * 1000)
    end_ms = int((miss + timedelta(minutes=1)).timestamp() * 1000)

    for label, filter_expression, expected in [
        ("string_eq", "http.route = '/a'", {"/a"}),
        ("int_gt", "http.retry.count > 1", {"/a"}),
        ("bool_eq", "http.cache.hit = true", {"/a"}),
        ("exists", "http.cache.hit EXISTS", {"/a", "/b"}),
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
                    group_by=[build_group_by_field("http.route", field_context="attribute")],
                    filter_expression=filter_expression,
                )
            ],
        )
        assert response.status_code == HTTPStatus.OK, label
        series = index_series_by_label(
            response.json()["data"]["data"]["results"][0]["aggregations"][0]["series"], "http.route"
        )
        assert set(series.keys()) == expected, label
