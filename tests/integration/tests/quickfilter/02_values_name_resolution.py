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
        pytest.param({"name": "resource.service.name"}, ["svc-resource"], True, id="resource_prefix_is_always_context"),
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
    """
    Setup:
    Insert a log whose attributes include names that start with a context word: attribute.key next
    to key, log.severity_text next to the severity_text log field, and resource.service.name next to
    the service.name resource.

    Tests:
    1. A name with a context prefix returns values of the name as written first, then of the name
       with the prefix stripped; resource. is always a context.
    2. An explicit fieldContext takes the name as is.
    3. A :type suffix is stripped, and searchText filters values without being read as a key.
    """
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


def test_fields_values_metric_attribute_context(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    """
    Setup:
    Insert a metric with a service label, stored with attr_type point.

    Tests:
    1. fieldContext=attribute returns the label's values.
    """
    insert_metrics([Metrics(metric_name="fields.requests_total", labels={"service": "svc-metric"}, value=1.0)])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = get_field_values(signoz, token, {"signal": "metrics", "name": "service", "fieldContext": "attribute"})

    assert response.status_code == HTTPStatus.OK
    assert response.json()["data"]["values"]["stringValues"] == ["svc-metric"]
