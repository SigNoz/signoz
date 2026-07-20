from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD, change_user_role, create_active_user
from fixtures.logs import Logs
from fixtures.querier import build_raw_query, make_query_request
from fixtures.role import transaction_group

user_password = "password123Z$"
spacey_role = "telemetry-scope-spacey"
spacey_email = "scope-spacey@telemetry.test"
# The service name has a space; its canonical selector escapes it to %20.
spacey_service = "check out"


def test_setup(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_role: Callable[..., str],
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    create_role(admin_token, spacey_role, [transaction_group("read", "telemetryresource", "logs", ["builder_query/service.name/check%20out"])])
    user_id = create_active_user(signoz, admin_token, email=spacey_email, role="VIEWER", password=user_password)
    change_user_role(signoz, admin_token, user_id, "signoz-viewer", spacey_role)


def test_escaped_value_parity_allows_matching_service(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    now = datetime.now(tz=UTC)
    insert_logs([Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": spacey_service}, body="spacey-0")])

    response = make_query_request(
        signoz,
        get_token(spacey_email, user_password),
        int((now - timedelta(minutes=10)).timestamp() * 1000),
        int(now.timestamp() * 1000),
        [build_raw_query("A", "logs", limit=50, filter_expression=f"service.name = '{spacey_service}'")],
        request_type="raw",
    )
    assert response.status_code == HTTPStatus.OK, response.text


def test_escaped_value_denies_other_service(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
) -> None:
    now = datetime.now(tz=UTC)
    response = make_query_request(
        signoz,
        get_token(spacey_email, user_password),
        int((now - timedelta(minutes=10)).timestamp() * 1000),
        int(now.timestamp() * 1000),
        [build_raw_query("A", "logs", limit=50, filter_expression="service.name = 'checkout'")],
        request_type="raw",
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, response.text
