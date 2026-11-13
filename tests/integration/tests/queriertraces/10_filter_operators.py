from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import BuilderQuery, OrderBy, RequestType, TelemetryFieldKey, get_rows, make_query_request
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode

# Filter-operator coverage for traces, modelled on the shapes that dominate real
# dashboard/alert traffic (from a masked production sample of ~35k filter
# expressions). By far the most common are `=` + `AND` + `IN` (compound
# multi-clause filters); also common are CONTAINS/NOT CONTAINS, EXISTS/NOT EXISTS,
# LIKE/ILIKE/NOT LIKE, REGEXP, `!=` (incl. the `!= ''` non-empty idiom), numeric
# comparisons, nested OR, and deprecated intrinsic/calculated field names
# (responseStatusCode, ...). has()/hasToken() never appear (logs-body only) and
# BETWEEN is negligible, so neither is exercised here.
#
# No clean/corrupt factor: this file targets operator/parser resolution, which is
# orthogonal to field-collision (covered in 01_list.py / 02_aggregation.py). A
# single-term `response_status_code >= 400` would additionally re-hit the known
# calculated/numeric-attribute collision bug xfail'd in 02_aggregation.py.


@pytest.mark.parametrize(
    "expression,expected_names",
    [
        # ── IN / NOT IN (the #1 production pattern by traffic) ──────────────────
        pytest.param("resource.service.name IN ['checkout', 'cart']", {"checkout-handler", "cart-handler"}, id="in_bracket_list"),
        pytest.param("resource.service.name IN ('checkout', 'cart')", {"checkout-handler", "cart-handler"}, id="in_paren_list"),
        pytest.param("resource.service.name NOT IN ['checkout', 'cart']", {"payment-processor", "search-service", "notify-worker"}, id="not_in"),
        # ── Compound AND + IN, the dominant real-world shape ────────────────────
        pytest.param("resource.deployment.environment = 'prod' AND resource.service.name IN ['checkout', 'search']", {"checkout-handler", "search-service"}, id="and_eq_in"),
        # ── Nested OR within AND ────────────────────────────────────────────────
        pytest.param("resource.deployment.environment = 'prod' AND (resource.service.name = 'cart' OR resource.service.name = 'search')", {"cart-handler", "search-service"}, id="and_nested_or"),
        # ── Inequality, incl. the `!= ''` non-empty idiom ───────────────────────
        pytest.param("http.request.method != 'GET'", {"cart-handler", "search-service"}, id="not_equal"),
        pytest.param("error.type != ''", {"payment-processor"}, id="not_equal_empty"),
        # ── CONTAINS / NOT CONTAINS ─────────────────────────────────────────────
        pytest.param("name CONTAINS 'handler'", {"checkout-handler", "cart-handler"}, id="contains"),
        pytest.param("name NOT CONTAINS 'handler'", {"payment-processor", "search-service", "notify-worker"}, id="not_contains"),
        # ── LIKE / ILIKE / NOT LIKE ─────────────────────────────────────────────
        pytest.param("name LIKE '%processor'", {"payment-processor"}, id="like"),
        pytest.param("name ILIKE '%HANDLER'", {"checkout-handler", "cart-handler"}, id="ilike"),
        pytest.param("name NOT LIKE '%handler'", {"payment-processor", "search-service", "notify-worker"}, id="not_like"),
        # ── REGEXP / NOT REGEXP ─────────────────────────────────────────────────
        pytest.param("name REGEXP '^cart'", {"cart-handler"}, id="regexp"),
        pytest.param("name NOT REGEXP 'handler'", {"payment-processor", "search-service", "notify-worker"}, id="not_regexp"),
        # ── Numeric comparisons (calculated response_status_code + number attr) ─
        pytest.param("response_status_code >= 400", {"cart-handler", "payment-processor"}, id="gte_response_status_code"),
        pytest.param("response_status_code < 300", {"checkout-handler", "search-service", "notify-worker"}, id="lt_response_status_code"),
        pytest.param("latency_ms > 400", {"payment-processor", "notify-worker"}, id="gt_number_attr"),
        pytest.param("latency_ms <= 100", {"checkout-handler", "search-service"}, id="lte_number_attr"),
        # ── EXISTS / NOT EXISTS ─────────────────────────────────────────────────
        pytest.param("error.type exists", {"payment-processor"}, id="exists"),
        pytest.param("error.type not exists", {"checkout-handler", "cart-handler", "search-service", "notify-worker"}, id="not_exists"),
        # ── Deprecated calculated field name (used in real production filters) ───
        pytest.param("responseStatusCode >= 400", {"cart-handler", "payment-processor"}, id="deprecated_responseStatusCode"),
    ],
)
def test_traces_filter_operators(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    expression: str,
    expected_names: set[str],
) -> None:
    """
    Setup:
    Five spans across services / environments / methods / statuses, with a
    numeric `latency_ms` attribute and an `error.type` attribute present on one.

    Tests:
    Each production-shaped filter operator selects exactly the expected spans.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    # (name, service, deployment.environment, http.request.method, http.response.status_code, latency_ms, has_error_type)
    specs = [
        ("checkout-handler", "checkout", "prod", "GET", "200", 100, False),
        ("cart-handler", "cart", "prod", "POST", "404", 250, False),
        ("payment-processor", "payment", "staging", "GET", "500", 500, True),
        ("search-service", "search", "prod", "DELETE", "201", 50, False),
        ("notify-worker", "notify", "dev", "GET", "200", 1000, False),
    ]
    spans = []
    for i, (name, service, env, method, rsc, latency, has_error_type) in enumerate(specs):
        attributes = {"http.request.method": method, "http.response.status_code": rsc, "latency_ms": latency}
        if has_error_type:
            attributes["error.type"] = "timeout"
        spans.append(
            Traces(
                timestamp=now - timedelta(seconds=i + 1),
                duration=timedelta(seconds=1),
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name=name,
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                resources={"service.name": service, "deployment.environment": env},
                attributes=attributes,
            )
        )
    insert_traces(spans)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[
            BuilderQuery(
                signal="traces",
                name="A",
                limit=100,
                filter_expression=expression,
                select_fields=[TelemetryFieldKey("span.name")],
                order=[OrderBy(TelemetryFieldKey("timestamp"), "desc")],
            ).to_dict()
        ],
    )

    assert response.status_code == HTTPStatus.OK, response.text
    assert {row["data"]["name"] for row in get_rows(response)} == expected_names
