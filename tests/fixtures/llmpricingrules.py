from http import HTTPStatus

import requests

from fixtures import types

LLM_PRICING_RULES_URL = "/api/v1/llm_pricing_rules"
MAX_LIST_LIMIT = 100


def upsert_llm_pricing_rules(signoz: types.SigNoz, token: str, rules: list[dict]) -> requests.Response:
    return requests.put(
        signoz.self.host_configs["8080"].get(LLM_PRICING_RULES_URL),
        headers={"Authorization": f"Bearer {token}"},
        json={"rules": rules},
        timeout=10,
    )


def list_llm_pricing_rules(signoz: types.SigNoz, token: str) -> list[dict]:
    items: list[dict] = []
    while True:
        response = requests.get(
            signoz.self.host_configs["8080"].get(f"{LLM_PRICING_RULES_URL}?offset={len(items)}&limit={MAX_LIST_LIMIT}"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        page = response.json()["data"]["items"]
        items.extend(page)
        if len(page) < MAX_LIST_LIMIT:
            return items


def delete_all_llm_pricing_rules(signoz: types.SigNoz, token: str) -> None:
    for rule in list_llm_pricing_rules(signoz, token):
        response = requests.delete(
            signoz.self.host_configs["8080"].get(f"{LLM_PRICING_RULES_URL}/{rule['id']}"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.NO_CONTENT, response.text
