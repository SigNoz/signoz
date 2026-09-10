import uuid
from collections.abc import Callable
from http import HTTPStatus

import pytest
import requests

from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.types import Operation, SigNoz

BASE_URL = "/api/v2/rule_views"


@pytest.mark.parametrize(
    ("body", "expected_code", "expected_message"),
    [
        ({"data": {"version": "v1"}}, "rule_view_invalid_input", "name is required"),
        ({"name": "   ", "data": {"version": "v1"}}, "rule_view_invalid_input", "name is required"),
        (
            {"name": "  Storage  ", "data": {"version": "v1"}},
            "rule_view_invalid_input",
            "name must not have leading or trailing whitespace",
        ),
        (
            {"name": "x" * 65, "data": {"version": "v1"}},
            "rule_view_invalid_input",
            "name must be at most 64 characters, got 65",
        ),
        (
            {"name": "wrong-version", "data": {"version": "v2"}},
            "rule_view_invalid_input",
            'version must be "v1", got "v2"',
        ),
        (
            {"name": "missing-version", "data": {}},
            "rule_view_invalid_input",
            'version must be "v1", got ""',
        ),
        (
            {"name": "bad-state", "data": {"version": "v1", "states": ["exploding"]}},
            "rule_list_invalid",
            'invalid state "exploding"',
        ),
        (
            {"name": "bad-sort", "data": {"version": "v1", "sort": "bogus"}},
            "rule_list_invalid",
            "invalid sort",
        ),
        (
            {"name": "bad-order", "data": {"version": "v1", "order": "bogus"}},
            "rule_list_invalid",
            "invalid order",
        ),
        (
            {"name": "long-query", "data": {"version": "v1", "query": "x" * 1025}},
            "rule_list_invalid",
            "query cannot be longer than 1024 characters",
        ),
        (
            {"name": "rejects-unknown", "data": {"version": "v1"}, "unknownfield": "boom"},
            "rule_view_invalid_input",
            "invalid saved view request body",
        ),
    ],
    ids=[
        "missing_name",
        "blank_name",
        "whitespace_name",
        "name_too_long",
        "wrong_schema_version",
        "missing_version",
        "invalid_state",
        "invalid_sort",
        "invalid_order",
        "query_too_long",
        "unknown_field",
    ],
)
def test_create_rejects_invalid_body(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    body: dict,
    expected_code: str,
    expected_message: str,
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json=body,
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json()["error"]["code"] == expected_code
    assert expected_message in response.json()["error"]["message"]


def test_update_rejects_malformed_id(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{BASE_URL}/not-a-uuid"),
        json={"name": "x", "data": {"version": "v1"}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_update_missing_view_returns_not_found(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{BASE_URL}/{uuid.uuid4()}"),
        json={"name": "x", "data": {"version": "v1"}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.NOT_FOUND
    assert response.json()["error"]["code"] == "rule_view_not_found"


def test_delete_rejects_malformed_id(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"{BASE_URL}/not-a-uuid"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_delete_missing_view_returns_not_found(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"{BASE_URL}/{uuid.uuid4()}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.NOT_FOUND
    assert response.json()["error"]["code"] == "rule_view_not_found"


def test_rule_view_lifecycle(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # The DB is reused across runs, so wipe every view first; this test then
    # owns the whole view space and asserts on global counts.
    response = requests.get(
        signoz.self.host_configs["8080"].get(BASE_URL),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    for view in response.json()["data"]["views"]:
        requests.delete(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view['id']}"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={
            "name": "Critical Prod",
            "data": {
                "version": "v1",
                "query": "name CONTAINS 'prod' AND severity = 'critical'",
                "states": ["firing", "pending"],
                "sort": "name",
                "order": "asc",
            },
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    created = response.json()["data"]
    view_id = created["id"]
    assert created["name"] == "Critical Prod"
    assert created["data"]["version"] == "v1"
    assert created["data"]["query"] == "name CONTAINS 'prod' AND severity = 'critical'"
    assert created["data"]["states"] == ["firing", "pending"]

    # Zero sort and order are normalized to the list defaults on save.
    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={"name": "Disabled", "data": {"version": "v1", "states": ["disabled"]}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    disabled = response.json()["data"]
    assert disabled["name"] == "Disabled"
    assert disabled["data"]["states"] == ["disabled"]
    assert disabled["data"]["sort"] == "updated_at"
    assert disabled["data"]["order"] == "desc"

    response = requests.get(
        signoz.self.host_configs["8080"].get(BASE_URL),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    views = response.json()["data"]["views"]
    assert len(views) == 2
    assert {v["name"] for v in views} == {"Critical Prod", "Disabled"}

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
        json={
            "name": "Critical Staging",
            "data": {
                "version": "v1",
                "query": "name CONTAINS 'staging'",
                "states": ["firing"],
                "sort": "created_at",
                "order": "desc",
            },
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    updated = response.json()["data"]
    assert updated["id"] == view_id
    assert updated["name"] == "Critical Staging"
    assert updated["data"]["query"] == "name CONTAINS 'staging'"
    assert updated["data"]["states"] == ["firing"]
    assert updated["data"]["sort"] == "created_at"
    assert updated["data"]["order"] == "desc"

    response = requests.get(
        signoz.self.host_configs["8080"].get(BASE_URL),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    listed = {v["name"]: v for v in response.json()["data"]["views"]}
    assert set(listed) == {"Critical Staging", "Disabled"}
    assert listed["Critical Staging"]["data"]["query"] == "name CONTAINS 'staging'"

    assert (
        requests.delete(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        ).status_code
        == HTTPStatus.NO_CONTENT
    )
    response = requests.get(
        signoz.self.host_configs["8080"].get(BASE_URL),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert {v["name"] for v in response.json()["data"]["views"]} == {"Disabled"}

    assert (
        requests.delete(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        ).status_code
        == HTTPStatus.NOT_FOUND
    )
