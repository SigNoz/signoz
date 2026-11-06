from collections.abc import Callable
from datetime import UTC, datetime
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.metadata import get_field_keys


@pytest.mark.parametrize(
    "params,present,absent",
    [
        pytest.param({"searchText": "key"}, {"key": "attribute", "attribute.key": "attribute"}, ["severity_text"], id="unprefixed_search_matches_names_containing_it"),
        pytest.param({"searchText": "attribute.key"}, {"key": "attribute", "attribute.key": "attribute"}, ["service.name"], id="attribute_prefix_sets_context"),
        pytest.param({"searchText": "attribute.attribute"}, {"attribute.key": "attribute"}, ["key"], id="double_prefix_searches_prefixed_stored_name"),
        pytest.param({"searchText": "attribute.key", "fieldContext": "attribute"}, {"attribute.key": "attribute"}, ["key"], id="explicit_context_search_not_parsed"),
        pytest.param({"searchText": "resource.service"}, {"service.name": "resource"}, ["resource.service.name"], id="resource_prefix_is_always_context"),
        pytest.param({"searchText": "log.severity"}, {"severity_text": "log"}, ["log.severity_text"], id="log_prefix_searches_log_context_only"),
        pytest.param({"searchText": "span.kind"}, {"span.kind": "attribute"}, ["kind"], id="context_invalid_for_signal_kept_in_search"),
    ],
)
def test_fields_keys_name_resolution(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    params: dict,
    present: dict[str, str],
    absent: list[str],
) -> None:
    """
    Setup:
    Insert a log whose attributes include names that start with a context word: attribute.key next
    to key, log.severity_text next to the severity_text log field, and resource.service.name next to
    the service.name resource.

    Tests:
    1. A context prefix in searchText that is valid for the signal sets the context and is searched
       without it; an explicit fieldContext searches the text as is.
    2. Keys search stays within that context, so prefixed stored names in another context are not listed.
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
                    "span.kind": "attr-kind",
                },
                severity_text="WARN",
            )
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = get_field_keys(signoz, token, {"signal": "logs", **params})

    assert response.status_code == HTTPStatus.OK
    keys = response.json()["data"]["keys"]
    assert {name: [key["fieldContext"] for key in keys.get(name, [])] for name in present} == {name: [context] for name, context in present.items()}
    assert [name for name in absent if name in keys] == []
