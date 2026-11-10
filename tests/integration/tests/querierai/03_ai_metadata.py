from collections.abc import Callable
from datetime import UTC, datetime
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metadata import AttributesMetadata, get_field_keys, get_field_values
from fixtures.querierai import ai_trace, ai_trace_mixed_spans
from fixtures.traces import Traces

AI_KEYS_PATH = "/api/v1/ai_observability/fields/keys"
AI_VALUES_PATH = "/api/v1/ai_observability/fields/values"

# The filterable per-trace aggregates; the display-only columns (error_count,
# last_activity_time, span_count, input, output) must not be suggested.
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


def test_ai_fields_lists_filterable_aggregates(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = get_field_keys(signoz, token, {}, AI_KEYS_PATH)
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["status"] == "success"

    keys = response.json()["data"]["keys"]
    trace_context_names = {name for name, variants in keys.items() if any(key["fieldContext"] == "trace" for key in variants)}
    assert trace_context_names == AI_TRACE_AGGREGATES, keys


def test_ai_fields_trace_prefix_search(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # `trace.output` in the filter bar parses into the trace context
    response = get_field_keys(signoz, token, {"searchText": "trace.output"}, AI_KEYS_PATH)
    assert response.status_code == HTTPStatus.OK, response.text

    keys = response.json()["data"]["keys"]
    trace_context_names = {name for name, variants in keys.items() if any(key["fieldContext"] == "trace" for key in variants)}
    assert trace_context_names == {"output_tokens"}, keys


def test_ai_fields_bare_prefix_suggests_aggregate_and_attribute(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = get_field_keys(signoz, token, {"searchText": "output_tok"}, AI_KEYS_PATH)
    assert response.status_code == HTTPStatus.OK, response.text

    keys = response.json()["data"]["keys"]
    assert any(key["fieldContext"] == "trace" for key in keys["output_tokens"]), keys
    assert any(key["fieldContext"] == "attribute" for key in keys["gen_ai.usage.output_tokens"]), keys


def test_ai_fields_are_not_served_by_the_generic_endpoint(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = get_field_keys(signoz, token, {"signal": "traces", "searchText": "output_tok"})
    assert response.status_code == HTTPStatus.OK, response.text

    keys = response.json()["data"]["keys"]
    assert "output_tokens" not in keys, keys
    assert "gen_ai.usage.output_tokens" not in keys, keys


def test_ai_field_values_suggests_ingested_attribute_values(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_traces(ai_trace(now=now, service="ai-it-values", user="alice", in_tokens=100, out_tokens=20, cost=0.5, model="gpt-it-values"))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = get_field_values(signoz, token, {"name": "gen_ai.request.model", "searchText": "gpt-it-values"}, AI_VALUES_PATH)
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["status"] == "success"

    values = response.json()["data"]["values"]
    assert values["stringValues"] == ["gpt-it-values"], values


@pytest.mark.parametrize(
    "existing_query,search_text,expected",
    [
        pytest.param(None, "", {"ai-rel-a", "ai-rel-b", "ai-rel-c"}, id="no_query_scopes_to_gen_ai_spans"),
        pytest.param("gen_ai.user.id = 'alice'", "", {"ai-rel-a"}, id="span_filter_narrows_under_the_gate"),
        pytest.param("llm_call_count > 0", "", {"ai-rel-a", "ai-rel-b", "ai-rel-c"}, id="pure_trace_aggregate_filter_is_stripped"),
        pytest.param("llm_call_count > 0 AND gen_ai.user.id = 'alice'", "", {"ai-rel-a"}, id="mixed_filter_keeps_only_the_span_part"),
        pytest.param(
            "llm_call_count > 0 OR gen_ai.user.id = 'alice'",
            "",
            {"ai-rel-a", "ai-rel-b", "ai-rel-c"},
            id="class_mixing_or_drops_the_filter_not_the_request",
        ),
        pytest.param(
            "gen_ai.user.id = ",
            "",
            {"ai-rel-a", "ai-rel-b", "ai-rel-c"},
            id="unparseable_filter_falls_back_to_the_gate",
        ),
        pytest.param(None, "ai-rel-a", {"ai-rel-a"}, id="search_text_narrows_related_values"),
        # http.request.method lives on the root span's metadata row, gen_ai.* on
        # the LLM/tool/agent rows; rows are per span-shape, so the gate AND a
        # cross-span attribute filter can match no single row
        pytest.param("http.request.method = 'POST'", "", set(), id="cross_span_attribute_filter_matches_no_row"),
    ],
)
def test_ai_field_values_related_values(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    insert_attributes_metadata: Callable[[list[AttributesMetadata]], None],
    existing_query: str | None,
    search_text: str,
    expected: set[str],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    # existingQuery key resolution reads the trace keys tables, not
    # attributes_metadata; a mixed trace registers the gate keys (model/tool/
    # agent) plus gen_ai.user.id and http.request.method
    insert_traces(ai_trace_mixed_spans(now=now, service="ai-rel-a", user="alice"))

    # related values are served from attributes_metadata; one row per gate key,
    # the traces row without any gate attribute and the logs row (wrong
    # data_source, gate attribute present) must never surface
    insert_attributes_metadata(
        [
            AttributesMetadata(
                data_source="traces",
                resource_attributes={"service.name": "ai-rel-a"},
                attributes={"gen_ai.request.model": "gpt-rel", "gen_ai.user.id": "alice"},
            ),
            AttributesMetadata(
                data_source="traces",
                resource_attributes={"service.name": "ai-rel-b"},
                attributes={"gen_ai.tool.name": "get_weather", "gen_ai.user.id": "bob"},
            ),
            AttributesMetadata(
                data_source="traces",
                resource_attributes={"service.name": "ai-rel-c"},
                attributes={"gen_ai.agent.name": "chat-agent"},
            ),
            AttributesMetadata(
                data_source="traces",
                resource_attributes={"service.name": "plain-rel"},
                attributes={"http.request.method": "POST"},
            ),
            AttributesMetadata(
                data_source="logs",
                resource_attributes={"service.name": "ai-rel-logs"},
                attributes={"gen_ai.request.model": "gpt-rel"},
            ),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    params = {"name": "service.name", "searchText": search_text}
    if existing_query is not None:
        params["existingQuery"] = existing_query

    response = get_field_values(signoz, token, params, AI_VALUES_PATH)
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["status"] == "success"

    related = response.json()["data"]["values"].get("relatedValues") or []
    assert set(related) == expected, related


def test_ai_field_values_of_computed_aggregate_are_empty(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = get_field_values(signoz, token, {"name": "llm_call_count", "fieldContext": "trace"}, AI_VALUES_PATH)
    assert response.status_code == HTTPStatus.OK, response.text

    values = response.json()["data"]["values"]
    assert values.get("stringValues", []) == [], values
    assert values.get("numberValues", []) == [], values
