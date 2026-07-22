from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from fixtures import querier, types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD, change_user_role, create_active_user
from fixtures.querier import make_query_request
from fixtures.role import transaction_group

user_password = "password123Z$"
chsql_role = "telemetry-scope-chsql"
chsql_email = "scope-chsql@telemetry.test"
key_a_role = "telemetry-qt-key-a"
key_a_email = "qt-key-a@telemetry.test"
viewer_email = "qt-managed-viewer@telemetry.test"

clickhouse_query = [{"type": "clickhouse_sql", "spec": {"name": "A", "query": "SELECT toFloat64(1.5) AS `__result_0`", "disabled": False}}]
promql_query = [{"type": "promql", "spec": {"name": "A", "query": "up", "disabled": False}}]
meter_query = [{"type": "builder_query", "spec": {"name": "A", "signal": "metrics", "source": "meter", "disabled": False, "aggregations": [{"metricName": "signoz_metering", "timeAggregation": "sum", "spaceAggregation": "sum"}]}}]
audit_query = [{"type": "builder_query", "spec": {"name": "A", "signal": "logs", "source": "audit", "disabled": False}}]


def test_setup(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_role: Callable[..., str],
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    create_role(
        admin_token,
        chsql_role,
        [
            transaction_group("read", "telemetryresource", "logs", ["clickhouse_sql/*"]),
            transaction_group("read", "telemetryresource", "traces", ["clickhouse_sql/*"]),
            transaction_group("read", "telemetryresource", "metrics", ["clickhouse_sql/*"]),
            transaction_group("read", "telemetryresource", "meter-metrics", ["clickhouse_sql/*"]),
        ],
    )
    chsql_user = create_active_user(signoz, admin_token, email=chsql_email, role="VIEWER", password=user_password)
    change_user_role(signoz, admin_token, chsql_user, "signoz-viewer", chsql_role)

    create_role(admin_token, key_a_role, [transaction_group("read", "telemetryresource", "traces", ["builder_query/signoz.workspace.key.id/key-a"])])
    key_a_user = create_active_user(signoz, admin_token, email=key_a_email, role="VIEWER", password=user_password)
    change_user_role(signoz, admin_token, key_a_user, "signoz-viewer", key_a_role)

    # A plain managed viewer (signoz-viewer) — for the meter-metrics/audit-logs policy checks.
    create_active_user(signoz, admin_token, email=viewer_email, role="VIEWER", password=user_password)


def test_clickhouse_sql_requires_chsql_grant(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
) -> None:
    now = datetime.now(tz=UTC)
    start, end = int((now - timedelta(hours=1)).timestamp() * 1000), int(now.timestamp() * 1000)

    granted = make_query_request(signoz, get_token(chsql_email, user_password), start, end, clickhouse_query, request_type=querier.RequestType.SCALAR)
    assert granted.status_code == HTTPStatus.OK, granted.text

    scoped = make_query_request(signoz, get_token(key_a_email, user_password), start, end, clickhouse_query, request_type=querier.RequestType.SCALAR)
    assert scoped.status_code == HTTPStatus.FORBIDDEN, scoped.text

    admin = make_query_request(signoz, get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD), start, end, clickhouse_query, request_type=querier.RequestType.SCALAR)
    assert admin.status_code == HTTPStatus.OK, admin.text


def test_promql_requires_promql_grant(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
) -> None:
    now = datetime.now(tz=UTC)
    start, end = int((now - timedelta(hours=1)).timestamp() * 1000), int(now.timestamp() * 1000)

    # Neither the chsql grant nor a builder-key grant covers promql.
    scoped = make_query_request(signoz, get_token(key_a_email, user_password), start, end, promql_query, request_type=querier.RequestType.TIME_SERIES)
    assert scoped.status_code == HTTPStatus.FORBIDDEN, scoped.text

    # Admin holds the wildcard; authz passes (the handler may still 2xx/4xx, never 403).
    admin = make_query_request(signoz, get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD), start, end, promql_query, request_type=querier.RequestType.TIME_SERIES)
    assert admin.status_code != HTTPStatus.FORBIDDEN, admin.text


def test_trace_operator_rides_on_referenced_queries(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
) -> None:
    now = datetime.now(tz=UTC)
    start, end = int((now - timedelta(minutes=10)).timestamp() * 1000), int(now.timestamp() * 1000)
    token = get_token(key_a_email, user_password)

    def operator_queries(b_key: str) -> list[dict]:
        return [
            {"type": "builder_query", "spec": {"name": "A", "signal": "traces", "disabled": True, "filter": {"expression": "signoz.workspace.key.id = 'key-a'"}, "aggregations": [{"expression": "count()"}]}},
            {"type": "builder_query", "spec": {"name": "B", "signal": "traces", "disabled": True, "filter": {"expression": f"signoz.workspace.key.id = '{b_key}'"}, "aggregations": [{"expression": "count()"}]}},
            {"type": "builder_trace_operator", "spec": {"name": "T1", "expression": "A => B", "returnSpansFrom": "A", "disabled": False}},
        ]

    allowed = make_query_request(signoz, token, start, end, operator_queries("key-a"), request_type=querier.RequestType.RAW)
    assert allowed.status_code == HTTPStatus.OK, allowed.text

    denied = make_query_request(signoz, token, start, end, operator_queries("key-b"), request_type=querier.RequestType.RAW)
    assert denied.status_code == HTTPStatus.FORBIDDEN, denied.text


def test_formula_rides_on_referenced_queries(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
) -> None:
    now = datetime.now(tz=UTC)
    start, end = int((now - timedelta(minutes=10)).timestamp() * 1000), int(now.timestamp() * 1000)
    token = get_token(key_a_email, user_password)

    def formula_queries(b_filtered: bool) -> list[dict]:
        b_spec = {"name": "B", "signal": "traces", "disabled": True, "aggregations": [{"expression": "count()"}]}
        if b_filtered:
            b_spec["filter"] = {"expression": "signoz.workspace.key.id = 'key-a'"}
        return [
            {"type": "builder_query", "spec": {"name": "A", "signal": "traces", "disabled": True, "filter": {"expression": "signoz.workspace.key.id = 'key-a'"}, "aggregations": [{"expression": "count()"}]}},
            {"type": "builder_query", "spec": b_spec},
            {"type": "builder_formula", "spec": {"name": "F1", "expression": "A/B", "disabled": False}},
        ]

    allowed = make_query_request(signoz, token, start, end, formula_queries(b_filtered=True), request_type=querier.RequestType.SCALAR)
    assert allowed.status_code == HTTPStatus.OK, allowed.text

    denied = make_query_request(signoz, token, start, end, formula_queries(b_filtered=False), request_type=querier.RequestType.SCALAR)
    assert denied.status_code == HTTPStatus.FORBIDDEN, denied.text


def test_managed_viewer_meter_and_clickhouse_allowed_audit_denied(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
) -> None:
    now = datetime.now(tz=UTC)
    start, end = int((now - timedelta(hours=1)).timestamp() * 1000), int(now.timestamp() * 1000)
    token = get_token(viewer_email, user_password)

    # meter-metrics is dashboard-able usage metrics, granted to viewers (authz passes;
    # the query itself may still 4xx on data, but never 403).
    meter = make_query_request(signoz, token, start, end, meter_query, request_type=querier.RequestType.SCALAR)
    assert meter.status_code != HTTPStatus.FORBIDDEN, meter.text

    # clickhouse_sql omits audit-logs until audit logs ship, so a viewer (logs/traces/
    # metrics/meter-metrics) satisfies its grants.
    clickhouse = make_query_request(signoz, token, start, end, clickhouse_query, request_type=querier.RequestType.SCALAR)
    assert clickhouse.status_code != HTTPStatus.FORBIDDEN, clickhouse.text

    # audit-logs builder queries remain admin-only.
    audit = make_query_request(signoz, token, start, end, audit_query, request_type=querier.RequestType.RAW)
    assert audit.status_code == HTTPStatus.FORBIDDEN, audit.text
