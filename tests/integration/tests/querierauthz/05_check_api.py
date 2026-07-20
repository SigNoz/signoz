from collections.abc import Callable
from http import HTTPStatus

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD, change_user_role, create_active_user
from fixtures.role import transaction_group

user_password = "password123Z$"
keywild_role = "telemetry-check-keywild"
keywild_email = "check-keywild@telemetry.test"


def test_setup(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_role: Callable[..., str],
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    create_role(admin_token, keywild_role, [transaction_group("read", "telemetryresource", "logs", ["builder_query/service.name/*"])])
    user_id = create_active_user(signoz, admin_token, email=keywild_email, role="VIEWER", password=user_password)
    change_user_role(signoz, admin_token, user_id, "signoz-viewer", keywild_role)


@pytest.mark.parametrize(
    ("selector", "authorized"),
    [
        ("builder_query/service.name/service-a", True),  # concrete value resolves up the ladder to the key wildcard grant
        ("builder_query/service.name/*", True),  # exact grant
        ("builder_query/resource.service.name/service-a", True),  # resource.service.name folds to service.name before laddering
        ("promql/service.name/service-a", False),  # grant is scoped to builder_query, promql never reaches it
    ],
)
def test_check_ladders_to_key_wildcard_grant(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    selector: str,
    authorized: bool,
) -> None:
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/authz/check"),
        json=[{"relation": "read", "object": {"resource": {"type": "telemetryresource", "kind": "logs"}, "selector": selector}}],
        headers={"Authorization": f"Bearer {get_token(keywild_email, user_password)}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"][0]["authorized"] is authorized
