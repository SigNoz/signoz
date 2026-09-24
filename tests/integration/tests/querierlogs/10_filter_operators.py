from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import get_column_data_from_response, make_query_request

# Filter-operator coverage for logs, modelled on the shapes that dominate real
# dashboard/alert traffic. The logs counterpart of queriertraces/10_filter_operators.py:
# `=` + `AND` + `IN` compound filters, CONTAINS/NOT CONTAINS, LIKE/ILIKE/NOT LIKE,
# REGEXP, `!=` (incl. the `!= ''` non-empty idiom), numeric comparisons, nested OR,
# and EXISTS/NOT EXISTS. Logs-specific: the text operators run against the `body`
# column (full-text) rather than an intrinsic name column, and there is no calculated
# response_status_code, so numeric comparisons use plain number attributes.
#
# Unknown-key rejection is out of scope: logs has no synthesize-on-unknown-key
# fallback (unlike traces), so a bad key is a 400 — already covered by
# queriercommon/04_filter_operators.py::test_logs_filter_key_not_found.


@pytest.mark.parametrize(
    "expression,expected_bodies",
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
        # ── CONTAINS / NOT CONTAINS (full-text over body) ───────────────────────
        pytest.param("body CONTAINS 'handler'", {"checkout-handler", "cart-handler"}, id="contains"),
        pytest.param("body NOT CONTAINS 'handler'", {"payment-processor", "search-service", "notify-worker"}, id="not_contains"),
        # ── LIKE / ILIKE / NOT LIKE ─────────────────────────────────────────────
        pytest.param("body LIKE '%processor'", {"payment-processor"}, id="like"),
        pytest.param("body ILIKE '%HANDLER'", {"checkout-handler", "cart-handler"}, id="ilike"),
        pytest.param("body NOT LIKE '%handler'", {"payment-processor", "search-service", "notify-worker"}, id="not_like"),
        # ── REGEXP / NOT REGEXP ─────────────────────────────────────────────────
        pytest.param("body REGEXP '^cart'", {"cart-handler"}, id="regexp"),
        pytest.param("body NOT REGEXP 'handler'", {"payment-processor", "search-service", "notify-worker"}, id="not_regexp"),
        # ── Numeric comparisons over number attributes ──────────────────────────
        pytest.param("resp_code >= 400", {"cart-handler", "payment-processor"}, id="gte_number_attr"),
        pytest.param("resp_code < 300", {"checkout-handler", "search-service", "notify-worker"}, id="lt_number_attr"),
        pytest.param("latency_ms > 400", {"payment-processor", "notify-worker"}, id="gt_number_attr"),
        pytest.param("latency_ms <= 100", {"checkout-handler", "search-service"}, id="lte_number_attr"),
        # ── EXISTS / NOT EXISTS ─────────────────────────────────────────────────
        pytest.param("error.type exists", {"payment-processor"}, id="exists"),
        pytest.param("error.type not exists", {"checkout-handler", "cart-handler", "search-service", "notify-worker"}, id="not_exists"),
        # ── Exact body equality (logs-specific) ─────────────────────────────────
        pytest.param("body = 'checkout-handler'", {"checkout-handler"}, id="body_equals"),
    ],
)
def test_logs_filter_operators(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    expression: str,
    expected_bodies: set[str],
) -> None:
    """
    Setup:
    Five logs across services / environments / methods, each body naming itself,
    with numeric `resp_code` / `latency_ms` attributes and an `error.type`
    attribute present on one.

    Tests:
    Each production-shaped filter operator selects exactly the expected logs.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    # (body, service, deployment.environment, http.request.method, resp_code, latency_ms, has_error_type)
    specs = [
        ("checkout-handler", "checkout", "prod", "GET", 200, 100, False),
        ("cart-handler", "cart", "prod", "POST", 404, 250, False),
        ("payment-processor", "payment", "staging", "GET", 500, 500, True),
        ("search-service", "search", "prod", "DELETE", 201, 50, False),
        ("notify-worker", "notify", "dev", "GET", 200, 1000, False),
    ]
    logs = []
    for i, (body, service, env, method, resp_code, latency, has_error_type) in enumerate(specs):
        attributes = {"http.request.method": method, "resp_code": resp_code, "latency_ms": latency}
        if has_error_type:
            attributes["error.type"] = "timeout"
        logs.append(
            Logs(
                timestamp=now - timedelta(seconds=i + 1),
                resources={"service.name": service, "deployment.environment": env},
                attributes=attributes,
                body=body,
            )
        )
    insert_logs(logs)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type="raw",
        queries=[
            {
                "type": "builder_query",
                "spec": {
                    "name": "A",
                    "signal": "logs",
                    "disabled": False,
                    "limit": 100,
                    "offset": 0,
                    "filter": {"expression": expression},
                    "order": [
                        {"key": {"name": "timestamp"}, "direction": "desc"},
                        {"key": {"name": "id"}, "direction": "desc"},
                    ],
                    "having": {"expression": ""},
                    "aggregations": [{"expression": "count()"}],
                },
            }
        ],
    )

    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["status"] == "success"
    assert set(get_column_data_from_response(response.json(), "body")) == expected_bodies
