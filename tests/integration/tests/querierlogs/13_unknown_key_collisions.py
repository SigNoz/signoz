from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import (
    RequestType,
    build_aggregation,
    build_group_by_field,
    build_raw_query,
    build_scalar_query,
    get_rows,
    get_scalar_table_data,
    make_query_request,
    make_scalar_query_request,
)

# With-metadata vs without-metadata parity for the logs unknown-key (synthesize)
# fallback, focused on the storage-column collision.
#
# Every record carries the SAME value under two attribute names:
#   - known_key   : registered in field-key metadata -> normal resolution path
#   - unknown_key : the metadata rows are stripped after construction, so the querier
#                   can't resolve it and falls back to the synthesized
#                   multiIf(attributes_string -> attributes_number -> attributes_bool)
# The value's Python type varies per record, so across the dataset the shared value
# lives in attributes_string / attributes_number / attributes_bool — but in exactly
# one map per record (a record holds a given key in only one physical place).
#
# Querying known_key vs unknown_key must return identical results: the synthesized
# multiIf has to reproduce exactly what metadata-driven resolution produces, no matter
# which type-map a record's value sits in.
#
# Scope: resources / top-level columns are out of scope for this parity — a bare
# synthesized key resolves the attribute maps (+ body) only, so a resource-qualified
# unknown key filters to 0 (covered in 10_unknown_keys.py), which is intentionally NOT
# equal to the metadata-driven resource path. On a stack without the synthesize change
# the unknown_key half is a 400, so these tests are red until that change lands.

# (body, value) — the value's type decides which attribute map holds it, one per record.
COLLISION_SPECS: list[tuple[str, object]] = [
    ("log-a", "alpha"),  # attributes_string
    ("log-b", "alpha"),  # attributes_string
    ("log-c", "beta"),  # attributes_string
    ("log-d", 42),  # attributes_number
    ("log-e", 42),  # attributes_number
    ("log-f", 7),  # attributes_number
    ("log-g", True),  # attributes_bool
    ("log-h", False),  # attributes_bool
]
SERVICE = "collision-svc"


def test_logs_unknown_key_collision_groupby_parity(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs_with_unknown_keys: Callable[[list[Logs], set[str]], None],
) -> None:
    """
    Setup:
    8 logs sharing a value under known_key (in metadata) and unknown_key (stripped
    from metadata); the value is a string / number / bool depending on the record, so
    the shared value spans attributes_string / attributes_number / attributes_bool.

    Tests:
    Grouping by unknown_key (synthesized multiIf) yields the same buckets and counts
    as grouping by known_key (metadata-driven), across all three attribute maps.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    logs = [
        Logs(
            timestamp=now - timedelta(seconds=i + 1),
            resources={"service.name": SERVICE},
            attributes={"known_key": value, "unknown_key": value},
            body=body,
        )
        for i, (body, value) in enumerate(COLLISION_SPECS)
    ]
    insert_logs_with_unknown_keys(logs, {"unknown_key"})

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    counts: dict[str, dict[str, int]] = {}
    for key in ("known_key", "unknown_key"):
        response = make_scalar_query_request(
            signoz,
            token,
            now,
            [
                build_scalar_query(
                    "A",
                    "logs",
                    [build_aggregation("count()")],
                    group_by=[build_group_by_field(key, field_data_type="", field_context="")],
                    filter_expression=f'service.name = "{SERVICE}"',
                )
            ],
        )
        assert response.status_code == HTTPStatus.OK, f"{key}: {response.text}"
        counts[key] = {row[0]: row[-1] for row in get_scalar_table_data(response.json())}

    assert counts["known_key"] == counts["unknown_key"], f"with-metadata {counts['known_key']} != without-metadata {counts['unknown_key']}"
    # Sanity: the collision actually spanned all three attribute maps (string/number/bool).
    assert counts["known_key"] == {"alpha": 2, "beta": 1, "42": 2, "7": 1, "true": 1, "false": 1}, counts["known_key"]


ALL_BODIES = {body for body, _ in COLLISION_SPECS}


@pytest.mark.parametrize(
    "predicate,expected_bodies",
    [
        pytest.param('{key} = "alpha"', {"log-a", "log-b"}, id="eq_string"),
        pytest.param("{key} = 42", {"log-d", "log-e"}, id="eq_number"),
        pytest.param("{key} = true", {"log-g"}, id="eq_bool"),
        pytest.param("{key} exists", ALL_BODIES, id="exists"),
        pytest.param("{key} IN ['alpha', 42]", {"log-a", "log-b", "log-d", "log-e"}, id="in_mixed"),
    ],
)
def test_logs_unknown_key_collision_filter_parity(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs_with_unknown_keys: Callable[[list[Logs], set[str]], None],
    predicate: str,
    expected_bodies: set[str],
) -> None:
    """
    Setup:
    The same collision dataset as the group-by parity test.

    Tests:
    Filtering unknown_key (synthesized) selects the same records as filtering known_key
    (metadata-driven) across operators: typed equality (the operand type picks the
    matching attribute map), `exists` (fans out across all three maps), and a
    mixed-type `IN` list (string + number operands union their maps).
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    logs = [
        Logs(
            timestamp=now - timedelta(seconds=i + 1),
            resources={"service.name": SERVICE},
            attributes={"known_key": value, "unknown_key": value},
            body=body,
        )
        for i, (body, value) in enumerate(COLLISION_SPECS)
    ]
    insert_logs_with_unknown_keys(logs, {"unknown_key"})

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    bodies: dict[str, set[str]] = {}
    for key in ("known_key", "unknown_key"):
        response = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type=RequestType.RAW,
            queries=[build_raw_query("A", "logs", limit=100, filter_expression=f'service.name = "{SERVICE}" AND ({predicate.format(key=key)})')],
        )
        assert response.status_code == HTTPStatus.OK, f"{key}: {response.text}"
        bodies[key] = {row["data"]["body"] for row in get_rows(response)}

    assert bodies["known_key"] == bodies["unknown_key"], f"with-metadata {bodies['known_key']} != without-metadata {bodies['unknown_key']}"
    # Sanity: metadata-driven resolution selected exactly the expected records.
    assert bodies["known_key"] == expected_bodies, bodies["known_key"]


def test_logs_unknown_key_collision_aggregation_parity(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs_with_unknown_keys: Callable[[list[Logs], set[str]], None],
) -> None:
    """
    Setup:
    The same collision dataset as the group-by parity test.

    Tests:
    Aggregating over unknown_key (synthesized) matches aggregating over known_key
    (metadata-driven): count() sees every record (all 8 carry the key across the three
    attribute maps) and count_distinct() sees the 6 distinct stringified values.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    logs = [
        Logs(
            timestamp=now - timedelta(seconds=i + 1),
            resources={"service.name": SERVICE},
            attributes={"known_key": value, "unknown_key": value},
            body=body,
        )
        for i, (body, value) in enumerate(COLLISION_SPECS)
    ]
    insert_logs_with_unknown_keys(logs, {"unknown_key"})

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    aggregated: dict[str, tuple] = {}
    for key in ("known_key", "unknown_key"):
        response = make_scalar_query_request(
            signoz,
            token,
            now,
            [
                build_scalar_query(
                    "A",
                    "logs",
                    [build_aggregation(f"count({key})", "cnt"), build_aggregation(f"count_distinct({key})", "distinct")],
                    filter_expression=f'service.name = "{SERVICE}"',
                )
            ],
        )
        assert response.status_code == HTTPStatus.OK, f"{key}: {response.text}"
        data = get_scalar_table_data(response.json())
        assert len(data) == 1, f"{key}: expected a single ungrouped row, got {data}"
        aggregated[key] = tuple(data[0])

    assert aggregated["known_key"] == aggregated["unknown_key"], f"with-metadata {aggregated['known_key']} != without-metadata {aggregated['unknown_key']}"
    # Sanity: count() over every record, count_distinct() over the 6 distinct values.
    assert aggregated["known_key"] == (8, 6), aggregated["known_key"]
