from collections.abc import Callable
from datetime import UTC, datetime
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.metadata import AttributesMetadata, get_field_values


@pytest.mark.parametrize(
    "params,expected,complete",
    [
        pytest.param({"name": "key"}, ["rel-plain"], True, id="unprefixed_name_matches_stored_name"),
        pytest.param({"name": "attribute.key"}, ["rel-prefixed", "rel-plain"], True, id="prefixed_name_matches_exact_then_stripped"),
        pytest.param({"name": "attribute.key", "limit": 1}, ["rel-prefixed"], False, id="exact_match_wins_the_limit"),
        pytest.param({"name": "attribute.key", "searchText": "plain"}, ["rel-plain"], True, id="search_text_filters_both_lookups"),
        pytest.param({"name": "attribute.attribute.key"}, ["rel-prefixed"], True, id="double_prefix_reaches_prefixed_stored_name"),
        pytest.param({"name": "resource.region"}, ["rel-region"], True, id="resource_prefix_is_always_context"),
        pytest.param({"name": "key", "fieldContext": "attribute"}, ["rel-plain"], True, id="explicit_context_single_lookup"),
        pytest.param({"name": "attribute.key", "fieldContext": "attribute"}, ["rel-prefixed"], True, id="explicit_context_name_not_parsed"),
    ],
)
def test_related_values_name_resolution(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    insert_attributes_metadata: Callable[[list[AttributesMetadata]], None],
    params: dict,
    expected: list[str],
    complete: bool,
) -> None:
    now = datetime.now(tz=UTC)
    insert_logs([Logs(timestamp=now, resources={"service.name": "svc-registration"}, body="registers service.name")])
    insert_attributes_metadata(
        [
            AttributesMetadata(data_source="logs", resource_attributes={"service.name": "svc-rel"}, attributes={"key": "rel-plain"}, timestamp=now),
            AttributesMetadata(data_source="logs", resource_attributes={"service.name": "svc-rel"}, attributes={"attribute.key": "rel-prefixed"}, timestamp=now),
            AttributesMetadata(
                data_source="logs",
                resource_attributes={"service.name": "svc-rel", "region": "rel-region"},
                attributes={"resource.region": "rel-attr-region"},
                timestamp=now,
            ),
            AttributesMetadata(
                data_source="logs",
                resource_attributes={"service.name": "svc-other"},
                attributes={"key": "other-plain", "attribute.key": "other-prefixed"},
                timestamp=now,
            ),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = get_field_values(signoz, token, {"signal": "logs", "existingQuery": "service.name = 'svc-rel'", **params})

    assert response.status_code == HTTPStatus.OK
    assert response.json()["data"]["values"].get("relatedValues") == expected
    assert response.json()["data"]["complete"] is complete


@pytest.mark.parametrize(
    "name,existing_query,expected",
    [
        pytest.param("no_such_key", "service.name = 'svc-a'", set(), id="unknown_name_returns_no_values"),
        pytest.param("key", "service.name = 'svc-a'", {"rel-a"}, id="known_filter_key_filters"),
        pytest.param("key", "no_such_filter = 'x'", {"rel-a", "rel-b"}, id="unknown_key_equal_drops_filter"),
        pytest.param("key", "service.name = 'svc-a' AND no_such_filter = 'x'", {"rel-a"}, id="unknown_key_equal_dropped_from_and"),
        pytest.param("key", "service.name = 'svc-a' OR no_such_filter = 'x'", {"rel-a", "rel-b"}, id="unknown_key_equal_drops_whole_or"),
        pytest.param("key", "no_such_filter != 'x'", {"rel-a", "rel-b"}, id="unknown_key_not_equal_drops_filter"),
        pytest.param("key", "service.name = 'svc-a' AND no_such_filter != 'x'", {"rel-a"}, id="unknown_key_not_equal_dropped_from_and"),
        pytest.param("key", "service.name = 'svc-a' OR no_such_filter != 'x'", {"rel-a", "rel-b"}, id="unknown_key_not_equal_drops_whole_or"),
        pytest.param("key", "NOT no_such_filter = 'x'", {"rel-a", "rel-b"}, id="not_over_unknown_key_drops_filter"),
        pytest.param("key", "service.name = 'svc-a' AND NOT no_such_filter = 'x'", {"rel-a"}, id="not_over_unknown_key_dropped_from_and"),
        pytest.param("key", "no_such_filter NOT EXISTS", {"rel-a", "rel-b"}, id="unknown_key_not_exists_drops_filter"),
    ],
)
def test_related_values_unknown_keys(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    insert_attributes_metadata: Callable[[list[AttributesMetadata]], None],
    name: str,
    existing_query: str,
    expected: set[str],
) -> None:
    """A term on an unknown key reads as true whatever its operator: it vanishes from an AND and drops the whole OR."""
    now = datetime.now(tz=UTC)
    insert_logs([Logs(timestamp=now, resources={"service.name": "svc-registration"}, body="registers service.name")])
    insert_attributes_metadata(
        [
            AttributesMetadata(data_source="logs", resource_attributes={"service.name": "svc-a"}, attributes={"key": "rel-a"}, timestamp=now),
            AttributesMetadata(data_source="logs", resource_attributes={"service.name": "svc-b"}, attributes={"key": "rel-b"}, timestamp=now),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = get_field_values(signoz, token, {"signal": "logs", "name": name, "existingQuery": existing_query})

    assert response.status_code == HTTPStatus.OK
    assert set(response.json()["data"]["values"].get("relatedValues") or []) == expected
    assert response.json()["data"]["complete"] is True
