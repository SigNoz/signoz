from collections.abc import Callable
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD

GROUPS_PATH = "/api/v1/span_mapper_groups"


def test_create_groups_and_simulate_with_backfill(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """
    Setup:
    Create a mapping group and a mapper through the CRUD API, then hit the
    simulate endpoint with two groups: the saved one referenced by name only
    (server backfills its mappers from the store) and a second, unsaved group
    sent with inline mappers.

    Tests:
    1. Create a group (POST /span_mapper_groups) and read back its id
    2. Create a mapper in that group (POST .../{groupId}/span_mappers)
    3. List groups and mappers and verify what we created is persisted
    4. Simulate spans against both groups: a matching span gets the saved
       group's mappers (backfilled, copy) and the inline group's mappers
       (move) applied, while a span matching no condition passes through
    5. Delete the group and verify it (and its mappers) are gone
    """
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    create_group = requests.post(
        signoz.self.host_configs["8080"].get(GROUPS_PATH),
        timeout=10,
        headers={
            "authorization": f"Bearer {token}",
            "content-type": "application/json",
        },
        json={
            "name": "llm-backfill",
            "condition": {"attributes": ["model"], "resource": []},
            "enabled": True,
        },
    )

    assert create_group.status_code == HTTPStatus.CREATED
    group = create_group.json()["data"]
    groupId = group["id"]
    assert group["name"] == "llm-backfill"
    assert group["enabled"] is True

    create_mapper = requests.post(
        signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{groupId}/span_mappers"),
        timeout=10,
        headers={
            "authorization": f"Bearer {token}",
            "content-type": "application/json",
        },
        json={
            "name": "gen_ai.request.model",
            "fieldContext": "attribute",
            "config": {
                "sources": [
                    {
                        "key": "llm.model",
                        "context": "attribute",
                        "operation": "copy",
                        "priority": 1,
                    }
                ]
            },
            "enabled": True,
        },
    )

    assert create_mapper.status_code == HTTPStatus.CREATED
    mapper = create_mapper.json()["data"]
    assert mapper["name"] == "gen_ai.request.model"
    assert mapper["groupId"] == groupId

    list_groups = requests.get(
        signoz.self.host_configs["8080"].get(GROUPS_PATH),
        timeout=10,
        headers={
            "authorization": f"Bearer {token}",
            "content-type": "application/json",
        },
    )
    assert list_groups.status_code == HTTPStatus.OK
    assert groupId in [g["id"] for g in list_groups.json()["data"]["items"]]

    list_mappers = requests.get(
        signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{groupId}/span_mappers"),
        timeout=10,
        headers={
            "authorization": f"Bearer {token}",
            "content-type": "application/json",
        },
    )
    assert list_mappers.status_code == HTTPStatus.OK
    assert "gen_ai.request.model" in [m["name"] for m in list_mappers.json()["data"]["items"]]

    simulate = requests.post(
        signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/test"),
        timeout=10,
        headers={
            "authorization": f"Bearer {token}",
            "content-type": "application/json",
        },
        json={
            "spans": [
                {
                    "attributes": {"llm.model": "gpt-4", "db.system": "postgres"},
                    "resource": {},
                },
                # Matches no group condition, so it must pass through untouched.
                {
                    "attributes": {"http.method": "GET"},
                    "resource": {},
                },
            ],
            "groups": [
                # No "mappers" key: the server backfills them from the saved group.
                {
                    "name": "llm-backfill",
                    "condition": {"attributes": ["model"], "resource": []},
                    "enabled": True,
                },
                # Unsaved group; mappers provided inline.
                {
                    "name": "db-inline",
                    "condition": {"attributes": ["db"], "resource": []},
                    "enabled": True,
                    "mappers": [
                        {
                            "name": "db.name",
                            "fieldContext": "attribute",
                            "config": {
                                "sources": [
                                    {
                                        "key": "db.system",
                                        "context": "attribute",
                                        "operation": "move",
                                        "priority": 1,
                                    }
                                ]
                            },
                            "enabled": True,
                        }
                    ],
                },
            ],
        },
    )

    assert simulate.status_code == HTTPStatus.OK
    out_spans = simulate.json()["data"]["spans"]
    assert len(out_spans) == 2
    attrs = out_spans[0]["attributes"]
    assert attrs["gen_ai.request.model"] == "gpt-4"  # backfilled mapper applied
    assert attrs["llm.model"] == "gpt-4"  # copy preserves source
    assert attrs["db.name"] == "postgres"  # inline mapper applied
    assert "db.system" not in attrs  # move removes source
    assert out_spans[1]["attributes"] == {"http.method": "GET"}  # unchanged

    delete_group = requests.delete(
        signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{groupId}"),
        timeout=10,
        headers={
            "authorization": f"Bearer {token}",
            "content-type": "application/json",
        },
    )
    assert delete_group.status_code == HTTPStatus.NO_CONTENT

    list_after_delete = requests.get(
        signoz.self.host_configs["8080"].get(GROUPS_PATH),
        timeout=10,
        headers={
            "authorization": f"Bearer {token}",
            "content-type": "application/json",
        },
    )
    assert list_after_delete.status_code == HTTPStatus.OK
    assert groupId not in [g["id"] for g in list_after_delete.json()["data"]["items"]]
