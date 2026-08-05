"""Fields metadata API with type="builder_ai_query": gen_ai attributes and per-trace
aggregate keys are served pre-ingestion, behind the conftest's AI observability flag."""

from collections.abc import Callable
from http import HTTPStatus

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD

AI_TRACE_AGGREGATES = {
    "llm_call_count",
    "tool_call_count",
    "distinct_tool_count",
    "input_tokens",
    "output_tokens",
    "total_tokens",
    "estimated_total_cost",
    "max_llm_duration_nano",
}


@pytest.fixture(name="get_keys")
def get_keys_fixture(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> Callable[[dict], dict]:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    def get_keys(params: dict) -> dict:
        response = requests.get(
            signoz.self.host_configs["8080"].get("/api/v1/fields/keys"),
            timeout=5,
            headers={"authorization": f"Bearer {token}"},
            params={"signal": "traces", **params},
        )
        assert response.status_code == HTTPStatus.OK, response.text
        assert response.json()["status"] == "success"
        return response.json()["data"]["keys"]

    return get_keys


def trace_context_names(keys: dict) -> set:
    return {name for name, variants in keys.items() if any(k["fieldContext"] == "trace" for k in variants)}


def test_ai_fields_trace_context_lists_only_aggregates(get_keys: Callable[[dict], dict]) -> None:
    """fieldContext=trace (the order-by picker request) returns exactly the
    filterable aggregates — the ingested-key scan must not leak into it."""
    keys = get_keys({"type": "builder_ai_query", "fieldContext": "trace"})
    assert set(keys.keys()) == AI_TRACE_AGGREGATES, keys
    assert trace_context_names(keys) == AI_TRACE_AGGREGATES


def test_ai_fields_trace_prefix_search(get_keys: Callable[[dict], dict]) -> None:
    """`trace.output` in the filter bar parses into the trace context and suggests
    the matching aggregate."""
    keys = get_keys({"type": "builder_ai_query", "searchText": "trace.output"})
    assert trace_context_names(keys) == {"output_tokens"}, keys


def test_ai_fields_bare_prefix_suggests_both_classes(get_keys: Callable[[dict], dict]) -> None:
    """A bare prefix suggests the aggregate and the gen_ai span attribute side by side."""
    keys = get_keys({"type": "builder_ai_query", "searchText": "output_tok"})
    assert "output_tokens" in trace_context_names(keys), keys
    assert "gen_ai.usage.output_tokens" in keys, keys
    assert any(k["fieldContext"] == "attribute" for k in keys["gen_ai.usage.output_tokens"])


def test_ai_fields_aggregates_require_ai_query_type(get_keys: Callable[[dict], dict]) -> None:
    """Without type=builder_ai_query the aggregates are not suggested; the gen_ai
    attributes still are (flag-gated, not query-type-gated)."""
    keys = get_keys({"searchText": "output_tok"})
    assert not trace_context_names(keys), keys
    assert "gen_ai.usage.output_tokens" in keys, keys
