from collections.abc import Callable
from datetime import UTC, datetime
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.metadata import get_field_values
from fixtures.metrics import Metrics


@pytest.mark.parametrize(
    "params,expected,complete",
    [
        pytest.param({"name": "key"}, ["attr-plain"], True, id="unprefixed_name_matches_stored_name"),
        pytest.param({"name": "attribute.key"}, ["attr-prefixed", "attr-plain"], True, id="prefixed_name_matches_exact_then_stripped"),
        pytest.param({"name": "attribute.key", "limit": 1}, ["attr-prefixed"], False, id="exact_match_wins_the_limit"),
        pytest.param({"name": "attribute.attribute.key"}, ["attr-prefixed"], True, id="double_prefix_reaches_prefixed_stored_name"),
        pytest.param({"name": "log.severity_text"}, ["attr-severity", "WARN"], True, id="log_prefix_matches_attribute_then_log_field"),
        pytest.param({"name": "resource.service.name"}, ["attr-resource", "svc-resource"], True, id="resource_prefix_matches_exact_then_stripped"),
        pytest.param({"name": "attribute.resource.service.name"}, ["attr-resource"], True, id="only_first_prefix_is_context"),
        pytest.param({"name": "key", "fieldContext": "attribute"}, ["attr-plain"], True, id="explicit_context_single_lookup"),
        pytest.param({"name": "attribute.key", "fieldContext": "attribute"}, ["attr-prefixed"], True, id="explicit_context_name_not_parsed"),
        pytest.param({"name": "service.name:string"}, ["svc-resource"], True, id="type_suffix_without_context"),
        pytest.param({"name": "path", "searchText": "log.arch"}, ["log.archive"], True, id="search_text_not_parsed_as_key"),
        pytest.param({"name": "no_such_key"}, [], True, id="unknown_name_returns_no_values"),
        pytest.param({"name": "attribute.no_such_key"}, [], True, id="unknown_prefixed_name_returns_no_values"),
    ],
)
def test_fields_values_name_resolution(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    params: dict,
    expected: list[str],
    complete: bool,
) -> None:
    """A prefixed name returns values of the name as written first, then with the prefix stripped."""
    insert_logs(
        [
            Logs(
                timestamp=datetime.now(tz=UTC),
                resources={"service.name": "svc-resource"},
                attributes={
                    "key": "attr-plain",
                    "attribute.key": "attr-prefixed",
                    "log.severity_text": "attr-severity",
                    "resource.service.name": "attr-resource",
                    "path": "log.archive",
                },
                severity_text="WARN",
            )
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = get_field_values(signoz, token, {"signal": "logs", **params})

    assert response.status_code == HTTPStatus.OK
    assert response.json()["data"]["values"].get("stringValues", []) == expected
    assert response.json()["data"]["complete"] is complete


@pytest.mark.parametrize(
    "name,logs,string_values,number_values",
    [
        pytest.param("service.name", [{"resources": {"service.name": "r-svc"}}, {"attributes": {"service.name": "a-svc"}}], ["r-svc", "a-svc"], [], id="resource_and_attribute"),
        pytest.param("severity_text", [{"severity_text": "WARN"}, {"severity_text": "WARN", "attributes": {"severity_text": "a-sev"}}], ["WARN", "a-sev"], [], id="log_field_and_attribute"),
        pytest.param("log.level", [{"attributes": {"log.level": "a-loglevel"}}, {"attributes": {"level": "a-level"}}], ["a-loglevel"], [], id="prefixed_attribute_not_bare_attribute"),
        pytest.param("resource.foo", [{"attributes": {"resource.foo": "a-resfoo"}}], ["a-resfoo"], [], id="resource_prefixed_attribute_only"),
        pytest.param("code", [{"attributes": {"code": "a-code"}}, {"attributes": {"code": 42}}], ["a-code"], [42], id="string_and_number_attribute"),
    ],
)
def test_fields_values_every_reading(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    name: str,
    logs: list[dict],
    string_values: list[str],
    number_values: list[float],
) -> None:
    """Values cover every key the name can mean, even ones a filter on the name does not read."""
    now = datetime.now(tz=UTC)
    insert_logs([Logs(timestamp=now, **log) for log in logs])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = get_field_values(signoz, token, {"signal": "logs", "name": name})

    assert response.status_code == HTTPStatus.OK
    values = response.json()["data"]["values"]
    assert values.get("stringValues", []) == string_values
    assert values.get("numberValues", []) == number_values


@pytest.mark.parametrize("name", ["latency", "latency:number", "latency:int64", "latency:float64"])
def test_fields_values_number_search_text(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    name: str,
) -> None:
    now = datetime.now(tz=UTC)
    insert_logs([Logs(timestamp=now, attributes={"latency": 42}), Logs(timestamp=now, attributes={"latency": 7})])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = get_field_values(signoz, token, {"signal": "logs", "name": name, "searchText": "4"})

    assert response.status_code == HTTPStatus.OK
    assert response.json()["data"]["values"].get("numberValues", []) == [42]


@pytest.mark.parametrize(
    "params",
    [
        pytest.param({"name": "service", "fieldContext": "attribute"}, id="attribute_context_matches_point"),
        pytest.param({"name": "service:string"}, id="type_suffix"),
        pytest.param({"name": "attribute.service:string"}, id="context_prefix_and_type_suffix"),
        pytest.param({"name": "service", "fieldDataType": "string"}, id="explicit_data_type"),
    ],
)
def test_fields_values_metric_attribute(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
    params: dict,
) -> None:
    """Metric attributes are stored with attr_type point, and a data type does not filter them out."""
    insert_metrics([Metrics(metric_name="fields.requests_total", labels={"service": "svc-metric"}, value=1.0)])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = get_field_values(signoz, token, {"signal": "metrics", **params})

    assert response.status_code == HTTPStatus.OK
    assert response.json()["data"]["values"]["stringValues"] == ["svc-metric"]
