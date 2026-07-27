from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus
from typing import Any

import numpy as np
import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import (
    Aggregation,
    BuilderQuery,
    OrderBy,
    RequestType,
    TelemetryFieldKey,
    assert_scalar_result_order,
    build_aggregation,
    build_group_by_field,
    build_order_by,
    build_traces_scalar_query,
    get_all_series,
    get_scalar_table_data,
    index_series_by_label,
    make_query_request,
    make_scalar_query_request,
)
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode, trace_noise

# The clean/corrupt `trace_noise` factor (fixtures/traces.py) is applied per test via
# @pytest.mark.parametrize("noise", …). Aggregating duration_nano, counting on the calculated
# response_status_code and grouping by service.name must all keep resolving to
# the real intrinsic/calculated/resource columns even when same-named colliding
# attributes are present, so the corrupt variant yields identical values.


# ============================================================================
# Order-by referencing an aggregation
# ============================================================================


@pytest.mark.parametrize(
    "order_by,aggregation_alias,expected_status",
    [
        # Case 1: count by count()
        pytest.param({"name": "count()"}, "count_", HTTPStatus.OK, id="count()_alias_count_"),
        pytest.param({"name": "count()"}, "span.count_", HTTPStatus.OK, id="count()_alias_span.count_"),
        # Case 2: count() with context specified in the key
        pytest.param({"name": "count()", "fieldContext": "span"}, "count_", HTTPStatus.OK, id="span-ctx_count()_alias_count_"),
        pytest.param({"name": "count()", "fieldContext": "span"}, "span.count_", HTTPStatus.OK, id="span-ctx_count()_alias_span.count_"),
        # Case 3: span.count() and context specified in the key [BAD REQUEST]
        pytest.param({"name": "span.count()", "fieldContext": "span"}, "count_", HTTPStatus.BAD_REQUEST, id="span.count()_span-ctx_bad"),
        pytest.param({"name": "span.count()", "fieldContext": "span"}, "span.count_", HTTPStatus.BAD_REQUEST, id="span.count()_span-ctx_alias_bad"),
        # Case 4: span.count() with empty context
        pytest.param({"name": "span.count()", "fieldContext": ""}, "count_", HTTPStatus.OK, id="span.count()_no-ctx_alias_count_"),
        pytest.param({"name": "span.count()", "fieldContext": ""}, "span.count_", HTTPStatus.OK, id="span.count()_no-ctx_alias_span.count_"),
        # Case 5: count_ (the alias)
        pytest.param({"name": "count_"}, "count_", HTTPStatus.OK, id="count_alias_bare"),
        # Case 6: span.count_
        pytest.param({"name": "span.count_"}, "count_", HTTPStatus.OK, id="span.count_alias_count_"),
        pytest.param({"name": "span.count_"}, "span.count_", HTTPStatus.OK, id="span.count_alias_span.count_"),
        # Case 7: span.count_ with context specified in the key
        pytest.param({"name": "span.count_", "fieldContext": "span"}, "count_", HTTPStatus.BAD_REQUEST, id="span.count_span-ctx_bad"),
        pytest.param({"name": "span.count_", "fieldContext": "span"}, "span.count_", HTTPStatus.OK, id="span.count_span-ctx_alias_span.count_"),
    ],
)
def test_traces_aggregate_order_by_count(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    order_by: dict[str, str],
    aggregation_alias: str,
    expected_status: HTTPStatus,
) -> None:
    """
    Setup:
    Insert 4 spans of a single service.

    Tests:
    An aggregation can be referenced in `order by` by its expression (count()),
    its `span.`-prefixed expression, or its alias — with or without an explicit
    fieldContext. Only the combinations that double-specify the context are a bad
    request; the rest resolve and return the span count.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    trace_id = TraceIdGenerator.trace_id()
    spans = [
        Traces(
            timestamp=now - timedelta(seconds=i + 1),
            trace_id=trace_id,
            span_id=TraceIdGenerator.span_id(),
            name=f"op-{i}",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            resources={"service.name": "agg-order-service"},
        )
        for i in range(4)
    ]
    insert_traces(spans)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((datetime.now(tz=UTC) - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(datetime.now(tz=UTC).timestamp() * 1000),
        request_type=RequestType.TIME_SERIES,
        queries=[
            BuilderQuery(
                signal="traces",
                name="A",
                order=[OrderBy(TelemetryFieldKey(order_by["name"], field_context=order_by.get("fieldContext")), "desc")],
                aggregations=[Aggregation("count()", aggregation_alias)],
            ).to_dict()
        ],
    )

    assert response.status_code == expected_status, response.text
    if expected_status != HTTPStatus.OK:
        return

    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    series = results[0]["aggregations"][0]["series"]
    assert len(series) == 1
    assert series[0]["values"][0]["value"] == len(spans)


# ============================================================================
# Aggregation function value correctness (scalar, grouped)
# ============================================================================


@pytest.mark.parametrize("noise", ["clean", "corrupt"])
def test_traces_aggregate_functions(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    noise: str,
) -> None:
    """
    Setup:
    svc-a: 3 spans (durations 1s/2s/3s; one ERROR; one 4XX via
    http.response.status_code); svc-b: 1 span (duration 4s). A number attribute
    `latency_ms` rides along on every span.

    Tests:
    A grouped scalar query computes count / sum / avg / min / max / p50 / p90 over
    duration_nano, countIf over the intrinsic status_code and the calculated
    response_status_code, and avg over a numeric attribute — all matching values
    derived from the inserted spans. Under the corrupt variant the same-named
    colliding attributes must not change any of these.
    """
    extra_attrs, extra_resources = trace_noise(noise)
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    def mk(service: str, dur_s: float, status: TracesStatusCode, rsc: str, latency: float) -> Traces:
        return Traces(
            timestamp=now - timedelta(seconds=dur_s),
            duration=timedelta(seconds=dur_s),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=status,
            resources={"service.name": service, **extra_resources},
            name=f"{service}-{dur_s}",
            attributes={"http.response.status_code": rsc, "latency_ms": latency, **extra_attrs},
        )

    spans = [
        mk("svc-a", 1, TracesStatusCode.STATUS_CODE_OK, "200", 10),
        mk("svc-a", 2, TracesStatusCode.STATUS_CODE_ERROR, "503", 20),
        mk("svc-a", 3, TracesStatusCode.STATUS_CODE_OK, "404", 30),
        mk("svc-b", 4, TracesStatusCode.STATUS_CODE_OK, "200", 40),
    ]
    insert_traces(spans)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    aggregations = [
        build_aggregation("count()", "cnt"),
        build_aggregation("sum(duration_nano)", "sum_d"),
        build_aggregation("avg(duration_nano)", "avg_d"),
        build_aggregation("min(duration_nano)", "min_d"),
        build_aggregation("max(duration_nano)", "max_d"),
        build_aggregation("p50(duration_nano)", "p50_d"),
        build_aggregation("p90(duration_nano)", "p90_d"),
        build_aggregation("countIf(status_code = 2)", "errs"),
        build_aggregation("avg(latency_ms)", "avg_lat"),
    ]
    query = build_traces_scalar_query(
        aggregations=aggregations,
        group_by=[build_group_by_field("service.name", "string", "resource")],
        order=[build_order_by("count()", "desc")],
    )
    response = make_scalar_query_request(signoz, token, now, [query])

    assert response.status_code == HTTPStatus.OK, response.text
    data = get_scalar_table_data(response.json())

    def expected(group: list[Traces]) -> tuple:
        durations = [int(s.duration_nano) for s in group]
        latencies = [float(s.attributes_number["latency_ms"]) for s in group]
        return (
            group[0].service_name,
            len(group),  # count()
            sum(durations),  # sum(duration_nano)
            sum(durations) / len(durations),  # avg(duration_nano)
            min(durations),  # min(duration_nano)
            max(durations),  # max(duration_nano)
            float(np.percentile(durations, 50)),  # p50(duration_nano)
            float(np.percentile(durations, 90)),  # p90(duration_nano)
            sum(1 for s in group if int(s.status_code) == 2),  # countIf(status_code = 2)
            sum(latencies) / len(latencies),  # avg(latency_ms)
        )

    # Ordered by count() desc: svc-a (3) then svc-b (1).
    assert_scalar_result_order(
        data,
        [expected(spans[:3]), expected(spans[3:])],
        "traces aggregate functions",
    )


def test_traces_aggregate_calculated_range_countif(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Setup:
    3 spans whose derived response_status_code is 200 / 503 / 404.

    Tests:
    countIf(response_status_code >= 400 AND response_status_code < 500) counts the
    single 4XX span (404).
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    spans = [
        Traces(
            timestamp=now - timedelta(seconds=i + 1),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            name=f"rsc-{rsc}",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            resources={"service.name": "rsc-service"},
            attributes={"http.response.status_code": rsc},
        )
        for i, rsc in enumerate(["200", "503", "404"])
    ]
    insert_traces(spans)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    query = build_traces_scalar_query(
        aggregations=[build_aggregation("countIf(response_status_code >= 400 AND response_status_code < 500)")],
    )
    response = make_scalar_query_request(signoz, token, now, [query])

    assert response.status_code == HTTPStatus.OK, response.text
    data = get_scalar_table_data(response.json())
    expected = sum(1 for s in spans if s.response_status_code.isdigit() and 400 <= int(s.response_status_code) < 500)
    assert data[0][0] == expected


# ============================================================================
# HAVING (post-aggregation filter)
# ============================================================================


@pytest.mark.parametrize("noise", ["clean", "corrupt"])
def test_traces_aggregate_having(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    noise: str,
) -> None:
    """
    Setup:
    svc-a: 3 spans, svc-b: 1 span.

    Tests:
    A grouped scalar query with `having count() > 2` returns only the groups
    whose count qualifies (svc-a), derived from the inserted spans.
    """
    extra_attrs, extra_resources = trace_noise(noise)
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    counts = {"svc-a": 3, "svc-b": 1}
    spans = [
        Traces(
            timestamp=now - timedelta(seconds=i + 1),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            name=f"{service}-{i}",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            resources={"service.name": service, **extra_resources},
            attributes=dict(extra_attrs),
        )
        for service, count in counts.items()
        for i in range(count)
    ]
    insert_traces(spans)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    query = build_traces_scalar_query(
        aggregations=[build_aggregation("count()")],
        group_by=[build_group_by_field("service.name", "string", "resource")],
        order=[build_order_by("count()", "desc")],
        having_expression="count() > 2",
    )
    response = make_scalar_query_request(signoz, token, now, [query])

    assert response.status_code == HTTPStatus.OK, response.text
    data = get_scalar_table_data(response.json())

    expected = [(service, count) for service, count in sorted(counts.items(), key=lambda kv: kv[1], reverse=True) if count > 2]
    assert_scalar_result_order(data, expected, "traces having count() > 2")


# ============================================================================
# Limit (top-N series) — the time_series counterpart of the scalar top-N groups
# already covered in querierscalar/02_traces.py.
# ============================================================================


@pytest.mark.parametrize(
    "limit,direction",
    [
        pytest.param(2, "desc", id="top_2_desc"),
        pytest.param(3, "desc", id="top_3_desc"),
        pytest.param(2, "asc", id="bottom_2_asc"),
        pytest.param(10, "desc", id="limit_exceeds_group_count"),
    ],
)
@pytest.mark.parametrize("noise", ["clean", "corrupt"])
def test_traces_aggregate_time_series_limit(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    noise: str,
    limit: int,
    direction: str,
) -> None:
    """
    Setup:
    Four services with distinct span counts (a=5, b=3, c=7, d=1).

    Tests:
    A time_series group-by with a limit returns only the N series that the
    ordered aggregation keeps — top-N for desc, bottom-N for asc — each series
    summing to that service's span count. Under the corrupt variant the grouping
    (resource.service.name) and count are unaffected by the colliding attributes.
    """
    extra_attrs, extra_resources = trace_noise(noise)
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    counts = {"svc-a": 5, "svc-b": 3, "svc-c": 7, "svc-d": 1}
    spans = [
        Traces(
            timestamp=now - timedelta(seconds=i + 1),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            name=f"{service}-{i}",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            resources={"service.name": service, **extra_resources},
            attributes=dict(extra_attrs),
        )
        for service, count in counts.items()
        for i in range(count)
    ]
    insert_traces(spans)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    query = build_traces_scalar_query(
        aggregations=[build_aggregation("count()")],
        group_by=[build_group_by_field("service.name", "string", "resource")],
        order=[build_order_by("count()", direction)],
        limit=limit,
    )
    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type=RequestType.TIME_SERIES,
        queries=[query],
    )

    assert response.status_code == HTTPStatus.OK, response.text

    ordered = sorted(counts.items(), key=lambda kv: kv[1], reverse=(direction == "desc"))
    expected = dict(ordered[:limit])

    by_service = index_series_by_label(get_all_series(response.json(), "A"), "service.name")
    assert set(by_service) == set(expected)
    for service, series in by_service.items():
        assert sum(point["value"] for point in series["values"]) == expected[service]


# ============================================================================
# Aggregating an unknown key
# ============================================================================


@pytest.mark.parametrize(
    "expression,expected_value",
    [
        pytest.param("count(does_not_exist)", 0, id="count_unknown_is_zero"),
        pytest.param("sum(does_not_exist)", None, id="sum_unknown_is_null"),
        pytest.param("avg(does_not_exist)", None, id="avg_unknown_is_null"),
    ],
)
def test_traces_aggregate_unknown_key(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    expression: str,
    expected_value: Any,
) -> None:
    """
    Setup:
    Insert 3 spans.

    Tests:
    Aggregating a bare unknown key synthesizes a null column: count() of it is 0
    (no non-null values) and sum()/avg() are null — the query never errors.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    spans = [
        Traces(
            timestamp=now - timedelta(seconds=i + 1),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            name=f"unknown-agg-{i}",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            resources={"service.name": "unknown-agg-service"},
        )
        for i in range(3)
    ]
    insert_traces(spans)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    query = build_traces_scalar_query(aggregations=[build_aggregation(expression)])
    response = make_scalar_query_request(signoz, token, now, [query])

    assert response.status_code == HTTPStatus.OK, response.text
    data = get_scalar_table_data(response.json())
    assert len(data) == 1
    if expected_value is None:
        assert data[0][0] is None
    else:
        assert data[0][0] == expected_value
