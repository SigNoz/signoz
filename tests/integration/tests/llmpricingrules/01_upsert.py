from collections.abc import Callable
from http import HTTPStatus

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.llmpricingrules import (
    delete_all_llm_pricing_rules,
    list_llm_pricing_rules,
    upsert_llm_pricing_rules,
)

SOURCE_A = "11111111-1111-4111-8111-111111111101"
SOURCE_B = "11111111-1111-4111-8111-111111111102"


def zeus_rules(price: float) -> list[dict]:
    return [
        {
            "sourceId": SOURCE_A,
            "modelName": "zeus-a",
            "provider": "OpenAI",
            "modelPattern": ["zeus-a*"],
            "unit": "per_million_tokens",
            "pricing": {"input": price, "output": price * 2},
            "enabled": True,
        },
        {
            "sourceId": SOURCE_B,
            "modelName": "zeus-b",
            "provider": "OpenAI",
            "modelPattern": ["zeus-b*"],
            "unit": "per_million_tokens",
            "pricing": {"input": price, "output": price * 2},
            "enabled": False,
        },
    ]


def test_sync_skips_overridden_rules(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    delete_all_llm_pricing_rules(signoz, token)

    # first sync inserts, keeping the disabled flag
    assert upsert_llm_pricing_rules(signoz, token, zeus_rules(10)).status_code == HTTPStatus.NO_CONTENT
    rules = {r["sourceId"]: r for r in list_llm_pricing_rules(signoz, token)}
    assert set(rules) == {SOURCE_A, SOURCE_B}
    assert rules[SOURCE_B]["enabled"] is False
    assert all(r["isOverride"] is False for r in rules.values())
    rule_a_id = rules[SOURCE_A]["id"]

    # replay updates in place
    assert upsert_llm_pricing_rules(signoz, token, zeus_rules(20)).status_code == HTTPStatus.NO_CONTENT
    rules = {r["sourceId"]: r for r in list_llm_pricing_rules(signoz, token)}
    assert rules[SOURCE_A]["id"] == rule_a_id
    assert rules[SOURCE_A]["pricing"]["input"] == 20
    assert rules[SOURCE_B]["pricing"]["input"] == 20

    # user overrides rule a
    override = {**zeus_rules(99)[0], "id": rule_a_id, "isOverride": True}
    assert upsert_llm_pricing_rules(signoz, token, [override]).status_code == HTTPStatus.NO_CONTENT
    overridden = {r["sourceId"]: r for r in list_llm_pricing_rules(signoz, token)}[SOURCE_A]
    assert overridden["isOverride"] is True
    assert overridden["pricing"]["input"] == 99

    # sync leaves the overridden row alone, updates the other
    assert upsert_llm_pricing_rules(signoz, token, zeus_rules(30)).status_code == HTTPStatus.NO_CONTENT
    rules = {r["sourceId"]: r for r in list_llm_pricing_rules(signoz, token)}
    assert rules[SOURCE_A] == overridden
    assert rules[SOURCE_B]["pricing"]["input"] == 30

    # user hands rule a back, next sync reclaims it
    assert upsert_llm_pricing_rules(signoz, token, [{**override, "isOverride": False}]).status_code == HTTPStatus.NO_CONTENT
    assert upsert_llm_pricing_rules(signoz, token, zeus_rules(40)).status_code == HTTPStatus.NO_CONTENT
    rules = {r["sourceId"]: r for r in list_llm_pricing_rules(signoz, token)}
    assert rules[SOURCE_A]["isOverride"] is False
    assert rules[SOURCE_A]["pricing"]["input"] == 40

    # user-created rule has no source id and survives a sync
    custom = {
        "modelName": "custom",
        "provider": "Anthropic",
        "modelPattern": ["custom*"],
        "unit": "per_million_tokens",
        "pricing": {"input": 1, "output": 2},
        "isOverride": True,
        "enabled": True,
    }
    assert upsert_llm_pricing_rules(signoz, token, [custom]).status_code == HTTPStatus.NO_CONTENT
    created = next(r for r in list_llm_pricing_rules(signoz, token) if r["modelName"] == "custom")
    assert created["isOverride"] is True
    assert created.get("sourceId") is None
    assert upsert_llm_pricing_rules(signoz, token, zeus_rules(50)).status_code == HTTPStatus.NO_CONTENT
    assert next(r for r in list_llm_pricing_rules(signoz, token) if r["modelName"] == "custom") == created

    delete_all_llm_pricing_rules(signoz, token)


def test_bulk_sync(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    delete_all_llm_pricing_rules(signoz, token)

    rules = [
        {
            "sourceId": f"44444444-4444-4444-8444-{i:012d}",
            "modelName": f"bulk-{i}",
            "provider": "OpenAI",
            "modelPattern": [f"bulk-{i}"],
            "unit": "per_million_tokens",
            "pricing": {"input": 1, "output": 2},
            "enabled": True,
        }
        for i in range(300)
    ]
    assert upsert_llm_pricing_rules(signoz, token, rules).status_code == HTTPStatus.NO_CONTENT
    assert len(list_llm_pricing_rules(signoz, token)) == 300

    for rule in rules:
        rule["pricing"] = {"input": 5, "output": 6}
    assert upsert_llm_pricing_rules(signoz, token, rules).status_code == HTTPStatus.NO_CONTENT
    stored = list_llm_pricing_rules(signoz, token)
    assert len(stored) == 300
    assert all(r["pricing"]["input"] == 5 for r in stored)

    delete_all_llm_pricing_rules(signoz, token)
