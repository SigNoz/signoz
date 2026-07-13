from collections.abc import Callable
from http import HTTPStatus

import pytest
import requests
from wiremock.resources.mappings import Mapping

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD, add_license
from fixtures.role import (
    expected_managed_transaction_keys,
    flatten_transaction_groups,
    managed_role_names,
)
from fixtures.types import Operation, SigNoz


def test_managed_roles_create_on_register(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/roles"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"
    data = response.json()["data"]

    assert len(data) == 4
    assert {role["name"] for role in data} == managed_role_names()
    for role in data:
        assert role["type"] == "managed"


def test_custom_role_create_requires_license(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    resp = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/roles"),
        json={"name": "role-no-license", "transactionGroups": []},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.UNAVAILABLE_FOR_LEGAL_REASONS, f"expected 451 without license, got {resp.status_code}: {resp.text}"


def test_apply_license(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    get_token: Callable[[str, str], str],
) -> None:
    add_license(signoz, make_http_mocks, get_token)


@pytest.mark.parametrize("role_name", managed_role_names())
def test_managed_role_transactions_match_expected(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
    role_name: str,
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    role_id = find_role_id(admin_token, role_name)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    role = response.json()["data"]
    assert role["type"] == "managed"

    actual = flatten_transaction_groups(role.get("transactionGroups") or [])
    expected = expected_managed_transaction_keys(role_name)
    assert actual == expected, f"{role_name} transactions mismatch:\n  missing={expected - actual}\n  unexpected={actual - expected}"
