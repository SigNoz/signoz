"""
Integration tests for the fields metadata API with type="builder_ai_query".

The metadata store serves two synthetic key sets for AI-enabled orgs (the suite's
conftest boots SigNoz with the enable_ai_observability flag): the gen_ai semconv
span attributes and the per-trace aggregate columns as trace-context keys. Both are
served before any gen_ai data is ingested, so no traces are inserted here — that is
the designed cold-start behavior.
"""

from http import HTTPStatus
from collections.abc import Callable

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
    "last_activity_time",
}


def _get_keys(signoz: types.SigNoz, token: str, params: dict) -> dict:
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/keys"),
        timeout=5,
        headers={"authorization": f"Bearer {token}"},
        params={"signal": "traces", **params},
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["status"] == "success"
    return response.json()["data"]["keys"]


def _trace_context_names(keys: dict) -> set:
    return {name for name, variants in keys.items() if any(k["fieldContext"] == "trace" for k in variants)}


def test_ai_fields_trace_context_lists_only_aggregates(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """fieldContext=trace (the order-by picker request) returns exactly the
    filterable aggregates — the ingested-key scan must not leak into it."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    keys = _get_keys(signoz, token, {"type": "builder_ai_query", "fieldContext": "trace"})
    assert set(keys.keys()) == AI_TRACE_AGGREGATES, keys
    assert _trace_context_names(keys) == AI_TRACE_AGGREGATES


def test_ai_fields_trace_prefix_search(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """Typing `trace.output` in the filter bar parses into the trace context and
    suggests the matching aggregate."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    keys = _get_keys(signoz, token, {"type": "builder_ai_query", "searchText": "trace.output"})
    assert _trace_context_names(keys) == {"output_tokens"}, keys


def test_ai_fields_bare_prefix_suggests_both_classes(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """A bare prefix suggests the aggregate and the gen_ai span attribute side by
    side — both served pre-ingestion for flag-enabled orgs."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    keys = _get_keys(signoz, token, {"type": "builder_ai_query", "searchText": "output_tok"})
    assert "output_tokens" in _trace_context_names(keys), keys
    assert "gen_ai.usage.output_tokens" in keys, keys
    assert any(k["fieldContext"] == "attribute" for k in keys["gen_ai.usage.output_tokens"])


def test_ai_fields_aggregates_require_ai_query_type(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """Without type=builder_ai_query the trace aggregates are not suggested; the gen_ai
    semconv attributes still are (flag-gated, not query-type-gated)."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    keys = _get_keys(signoz, token, {"searchText": "output_tok"})
    assert not _trace_context_names(keys), keys
    assert "gen_ai.usage.output_tokens" in keys, keys
