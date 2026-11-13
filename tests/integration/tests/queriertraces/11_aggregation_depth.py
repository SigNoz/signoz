from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import numpy as np
import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import (
    build_aggregation,
    build_group_by_field,
    build_order_by,
    build_traces_scalar_query,
    get_scalar_table_data,
    make_scalar_query_request,
)
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode, trace_noise

# Aggregation depth for traces, beyond 02_aggregation.py: the higher percentiles
# (p25/p95/p99, vs only p50/p90 there), grouping by a non-resource key (an intrinsic
# column and a numeric span attribute, vs only resource.service.name), a multi-key
# group-by cross product, and HAVING on non-count aggregations plus a compound
# predicate. Every test runs under the shared clean/corrupt trace_noise factor, so a
# same-named colliding attribute must not divert grouping or aggregation off the real
# intrinsic column.


@pytest.mark.parametrize("noise", ["clean", "corrupt", "collision"])
def test_traces_aggregate_percentiles(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    noise: str,
) -> None:
    """
    Setup:
    5 spans with durations 1s..5s.

    Tests:
    p25 / p50 / p90 / p95 / p99 over duration_nano match numpy's linear-interpolated
    percentiles (ClickHouse quantile() uses the same interpolation for small inputs).
    Under the "collision" variant a numeric span attribute named duration_nano unions
    with the intrinsic column into a multiIf; the aggregation must still resolve to the
    intrinsic column rather than error with ClickHouse NO_COMMON_TYPE (386) — the
    regression behind the span_percentile 500.
    """
    extra_attrs, extra_resources = trace_noise(noise)
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    durations_s = [1, 2, 3, 4, 5]
    spans = [
        Traces(
            timestamp=now - timedelta(seconds=i + 1),
            duration=timedelta(seconds=dur_s),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            name=f"pctl-{dur_s}",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            resources={"service.name": "pctl-svc", **extra_resources},
            attributes=dict(extra_attrs),
        )
        for i, dur_s in enumerate(durations_s)
    ]
    insert_traces(spans)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    percentiles = [25, 50, 90, 95, 99]
    query = build_traces_scalar_query(
        aggregations=[build_aggregation(f"p{p}(duration_nano)", f"p{p}") for p in percentiles],
    )
    response = make_scalar_query_request(signoz, token, now, [query])

    assert response.status_code == HTTPStatus.OK, response.text
    data = get_scalar_table_data(response.json())
    assert len(data) == 1

    durations_nano = [int(s.duration_nano) for s in spans]
    expected = [float(np.percentile(durations_nano, p)) for p in percentiles]
    assert data[0] == pytest.approx(expected), f"{data[0]} != {expected}"


@pytest.mark.parametrize(
    "group_key,expected",
    [
        pytest.param("name", {"op-a": 2, "op-b": 1}, id="intrinsic_name"),
        pytest.param("endpoint", {"/a": 2, "/b": 1}, id="string_span_attr"),
    ],
)
@pytest.mark.parametrize("noise", ["clean", "corrupt"])
def test_traces_aggregate_group_by_non_resource(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    noise: str,
    group_key: str,
    expected: dict[str, int],
) -> None:
    """
    Setup:
    3 spans: (name op-a, endpoint /a) x2 and (name op-b, endpoint /b) x1.

    Tests:
    Grouping by an intrinsic column (name) or a string span attribute (endpoint) —
    not just a resource key — buckets by the real value; under the corrupt variant a
    same-named colliding attribute must not divert the grouping.
    """
    extra_attrs, extra_resources = trace_noise(noise)
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    specs = [("op-a", "/a"), ("op-a", "/a"), ("op-b", "/b")]
    spans = [
        Traces(
            timestamp=now - timedelta(seconds=i + 1),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            name=name,
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            resources={"service.name": "gb-svc", **extra_resources},
            attributes={"endpoint": endpoint, **extra_attrs},
        )
        for i, (name, endpoint) in enumerate(specs)
    ]
    insert_traces(spans)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    query = build_traces_scalar_query(
        aggregations=[build_aggregation("count()")],
        group_by=[build_group_by_field(group_key, field_data_type="", field_context="")],
        filter_expression="resource.service.name = 'gb-svc'",
    )
    response = make_scalar_query_request(signoz, token, now, [query])

    assert response.status_code == HTTPStatus.OK, response.text
    data = get_scalar_table_data(response.json())
    assert {row[0]: row[-1] for row in data} == expected


@pytest.mark.parametrize("noise", ["clean", "corrupt"])
def test_traces_aggregate_multi_group_by(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    noise: str,
) -> None:
    """
    Setup:
    Spans across (service.name, name) pairs: (svc-1, op-a) x2, (svc-1, op-b) x1,
    (svc-2, op-a) x1.

    Tests:
    Grouping by two keys (a resource key and an intrinsic column) returns one row per
    present pair with the correct per-pair count.
    """
    extra_attrs, extra_resources = trace_noise(noise)
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    pair_counts = {("svc-1", "op-a"): 2, ("svc-1", "op-b"): 1, ("svc-2", "op-a"): 1}
    spans = [
        Traces(
            timestamp=now - timedelta(seconds=i + 1),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            name=name,
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            resources={"service.name": service, **extra_resources},
            attributes=dict(extra_attrs),
        )
        for i, ((service, name), count) in enumerate(pair_counts.items())
        for _ in range(count)
    ]
    insert_traces(spans)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    query = build_traces_scalar_query(
        aggregations=[build_aggregation("count()")],
        group_by=[
            build_group_by_field("service.name", "string", "resource"),
            build_group_by_field("name", field_data_type="", field_context=""),
        ],
    )
    response = make_scalar_query_request(signoz, token, now, [query])

    assert response.status_code == HTTPStatus.OK, response.text
    data = get_scalar_table_data(response.json())
    actual = {(row[0], row[1], row[2]) for row in data}
    expected = {(service, name, count) for (service, name), count in pair_counts.items()}
    assert actual == expected


@pytest.mark.parametrize(
    "having_expression,expected_services",
    [
        pytest.param("sum(duration_nano) > 4000000000", {"svc-b"}, id="sum_gt"),
        pytest.param("count() > 2", {"svc-a"}, id="count_gt"),
        pytest.param("count() >= 1 AND sum(duration_nano) < 4000000000", {"svc-a"}, id="compound_and"),
    ],
)
@pytest.mark.parametrize("noise", ["clean", "corrupt"])
def test_traces_aggregate_having_breadth(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    noise: str,
    having_expression: str,
    expected_services: set[str],
) -> None:
    """
    Setup:
    svc-a: 3 spans of 1s (sum 3s, count 3); svc-b: 1 span of 5s (sum 5s, count 1).

    Tests:
    HAVING on a sum() aggregation, on count(), and a compound count()+sum() predicate
    each keep only the qualifying groups — extending the count()-only HAVING in
    02_aggregation.py.
    """
    extra_attrs, extra_resources = trace_noise(noise)
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    specs = [("svc-a", 1), ("svc-a", 1), ("svc-a", 1), ("svc-b", 5)]
    spans = [
        Traces(
            timestamp=now - timedelta(seconds=i + 1),
            duration=timedelta(seconds=dur_s),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            name=f"{service}-{i}",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            resources={"service.name": service, **extra_resources},
            attributes=dict(extra_attrs),
        )
        for i, (service, dur_s) in enumerate(specs)
    ]
    insert_traces(spans)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    query = build_traces_scalar_query(
        aggregations=[build_aggregation("count()"), build_aggregation("sum(duration_nano)")],
        group_by=[build_group_by_field("service.name", "string", "resource")],
        order=[build_order_by("count()", "desc")],
        having_expression=having_expression,
    )
    response = make_scalar_query_request(signoz, token, now, [query])

    assert response.status_code == HTTPStatus.OK, response.text
    data = get_scalar_table_data(response.json())
    assert {row[0] for row in data} == expected_services


@pytest.mark.parametrize(
    "duration_filter",
    [
        pytest.param("duration_nano > '2s'", id="duration_string"),
        pytest.param("duration_nano > 2000000000", id="raw_nanoseconds"),
    ],
)
def test_traces_duration_nano_qol_filter_with_collision(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    duration_filter: str,
) -> None:
    """
    Setup:
    5 spans (durations 1s..5s) that also carry a same-named `duration_nano` span
    attribute (numeric on some, string on others).

    Tests the duration_nano QoL filter — as a duration string ('2s') and as raw
    nanoseconds — resolves to the intrinsic column despite the collision: it parses the
    duration, filters on the real durations (3 spans exceed 2s), and doesn't error with
    ClickHouse NO_COMMON_TYPE (386). The string attribute is cast; the intrinsic column
    stays a bare comparison.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    durations_s = [1, 2, 3, 4, 5]
    spans = [
        Traces(
            timestamp=now - timedelta(seconds=i + 1),
            duration=timedelta(seconds=dur_s),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            name=f"dur-qol-{dur_s}",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            resources={"service.name": "dur-qol-svc"},
            attributes={"duration_nano": 42.0} if i % 2 == 0 else {"duration_nano": "boom"},
        )
        for i, dur_s in enumerate(durations_s)
    ]
    insert_traces(spans)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    query = build_traces_scalar_query(
        aggregations=[build_aggregation("count()", "cnt")],
        filter_expression=duration_filter,
    )
    response = make_scalar_query_request(signoz, token, now, [query])

    assert response.status_code == HTTPStatus.OK, response.text
    data = get_scalar_table_data(response.json())
    assert len(data) == 1
    # durations 3s/4s/5s exceed 2s -> 3 spans; the collision must not change this.
    assert data[0][0] == 3, f"expected 3 spans with duration > 2s, got {data[0]}"
