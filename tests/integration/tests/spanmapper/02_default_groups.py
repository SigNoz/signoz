from collections.abc import Callable
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD

GROUPS_PATH = "/api/v1/span_mapper_groups"


def test_default_groups_are_seeded_and_shipped_items_are_toggle_only(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """
    Setup:
    A fresh org. The reconciler seeds the shipped mapping groups at startup
    and on org creation, so nothing has to be created here.

    Tests:
    1. The list contains llm, agent and tool as system groups with shipped
       substrings
    2. Shipped mappers and their sources are system-owned and enabled
    3. A shipped name cannot be taken by a user group, and system groups and
       mappers cannot be deleted
    4. A shipped source can be switched off and a user override added; both
       round-trip through PATCH and the simulator honours them
    5. A shipped substring can be switched off and a user one added
    """
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    headers = {"authorization": f"Bearer {token}", "content-type": "application/json"}

    list_groups = requests.get(signoz.self.host_configs["8080"].get(GROUPS_PATH), timeout=10, headers=headers)
    assert list_groups.status_code == HTTPStatus.OK
    groups = {g["name"]: g for g in list_groups.json()["data"]["items"]}
    assert {"llm", "agent", "tool"} <= set(groups)
    for name in ("llm", "agent", "tool"):
        assert groups[name]["origin"] == "system"
        assert groups[name]["version"] >= 1
        assert groups[name]["createdBy"] == "signoz"
    llm = groups["llm"]
    assert llm["condition"]["attributes"] == [{"value": "model", "enabled": True, "origin": "system"}]

    list_mappers = requests.get(signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{llm['id']}/span_mappers"), timeout=10, headers=headers)
    assert list_mappers.status_code == HTTPStatus.OK
    mappers = {m["name"]: m for m in list_mappers.json()["data"]["items"]}
    model = mappers["gen_ai.request.model"]
    assert model["origin"] == "system"
    assert model["enabled"] is True
    assert all(s["origin"] == "system" and s["enabled"] is True for s in model["config"]["sources"])
    assert "llm.model_name" in [s["key"] for s in model["config"]["sources"]]

    reserved = requests.post(
        signoz.self.host_configs["8080"].get(GROUPS_PATH),
        timeout=10,
        headers=headers,
        json={"name": "tool", "condition": {"attributes": [{"value": "tool", "enabled": True}], "resource": []}, "enabled": True},
    )
    assert reserved.status_code == HTTPStatus.BAD_REQUEST
    assert reserved.json()["error"]["code"] == "span_attribute_mapping_group_name_reserved"

    delete_group = requests.delete(signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{llm['id']}"), timeout=10, headers=headers)
    assert delete_group.status_code == HTTPStatus.BAD_REQUEST
    assert delete_group.json()["error"]["code"] == "span_attribute_mapping_group_not_deletable"

    delete_mapper = requests.delete(signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{llm['id']}/span_mappers/{model['id']}"), timeout=10, headers=headers)
    assert delete_mapper.status_code == HTTPStatus.BAD_REQUEST
    assert delete_mapper.json()["error"]["code"] == "span_attribute_mapper_not_deletable"

    # Switch the shipped llm.model_name source off and re-add it as a user move.
    sources = [{**s, "enabled": s["key"] != "llm.model_name"} for s in model["config"]["sources"]] + [{"key": "llm.model_name", "context": "attribute", "operation": "move", "priority": 1, "enabled": True}]
    patch_mapper = requests.patch(
        signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{llm['id']}/span_mappers/{model['id']}"),
        timeout=10,
        headers=headers,
        json={"config": {"sources": sources}},
    )
    assert patch_mapper.status_code == HTTPStatus.NO_CONTENT

    list_mappers = requests.get(signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{llm['id']}/span_mappers"), timeout=10, headers=headers)
    updated = {m["name"]: m for m in list_mappers.json()["data"]["items"]}["gen_ai.request.model"]
    by_origin = {(s["key"], s["origin"]): s for s in updated["config"]["sources"]}
    assert by_origin[("llm.model_name", "system")]["enabled"] is False
    assert by_origin[("llm.model_name", "user")]["operation"] == "move"
    assert len(updated["config"]["sources"]) == len(model["config"]["sources"]) + 1

    # The user override wins: the source is moved, not copied.
    simulate = requests.post(
        signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/test"),
        timeout=10,
        headers=headers,
        json={
            "spans": [{"attributes": {"llm.model_name": "gpt-4o"}, "resource": {}}],
            "groups": [{"name": "llm", "condition": llm["condition"], "enabled": True}],
        },
    )
    assert simulate.status_code == HTTPStatus.OK
    attrs = simulate.json()["data"]["spans"][0]["attributes"]
    assert attrs["gen_ai.request.model"] == "gpt-4o"
    assert "llm.model_name" not in attrs

    # A shipped substring that does not exist is rejected; toggling one is not.
    bad_condition = requests.patch(
        signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{llm['id']}"),
        timeout=10,
        headers=headers,
        json={"condition": {"attributes": [{"value": "nope", "enabled": True, "origin": "system"}], "resource": []}},
    )
    assert bad_condition.status_code == HTTPStatus.BAD_REQUEST

    patch_group = requests.patch(
        signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{llm['id']}"),
        timeout=10,
        headers=headers,
        json={
            "condition": {
                "attributes": [
                    {"value": "model", "enabled": False, "origin": "system"},
                    {"value": "gen_ai.request.model", "enabled": True},
                ],
                "resource": [],
            }
        },
    )
    assert patch_group.status_code == HTTPStatus.NO_CONTENT

    list_groups = requests.get(signoz.self.host_configs["8080"].get(GROUPS_PATH), timeout=10, headers=headers)
    llm_after = {g["name"]: g for g in list_groups.json()["data"]["items"]}["llm"]
    assert llm_after["condition"]["attributes"] == [
        {"value": "model", "enabled": False, "origin": "system"},
        {"value": "gen_ai.request.model", "enabled": True, "origin": "user"},
    ]
    assert llm_after["origin"] == "system"
    assert llm_after["name"] == "llm"

    # Leave the shipped group as seeded for the other suites.
    restore_group = requests.patch(
        signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{llm['id']}"),
        timeout=10,
        headers=headers,
        json={"condition": {"attributes": [{"value": "model", "enabled": True, "origin": "system"}], "resource": []}},
    )
    assert restore_group.status_code == HTTPStatus.NO_CONTENT
    restore_mapper = requests.patch(
        signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{llm['id']}/span_mappers/{model['id']}"),
        timeout=10,
        headers=headers,
        json={"config": {"sources": model["config"]["sources"]}},
    )
    assert restore_mapper.status_code == HTTPStatus.NO_CONTENT
