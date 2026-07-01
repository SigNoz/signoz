"""Fixtures and data helpers for role tests: role lookup, request-body builder, grant comparison, and the golden managed-role matrix."""

import json
from collections.abc import Callable
from http import HTTPStatus

import pytest
import requests

from fixtures import types
from fixtures.fs import get_testdata_file_path


@pytest.fixture(name="find_role_id", scope="function")
def find_role_id(signoz: types.SigNoz) -> Callable[[str, str], str]:
    def _find(token: str, name: str) -> str:
        resp = requests.get(
            signoz.self.host_configs["8080"].get("/api/v1/roles"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert resp.status_code == HTTPStatus.OK, resp.text
        return next(r["id"] for r in resp.json()["data"] if r["name"] == name)

    return _find


def transaction_group(relation: str, type_name: str, kind_name: str, selectors: list[str]) -> dict:
    return {"relation": relation, "objectGroup": {"resource": {"type": type_name, "kind": kind_name}, "selectors": selectors}}


def flatten_transaction_groups(groups: list[dict]) -> set[tuple[str, str, str, str]]:
    flat: set[tuple[str, str, str, str]] = set()
    for group in groups or []:
        resource = group["objectGroup"]["resource"]
        for selector in group["objectGroup"]["selectors"]:
            flat.add((group["relation"], resource["type"], resource["kind"], selector))
    return flat


def load_managed_role_grants() -> dict[str, list[dict]]:
    with open(get_testdata_file_path("role/managed_role_grants.json"), encoding="utf-8") as file:
        raw = json.load(file)
    return {name: grants for name, grants in raw.items() if not name.startswith("_")}


def managed_role_names() -> set[str]:
    return set(load_managed_role_grants().keys())


def expected_managed_grant_keys(role_name: str) -> set[tuple[str, str, str, str]]:
    keys: set[tuple[str, str, str, str]] = set()
    for grant in load_managed_role_grants()[role_name]:
        for verb in grant["verbs"]:
            keys.add((verb, grant["type"], grant["kind"], "*"))
    return keys
