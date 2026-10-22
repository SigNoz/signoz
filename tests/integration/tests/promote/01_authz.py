from collections.abc import Callable
from http import HTTPStatus

import requests
from wiremock.resources.mappings import Mapping

from fixtures import types
from fixtures.auth import (
    USER_ADMIN_EMAIL,
    USER_ADMIN_PASSWORD,
    add_license,
    change_user_role,
    create_active_user,
)
from fixtures.role import find_role_by_name, transaction_group

PROMOTED_PATH_BASE = "/api/v1/promoted_paths"

_EDITOR_EMAIL = "editor+promote@integration.test"
_VIEWER_EMAIL = "viewer+promote@integration.test"
_TRACES_ONLY_ROLE_NAME = "promote-traces-only"
_TRACES_ONLY_EMAIL = "customrole+promote@integration.test"
_PASSWORD = "password123Z$"

_TRACES_PATH = {"signal": "traces", "context": "attribute", "path": "authz.probe", "promote": True}
_LOGS_PATH = {"signal": "logs", "context": "body", "path": "authz.probe", "promote": True}


def test_apply_license(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    get_token: Callable[[str, str], str],
) -> None:
    add_license(signoz, make_http_mocks, get_token)


def test_setup_users(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_role: Callable[..., str],
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    create_active_user(signoz, admin_token, email=_EDITOR_EMAIL, role="signoz-editor", password=_PASSWORD, name="promote editor")
    create_active_user(signoz, admin_token, email=_VIEWER_EMAIL, role="signoz-viewer", password=_PASSWORD, name="promote viewer")

    create_role(
        admin_token,
        _TRACES_ONLY_ROLE_NAME,
        [
            transaction_group("update", "metaresource", "traces-field", ["*"]),
            transaction_group("list", "metaresource", "traces-field", ["*"]),
        ],
    )
    user_id = create_active_user(signoz, admin_token, email=_TRACES_ONLY_EMAIL, role="signoz-viewer", password=_PASSWORD, name="promote traces only")
    change_user_role(signoz, admin_token, user_id, "signoz-viewer", _TRACES_ONLY_ROLE_NAME)


def test_managed_roles(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    cases = [
        (USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD, HTTPStatus.CREATED),
        (_EDITOR_EMAIL, _PASSWORD, HTTPStatus.CREATED),
        (_VIEWER_EMAIL, _PASSWORD, HTTPStatus.FORBIDDEN),
    ]
    for email, password, promote_status in cases:
        token = get_token(email, password)

        resp = requests.post(
            signoz.self.host_configs["8080"].get(PROMOTED_PATH_BASE),
            json=[_TRACES_PATH, _LOGS_PATH],
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert resp.status_code == promote_status, f"{email} promote: expected {promote_status}, got {resp.status_code}: {resp.text}"

        resp = requests.get(
            signoz.self.host_configs["8080"].get(PROMOTED_PATH_BASE),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert resp.status_code == HTTPStatus.OK, f"{email} list: {resp.text}"


def test_promote_scoped_to_granted_signal(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(_TRACES_ONLY_EMAIL, _PASSWORD)

    resp = requests.post(
        signoz.self.host_configs["8080"].get(PROMOTED_PATH_BASE),
        json=[_TRACES_PATH],
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.CREATED, f"promote traces: {resp.text}"

    for body in ([_LOGS_PATH], [_TRACES_PATH, _LOGS_PATH]):
        resp = requests.post(
            signoz.self.host_configs["8080"].get(PROMOTED_PATH_BASE),
            json=body,
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert resp.status_code == HTTPStatus.FORBIDDEN, f"promote {body}: expected 403, got {resp.status_code}: {resp.text}"


def test_list_scoped_to_granted_signal(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(_TRACES_ONLY_EMAIL, _PASSWORD)

    resp = requests.get(
        signoz.self.host_configs["8080"].get(PROMOTED_PATH_BASE),
        params={"signal": "traces"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.OK, f"list traces: {resp.text}"
    assert {(path["signal"], path["path"]) for path in resp.json()["data"]} >= {("traces", "authz.probe")}

    for params in ({"signal": "logs"}, {}):
        resp = requests.get(
            signoz.self.host_configs["8080"].get(PROMOTED_PATH_BASE),
            params=params,
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert resp.status_code == HTTPStatus.FORBIDDEN, f"list {params}: expected 403, got {resp.status_code}: {resp.text}"


def test_revoke_update(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    role_id = find_role_by_name(signoz, admin_token, _TRACES_ONLY_ROLE_NAME)

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"),
        json={"description": "", "transactionGroups": [transaction_group("list", "metaresource", "traces-field", ["*"])]},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    token = get_token(_TRACES_ONLY_EMAIL, _PASSWORD)
    resp = requests.post(
        signoz.self.host_configs["8080"].get(PROMOTED_PATH_BASE),
        json=[_TRACES_PATH],
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"promote after revoke: expected 403, got {resp.status_code}: {resp.text}"
