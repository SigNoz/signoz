import random
import string
from collections.abc import Callable
from http import HTTPStatus

import requests
from sqlalchemy import sql
from wiremock.resources.mappings import Mapping

from fixtures import types
from fixtures.auth import (
    USER_ADMIN_EMAIL,
    USER_ADMIN_PASSWORD,
    add_license,
    change_user_role,
    create_active_user,
    find_user_by_email,
)
from fixtures.role import find_role_by_name, transaction_group

# Unique per run: user deletion is a soft delete, so a fixed email or role name
# would collide with this suite's own leftovers on a rerun against a reused env.
# Letters only: role names reject digits.
_RUN_SUFFIX = "".join(random.choices(string.ascii_lowercase, k=8))
_QUICK_FILTER_FGA_CUSTOM_ROLE_NAME = f"quick-filter-fga-scoped-{_RUN_SUFFIX}"
_QUICK_FILTER_FGA_CUSTOM_USER_EMAIL = f"customrole+quickfilterfga{_RUN_SUFFIX}@integration.test"
_QUICK_FILTER_FGA_CUSTOM_USER_PASSWORD = "password123Z$"
# Instance verbs are granted on _GRANTED_SOURCE's row only; _OTHER_SOURCE must stay forbidden.
# exceptions is the granted source because 01_quick_filter.py rewrites it before
# asserting on it, so the update this suite performs never breaks a rerun.
_GRANTED_SOURCE = "exceptions"
_OTHER_SOURCE = "logs"


def test_apply_license(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    get_token: Callable[[str, str], str],
) -> None:
    add_license(signoz, make_http_mocks, get_token)


def test_create_custom_role_scoped_to_source(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_role: Callable[..., str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # The quick filter row ID is not exposed by the API, so grant on the stored row directly.
    with signoz.sqlstore.conn.connect() as conn:
        granted_id = conn.execute(
            sql.text("SELECT id FROM quick_filter WHERE source = :source"),
            {"source": _GRANTED_SOURCE},
        ).scalar()
    assert granted_id is not None

    create_role(
        admin_token,
        _QUICK_FILTER_FGA_CUSTOM_ROLE_NAME,
        [
            transaction_group("read", "metaresource", "quick-filter", [granted_id]),
            transaction_group("update", "metaresource", "quick-filter", [granted_id]),
        ],
    )

    user_id = create_active_user(
        signoz,
        admin_token,
        email=_QUICK_FILTER_FGA_CUSTOM_USER_EMAIL,
        role="signoz-viewer",
        password=_QUICK_FILTER_FGA_CUSTOM_USER_PASSWORD,
        name="quick-filter-fga-test-user",
    )
    change_user_role(signoz, admin_token, user_id, "signoz-viewer", _QUICK_FILTER_FGA_CUSTOM_ROLE_NAME)


def test_read_scoped_to_granted_source(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(_QUICK_FILTER_FGA_CUSTOM_USER_EMAIL, _QUICK_FILTER_FGA_CUSTOM_USER_PASSWORD)

    resp = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/quick_filters/{_GRANTED_SOURCE}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.OK, f"get granted source: {resp.text}"

    resp = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/quick_filters/{_OTHER_SOURCE}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"get other source: expected 403, got {resp.status_code}: {resp.text}"


def test_update_scoped_to_granted_source(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(_QUICK_FILTER_FGA_CUSTOM_USER_EMAIL, _QUICK_FILTER_FGA_CUSTOM_USER_PASSWORD)
    body = {"filters": [{"name": "service.name", "fieldContext": "resource", "fieldDataType": "string"}]}

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v2/quick_filters/{_GRANTED_SOURCE}"),
        json=body,
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, f"update granted source: {resp.text}"

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v2/quick_filters/{_OTHER_SOURCE}"),
        json=body,
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"update other source: expected 403, got {resp.status_code}: {resp.text}"


def test_quick_filter_fga_cleanup(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    user = find_user_by_email(signoz, admin_token, _QUICK_FILTER_FGA_CUSTOM_USER_EMAIL)

    resp = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{user['id']}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, f"delete user: {resp.text}"

    resp = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{find_role_by_name(signoz, admin_token, _QUICK_FILTER_FGA_CUSTOM_ROLE_NAME)}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text
