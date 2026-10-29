from collections.abc import Callable
from http import HTTPStatus

import pytest
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
from fixtures.llmpricingrules import (
    LLM_PRICING_RULES_URL,
    delete_all_llm_pricing_rules,
    list_llm_pricing_rules,
    upsert_llm_pricing_rules,
)
from fixtures.role import find_role_by_name, transaction_group

user_password = "password123Z$"
editor_email = "llm-pricing-editor@integration.test"
viewer_email = "llm-pricing-viewer@integration.test"
updater_role = "llm-pricing-updater"
updater_email = "llm-pricing-updater@integration.test"
scoped_role = "llm-pricing-scoped"
scoped_email = "llm-pricing-scoped@integration.test"

PROBE_RULE = {
    "modelName": "authz-probe",
    "provider": "OpenAI",
    "modelPattern": ["authz-probe*"],
    "unit": "per_million_tokens",
    "pricing": {"input": 1, "output": 2},
    "isOverride": True,
    "enabled": True,
}

OTHER_RULE = {
    "modelName": "authz-probe-other",
    "provider": "Anthropic",
    "modelPattern": ["authz-probe-other*"],
    "unit": "per_million_tokens",
    "pricing": {"input": 3, "output": 4},
    "isOverride": True,
    "enabled": True,
}


def test_setup(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    get_token: Callable[[str, str], str],
    create_role: Callable[..., str],
) -> None:
    add_license(signoz, make_http_mocks, get_token)

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    delete_all_llm_pricing_rules(signoz, admin_token)
    assert upsert_llm_pricing_rules(signoz, admin_token, [PROBE_RULE, OTHER_RULE]).status_code == HTTPStatus.NO_CONTENT
    probe_id = next(r["id"] for r in list_llm_pricing_rules(signoz, admin_token) if r["modelName"] == PROBE_RULE["modelName"])

    create_active_user(signoz, admin_token, email=editor_email, role="signoz-editor", password=user_password)
    create_active_user(signoz, admin_token, email=viewer_email, role="signoz-viewer", password=user_password)

    create_role(admin_token, updater_role, [transaction_group("update", "metaresource", "llm-pricing-rule", ["*"])])
    updater = create_active_user(signoz, admin_token, email=updater_email, role="signoz-viewer", password=user_password)
    change_user_role(signoz, admin_token, updater, "signoz-viewer", updater_role)

    create_role(
        admin_token,
        scoped_role,
        [
            transaction_group("read", "metaresource", "llm-pricing-rule", [probe_id]),
            transaction_group("update", "metaresource", "llm-pricing-rule", [probe_id]),
            transaction_group("delete", "metaresource", "llm-pricing-rule", [probe_id]),
        ],
    )
    scoped = create_active_user(signoz, admin_token, email=scoped_email, role="signoz-viewer", password=user_password)
    change_user_role(signoz, admin_token, scoped, "signoz-viewer", scoped_role)


@pytest.mark.parametrize(
    "path",
    [LLM_PRICING_RULES_URL, f"{LLM_PRICING_RULES_URL}/unmapped_models"],
    ids=["list", "unmapped_models"],
)
@pytest.mark.parametrize(
    ("email", "expected"),
    [
        (USER_ADMIN_EMAIL, HTTPStatus.OK),
        (editor_email, HTTPStatus.OK),
        (viewer_email, HTTPStatus.OK),
        (updater_email, HTTPStatus.FORBIDDEN),
        (scoped_email, HTTPStatus.FORBIDDEN),
    ],
    ids=["admin", "editor", "viewer", "updater", "scoped"],
)
def test_reads_need_list_grant(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    path: str,
    email: str,
    expected: HTTPStatus,
) -> None:
    token = get_token(email, USER_ADMIN_PASSWORD if email == USER_ADMIN_EMAIL else user_password)

    response = requests.get(
        signoz.self.host_configs["8080"].get(path),
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    assert response.status_code == expected, response.text
    if expected == HTTPStatus.FORBIDDEN:
        assert "llm-pricing-rule:list" in response.text


@pytest.mark.parametrize(
    ("email", "model_name", "expected"),
    [
        (USER_ADMIN_EMAIL, PROBE_RULE["modelName"], HTTPStatus.OK),
        (editor_email, PROBE_RULE["modelName"], HTTPStatus.OK),
        (viewer_email, PROBE_RULE["modelName"], HTTPStatus.OK),
        (updater_email, PROBE_RULE["modelName"], HTTPStatus.FORBIDDEN),
        (scoped_email, PROBE_RULE["modelName"], HTTPStatus.OK),
        (scoped_email, OTHER_RULE["modelName"], HTTPStatus.FORBIDDEN),
    ],
    ids=["admin", "editor", "viewer", "updater", "scoped_granted", "scoped_other"],
)
def test_get_needs_read_grant(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    email: str,
    model_name: str,
    expected: HTTPStatus,
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    rule_id = next(r["id"] for r in list_llm_pricing_rules(signoz, admin_token) if r["modelName"] == model_name)
    token = get_token(email, USER_ADMIN_PASSWORD if email == USER_ADMIN_EMAIL else user_password)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{LLM_PRICING_RULES_URL}/{rule_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    assert response.status_code == expected, response.text
    if expected == HTTPStatus.FORBIDDEN:
        assert "llm-pricing-rule:read" in response.text


@pytest.mark.parametrize(
    ("email", "expected"),
    [
        (editor_email, HTTPStatus.FORBIDDEN),
        (viewer_email, HTTPStatus.FORBIDDEN),
        (scoped_email, HTTPStatus.NO_CONTENT),
        (updater_email, HTTPStatus.NO_CONTENT),
        (USER_ADMIN_EMAIL, HTTPStatus.NO_CONTENT),
    ],
    ids=["editor", "viewer", "scoped", "updater", "admin"],
)
def test_upsert_needs_update_grant(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    email: str,
    expected: HTTPStatus,
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    rule_id = next(r["id"] for r in list_llm_pricing_rules(signoz, admin_token) if r["modelName"] == PROBE_RULE["modelName"])
    token = get_token(email, USER_ADMIN_PASSWORD if email == USER_ADMIN_EMAIL else user_password)

    response = upsert_llm_pricing_rules(signoz, token, [{**PROBE_RULE, "id": rule_id}])
    assert response.status_code == expected, response.text
    if expected == HTTPStatus.FORBIDDEN:
        assert "llm-pricing-rule:update" in response.text


@pytest.mark.parametrize(
    "shape",
    ["other_rule", "create", "sync_row", "own_and_other"],
    ids=["other_rule", "create", "sync_row", "own_and_other"],
)
def test_upsert_scoped_to_granted_rule(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    shape: str,
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    rules = {r["modelName"]: r for r in list_llm_pricing_rules(signoz, admin_token)}
    own = {**PROBE_RULE, "id": rules[PROBE_RULE["modelName"]]["id"]}
    other = {**OTHER_RULE, "id": rules[OTHER_RULE["modelName"]]["id"]}
    sync_row = {**{k: v for k, v in PROBE_RULE.items() if k != "isOverride"}, "sourceId": "11111111-1111-4111-8111-111111111199"}
    bodies = {"other_rule": [other], "create": [PROBE_RULE], "sync_row": [sync_row], "own_and_other": [own, other]}

    response = upsert_llm_pricing_rules(signoz, get_token(scoped_email, user_password), bodies[shape])
    assert response.status_code == HTTPStatus.FORBIDDEN, response.text
    assert "llm-pricing-rule:update" in response.text


def test_revoke_update_grant(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    rule_id = next(r["id"] for r in list_llm_pricing_rules(signoz, admin_token) if r["modelName"] == PROBE_RULE["modelName"])

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{find_role_by_name(signoz, admin_token, scoped_role)}"),
        json={
            "description": "",
            "transactionGroups": [
                transaction_group("read", "metaresource", "llm-pricing-rule", [rule_id]),
                transaction_group("delete", "metaresource", "llm-pricing-rule", [rule_id]),
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = upsert_llm_pricing_rules(signoz, get_token(scoped_email, user_password), [{**PROBE_RULE, "id": rule_id}])
    assert response.status_code == HTTPStatus.FORBIDDEN, response.text
    assert "llm-pricing-rule:update" in response.text


@pytest.mark.parametrize(
    ("email", "model_name", "expected"),
    [
        (editor_email, PROBE_RULE["modelName"], HTTPStatus.FORBIDDEN),
        (viewer_email, PROBE_RULE["modelName"], HTTPStatus.FORBIDDEN),
        (updater_email, PROBE_RULE["modelName"], HTTPStatus.FORBIDDEN),
        (scoped_email, OTHER_RULE["modelName"], HTTPStatus.FORBIDDEN),
        (scoped_email, PROBE_RULE["modelName"], HTTPStatus.NO_CONTENT),
        (USER_ADMIN_EMAIL, OTHER_RULE["modelName"], HTTPStatus.NO_CONTENT),
    ],
    ids=["editor", "viewer", "updater", "scoped_other", "scoped_granted", "admin"],
)
def test_delete_needs_delete_grant(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    email: str,
    model_name: str,
    expected: HTTPStatus,
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    rule_id = next(r["id"] for r in list_llm_pricing_rules(signoz, admin_token) if r["modelName"] == model_name)
    token = get_token(email, USER_ADMIN_PASSWORD if email == USER_ADMIN_EMAIL else user_password)

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"{LLM_PRICING_RULES_URL}/{rule_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    assert response.status_code == expected, response.text
    if expected == HTTPStatus.FORBIDDEN:
        assert "llm-pricing-rule:delete" in response.text


def test_cleanup(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
) -> None:
    delete_all_llm_pricing_rules(signoz, get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD))
