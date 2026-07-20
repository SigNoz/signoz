from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD, change_user_role, create_active_user
from fixtures.logs import Logs
from fixtures.querier import build_raw_query, get_column_data_from_response, make_query_request
from fixtures.role import transaction_group

user_password = "password123Z$"
any_service_role = "telemetry-scope-any-service"
any_service_email = "scope-any-service@telemetry.test"
builder_all_role = "telemetry-scope-builder-all"
builder_all_email = "scope-builder-all@telemetry.test"


def test_setup(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_role: Callable[..., str],
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    create_role(admin_token, any_service_role, [transaction_group("read", "telemetryresource", "logs", ["builder_query/service.name/*"])])
    any_user = create_active_user(signoz, admin_token, email=any_service_email, role="VIEWER", password=user_password)
    change_user_role(signoz, admin_token, any_user, "signoz-viewer", any_service_role)

    create_role(admin_token, builder_all_role, [transaction_group("read", "telemetryresource", "logs", ["builder_query/*"])])
    all_user = create_active_user(signoz, admin_token, email=builder_all_email, role="VIEWER", password=user_password)
    change_user_role(signoz, admin_token, all_user, "signoz-viewer", builder_all_role)


def test_service_wildcard_allows_any_single_service(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "service-a"}, body="service-a-0"),
            Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "service-b"}, body="service-b-0"),
        ]
    )
    start, end = int((now - timedelta(minutes=10)).timestamp() * 1000), int(now.timestamp() * 1000)
    token = get_token(any_service_email, user_password)

    service_a = make_query_request(signoz, token, start, end, [build_raw_query("A", "logs", limit=50, filter_expression="service.name = 'service-a'")], request_type="raw")
    assert service_a.status_code == HTTPStatus.OK, service_a.text

    service_b = make_query_request(signoz, token, start, end, [build_raw_query("A", "logs", limit=50, filter_expression="service.name = 'service-b'")], request_type="raw")
    assert service_b.status_code == HTTPStatus.OK, service_b.text


def test_service_wildcard_denies_unfiltered(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
) -> None:
    now = datetime.now(tz=UTC)
    response = make_query_request(
        signoz,
        get_token(any_service_email, user_password),
        int((now - timedelta(minutes=10)).timestamp() * 1000),
        int(now.timestamp() * 1000),
        [build_raw_query("A", "logs", limit=50)],
        request_type="raw",
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, response.text


def test_builder_wildcard_allows_unfiltered(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
) -> None:
    now = datetime.now(tz=UTC)
    response = make_query_request(
        signoz,
        get_token(builder_all_email, user_password),
        int((now - timedelta(minutes=10)).timestamp() * 1000),
        int(now.timestamp() * 1000),
        [build_raw_query("A", "logs", limit=50)],
        request_type="raw",
    )
    assert response.status_code == HTTPStatus.OK, response.text


def test_admin_allows_unfiltered_across_services(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "service-a"}, body="service-a-0"),
            Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "service-b"}, body="service-b-0"),
        ]
    )

    response = make_query_request(
        signoz,
        get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD),
        int((now - timedelta(minutes=10)).timestamp() * 1000),
        int(now.timestamp() * 1000),
        [build_raw_query("A", "logs", limit=50)],
        request_type="raw",
    )
    assert response.status_code == HTTPStatus.OK, response.text
    bodies = get_column_data_from_response(response.json(), "body")
    assert any(body.startswith("service-b") for body in bodies), bodies
