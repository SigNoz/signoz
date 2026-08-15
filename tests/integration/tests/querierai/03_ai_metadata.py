from collections.abc import Callable
from datetime import UTC, datetime
from http import HTTPStatus

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metadata import get_field_keys, get_field_values
from fixtures.querierai import ai_trace
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


def test_ai_field_values_reject_existing_query(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = get_field_values(
        signoz,
        token,
        {"name": "gen_ai.request.model", "existingQuery": "service.name = 'ai-it-values'"},
        AI_VALUES_PATH,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text


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
