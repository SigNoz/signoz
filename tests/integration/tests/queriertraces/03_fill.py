from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import (
    RequestType,
    assert_minutely_bucket_values,
    build_aggregation,
    build_formula_query,
    build_group_by_field,
    build_traces_scalar_query,
    find_named_result,
    get_all_series,
    index_series_by_label,
    make_query_request,
)
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode, trace_noise

# Each fill test runs under two mechanisms that both 0-fill empty time buckets:
#   - "fillGaps": the `fillGaps` format option (fills the query-window timeline)
#   - "fillZero": the `fillZero` function (applied to the query / formula series)
# and under the shared clean/corrupt `trace_noise` factor (fixtures/traces.py): count()
# and group-by(resource.service.name) buckets must be identical whether or not
# same-named colliding attributes are present.
FILL_MODES = ["fillGaps", "fillZero"]


def _bucket_ms(span: Traces) -> int:
    """The minutely bucket (epoch millis) a seeded span lands in."""
    return int(span.timestamp.timestamp() * 1000)


@pytest.mark.parametrize("fill_mode", FILL_MODES)
@pytest.mark.parametrize("noise", ["clean", "corrupt"])
def test_traces_fill_plain(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    noise: str,
    fill_mode: str,
) -> None:
    """
    Setup:
    One span 3 minutes ago.

    Tests:
    fillGaps / fillZero over count() with no group by leave the single populated
    bucket at the span count and every other bucket in the window at 0.
    """
    extra_attrs, extra_resources = trace_noise(noise)
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    span = Traces(
        timestamp=now - timedelta(minutes=3),
        duration=timedelta(seconds=1),
        trace_id=TraceIdGenerator.trace_id(),
        span_id=TraceIdGenerator.span_id(),
        name="test-span",
        kind=TracesKind.SPAN_KIND_SERVER,
        status_code=TracesStatusCode.STATUS_CODE_OK,
        resources={"service.name": "fill-service", **extra_resources},
        attributes={"http.method": "GET", **extra_attrs},
    )
    insert_traces([span])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    functions = [{"name": "fillZero"}] if fill_mode == "fillZero" else None
    format_options = {"formatTableResultForUI": False, "fillGaps": fill_mode == "fillGaps"}

    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type=RequestType.TIME_SERIES,
        queries=[build_traces_scalar_query(aggregations=[build_aggregation("count()")], functions=functions)],
        format_options=format_options,
    )

    assert response.status_code == HTTPStatus.OK, response.text
    series = get_all_series(response.json(), "A")
    assert len(series) >= 1
    assert_minutely_bucket_values(series[0]["values"], now, expected_by_ts={_bucket_ms(span): 1}, context=f"traces/{fill_mode}")


@pytest.mark.parametrize("fill_mode", FILL_MODES)
@pytest.mark.parametrize("noise", ["clean", "corrupt"])
def test_traces_fill_group_by(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    noise: str,
    fill_mode: str,
) -> None:
    """
    Setup:
    service-a span 3 minutes ago, service-b span 2 minutes ago.

    Tests:
    fillGaps / fillZero over count() grouped by service.name yield one series per
    service, each with its single populated bucket and zeros elsewhere.
    """
    extra_attrs, extra_resources = trace_noise(noise)
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    span_a = Traces(
        timestamp=now - timedelta(minutes=3),
        duration=timedelta(seconds=1),
        trace_id=TraceIdGenerator.trace_id(),
        span_id=TraceIdGenerator.span_id(),
        name="span-a",
        kind=TracesKind.SPAN_KIND_SERVER,
        status_code=TracesStatusCode.STATUS_CODE_OK,
        resources={"service.name": "service-a", **extra_resources},
        attributes={"http.method": "GET", **extra_attrs},
    )
    span_b = Traces(
        timestamp=now - timedelta(minutes=2),
        duration=timedelta(seconds=1),
        trace_id=TraceIdGenerator.trace_id(),
        span_id=TraceIdGenerator.span_id(),
        name="span-b",
        kind=TracesKind.SPAN_KIND_SERVER,
        status_code=TracesStatusCode.STATUS_CODE_OK,
        resources={"service.name": "service-b", **extra_resources},
        attributes={"http.method": "POST", **extra_attrs},
    )
    insert_traces([span_a, span_b])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    functions = [{"name": "fillZero"}] if fill_mode == "fillZero" else None
    format_options = {"formatTableResultForUI": False, "fillGaps": fill_mode == "fillGaps"}

    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type=RequestType.TIME_SERIES,
        queries=[
            build_traces_scalar_query(
                aggregations=[build_aggregation("count()")],
                group_by=[build_group_by_field("service.name", "string", "resource")],
                functions=functions,
            )
        ],
        format_options=format_options,
    )

    assert response.status_code == HTTPStatus.OK, response.text
    series = get_all_series(response.json(), "A")
    assert len(series) == 2

    by_service = index_series_by_label(series, "service.name")
    assert set(by_service) == {"service-a", "service-b"}
    assert_minutely_bucket_values(by_service["service-a"]["values"], now, expected_by_ts={_bucket_ms(span_a): 1}, context=f"traces/{fill_mode}/service-a")
    assert_minutely_bucket_values(by_service["service-b"]["values"], now, expected_by_ts={_bucket_ms(span_b): 1}, context=f"traces/{fill_mode}/service-b")


@pytest.mark.parametrize("fill_mode", FILL_MODES)
@pytest.mark.parametrize("noise", ["clean", "corrupt"])
def test_traces_fill_formula(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    noise: str,
    fill_mode: str,
) -> None:
    """
    Setup:
    'test' service span 3 minutes ago, 'another-test' service span 2 minutes ago.

    Tests:
    A formula F1 = A + B over two disabled per-service count() queries fills empty
    buckets to 0, so F1 carries a 1 in each service's populated bucket.
    """
    extra_attrs, extra_resources = trace_noise(noise)
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    span_test = Traces(
        timestamp=now - timedelta(minutes=3),
        duration=timedelta(seconds=1),
        trace_id=TraceIdGenerator.trace_id(),
        span_id=TraceIdGenerator.span_id(),
        name="test-span",
        kind=TracesKind.SPAN_KIND_SERVER,
        status_code=TracesStatusCode.STATUS_CODE_OK,
        resources={"service.name": "test", **extra_resources},
        attributes={"http.method": "GET", **extra_attrs},
    )
    span_other = Traces(
        timestamp=now - timedelta(minutes=2),
        duration=timedelta(seconds=1),
        trace_id=TraceIdGenerator.trace_id(),
        span_id=TraceIdGenerator.span_id(),
        name="another-test-span",
        kind=TracesKind.SPAN_KIND_SERVER,
        status_code=TracesStatusCode.STATUS_CODE_OK,
        resources={"service.name": "another-test", **extra_resources},
        attributes={"http.method": "POST", **extra_attrs},
    )
    insert_traces([span_test, span_other])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    functions = [{"name": "fillZero"}] if fill_mode == "fillZero" else None
    format_options = {"formatTableResultForUI": False, "fillGaps": fill_mode == "fillGaps"}

    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type=RequestType.TIME_SERIES,
        queries=[
            build_traces_scalar_query(aggregations=[build_aggregation("count()")], filter_expression="resource.service.name = 'test'", disabled=True),
            build_traces_scalar_query(name="B", aggregations=[build_aggregation("count()")], filter_expression="resource.service.name = 'another-test'", disabled=True),
            build_formula_query("F1", "A + B", functions=functions),
        ],
        format_options=format_options,
    )

    assert response.status_code == HTTPStatus.OK, response.text
    f1 = find_named_result(response.json()["data"]["data"]["results"], "F1")
    assert f1 is not None
    series = f1["aggregations"][0]["series"]
    assert len(series) >= 1
    assert_minutely_bucket_values(series[0]["values"], now, expected_by_ts={_bucket_ms(span_test): 1, _bucket_ms(span_other): 1}, context=f"traces/{fill_mode}/F1")


@pytest.mark.parametrize("fill_mode", FILL_MODES)
@pytest.mark.parametrize("noise", ["clean", "corrupt"])
def test_traces_fill_formula_group_by(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    noise: str,
    fill_mode: str,
) -> None:
    """
    Setup:
    group1 span 3 minutes ago, group2 span 2 minutes ago.

    Tests:
    A formula F1 = A + B over two disabled group-by count() queries yields one
    series per service, each carrying A+B (=2) in its populated bucket and zeros
    elsewhere.
    """
    extra_attrs, extra_resources = trace_noise(noise)
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    span_g1 = Traces(
        timestamp=now - timedelta(minutes=3),
        duration=timedelta(seconds=1),
        trace_id=TraceIdGenerator.trace_id(),
        span_id=TraceIdGenerator.span_id(),
        name="span-group1",
        kind=TracesKind.SPAN_KIND_SERVER,
        status_code=TracesStatusCode.STATUS_CODE_OK,
        resources={"service.name": "group1", **extra_resources},
        attributes={"http.method": "GET", **extra_attrs},
    )
    span_g2 = Traces(
        timestamp=now - timedelta(minutes=2),
        duration=timedelta(seconds=1),
        trace_id=TraceIdGenerator.trace_id(),
        span_id=TraceIdGenerator.span_id(),
        name="span-group2",
        kind=TracesKind.SPAN_KIND_SERVER,
        status_code=TracesStatusCode.STATUS_CODE_OK,
        resources={"service.name": "group2", **extra_resources},
        attributes={"http.method": "POST", **extra_attrs},
    )
    insert_traces([span_g1, span_g2])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    functions = [{"name": "fillZero"}] if fill_mode == "fillZero" else None
    format_options = {"formatTableResultForUI": False, "fillGaps": fill_mode == "fillGaps"}

    group_by = [build_group_by_field("service.name", "string", "resource")]
    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type=RequestType.TIME_SERIES,
        queries=[
            build_traces_scalar_query(aggregations=[build_aggregation("count()")], group_by=group_by, disabled=True),
            build_traces_scalar_query(name="B", aggregations=[build_aggregation("count()")], group_by=group_by, disabled=True),
            build_formula_query("F1", "A + B", functions=functions),
        ],
        format_options=format_options,
    )

    assert response.status_code == HTTPStatus.OK, response.text
    f1 = find_named_result(response.json()["data"]["data"]["results"], "F1")
    assert f1 is not None
    series = f1["aggregations"][0]["series"]
    assert len(series) == 2

    by_service = index_series_by_label(series, "service.name")
    assert set(by_service) == {"group1", "group2"}
    assert_minutely_bucket_values(by_service["group1"]["values"], now, expected_by_ts={_bucket_ms(span_g1): 2}, context=f"traces/{fill_mode}/F1/group1")
    assert_minutely_bucket_values(by_service["group2"]["values"], now, expected_by_ts={_bucket_ms(span_g2): 2}, context=f"traces/{fill_mode}/F1/group2")
