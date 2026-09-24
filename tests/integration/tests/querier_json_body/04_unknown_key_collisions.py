import json
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.jsontypes import JSONPathType
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

# Unknown-key collision with use_json_body ON. The synthesized fallback for a bare
# unknown key is a multiIf over attributes_string -> attributes_number ->
# attributes_bool -> the body_v2 JSON path. This suite drives the FULL chain: one
# unknown key whose value lives in a different physical place per record — a string /
# number / bool attribute, or the body JSON — and asserts the querier finds and buckets
# every record. It also checks that the with-metadata vs without-metadata parity
# (13_unknown_key_collisions.py, flag off) still holds with the trailing body branch
# present. On a stack without the synthesize change the unknown-key half is a 400.

SERVICE = "json-collision-svc"


def test_json_body_unknown_key_collision_groupby(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs_with_unknown_keys: Callable[[list[Logs], set[str]], None],
) -> None:
    """
    Setup:
    6 logs carrying `field` in different physical places: 2 as a string attribute
    ("sa"), 1 as a number attribute (10), 1 as a bool attribute (True), 2 in the body
    JSON ("bs"). `field` is stripped from attribute metadata, so it is unknown
    everywhere and takes the synthesize path.

    Tests:
    Grouping by the unknown `field` walks the whole multiIf (attribute maps then body)
    and buckets every record by its value, no matter which place holds it.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    logs = [
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": SERVICE}, attributes={"field": "sa"}, body="attr-str-0"),
        Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": SERVICE}, attributes={"field": "sa"}, body="attr-str-1"),
        Logs(timestamp=now - timedelta(seconds=3), resources={"service.name": SERVICE}, attributes={"field": 10}, body="attr-num"),
        Logs(timestamp=now - timedelta(seconds=4), resources={"service.name": SERVICE}, attributes={"field": True}, body="attr-bool"),
        Logs(timestamp=now - timedelta(seconds=5), resources={"service.name": SERVICE}, attributes={"http.method": "GET"}, body=json.dumps({"field": "bs"})),
        Logs(timestamp=now - timedelta(seconds=6), resources={"service.name": SERVICE}, attributes={"http.method": "GET"}, body=json.dumps({"field": "bs"})),
    ]
    insert_logs_with_unknown_keys(logs, {"field"})

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [
            build_scalar_query(
                "A",
                "logs",
                [build_aggregation("count()")],
                group_by=[build_group_by_field("field", field_data_type="", field_context="")],
                filter_expression=f'service.name = "{SERVICE}"',
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text

    counts = {row[0]: row[-1] for row in get_scalar_table_data(response.json())}
    assert counts == {"sa": 2, "10": 1, "true": 1, "bs": 2}, counts


@pytest.mark.parametrize(
    "predicate,expected_rids",
    [
        pytest.param('field = "sa"', {"r0", "r1"}, id="string_attr"),
        pytest.param("field = 10", {"r2"}, id="number_attr"),
        pytest.param("field = true", {"r3"}, id="bool_attr"),
        pytest.param('field = "bs"', {"r4", "r5"}, id="body_value"),
        pytest.param("field exists", {"r0", "r1", "r2", "r3", "r4", "r5"}, id="exists_all"),
    ],
)
def test_json_body_unknown_key_collision_filter(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs_with_unknown_keys: Callable[[list[Logs], set[str]], None],
    predicate: str,
    expected_rids: set[str],
) -> None:
    """
    Setup:
    The attribute/body collision dataset, each record tagged with a unique `rid`
    resource so the filter result is checked by exact record identity, not just count.

    Tests:
    Filtering the unknown `field` resolves attributes OR the body JSON path and selects
    exactly the expected records: a typed operand hits its attribute map, a body value
    is matched via the body branch, and `exists` finds all six records.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    logs = [
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": SERVICE, "rid": "r0"}, attributes={"field": "sa"}, body="attr-str-0"),
        Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": SERVICE, "rid": "r1"}, attributes={"field": "sa"}, body="attr-str-1"),
        Logs(timestamp=now - timedelta(seconds=3), resources={"service.name": SERVICE, "rid": "r2"}, attributes={"field": 10}, body="attr-num"),
        Logs(timestamp=now - timedelta(seconds=4), resources={"service.name": SERVICE, "rid": "r3"}, attributes={"field": True}, body="attr-bool"),
        Logs(timestamp=now - timedelta(seconds=5), resources={"service.name": SERVICE, "rid": "r4"}, attributes={"http.method": "GET"}, body=json.dumps({"field": "bs"})),
        Logs(timestamp=now - timedelta(seconds=6), resources={"service.name": SERVICE, "rid": "r5"}, attributes={"http.method": "GET"}, body=json.dumps({"field": "bs"})),
    ]
    insert_logs_with_unknown_keys(logs, {"field"})

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[build_raw_query("A", "logs", limit=100, filter_expression=f'service.name = "{SERVICE}" AND ({predicate})')],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    matched = {row["data"]["resources_string"]["rid"] for row in get_rows(response)}
    assert matched == expected_rids, f"{predicate}: matched {matched} != {expected_rids}"


def test_json_body_unknown_key_attribute_parity(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs_with_unknown_keys: Callable[[list[Logs], set[str]], None],
) -> None:
    """
    Setup:
    4 logs carrying the same value under known_key (in metadata) and unknown_key
    (stripped), string / number / bool across records — no body values this time.

    Tests:
    Even with use_json_body on (the synthesized multiIf carries a trailing body
    branch), grouping by the unknown attribute key still matches grouping by the known
    one: the extra body branch does not perturb attribute-map resolution.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    specs = [("log-a", "alpha"), ("log-b", 42), ("log-c", 42), ("log-d", True)]
    logs = [
        Logs(
            timestamp=now - timedelta(seconds=i + 1),
            resources={"service.name": SERVICE},
            attributes={"known_key": value, "unknown_key": value},
            body=body,
        )
        for i, (body, value) in enumerate(specs)
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
    assert counts["known_key"] == {"alpha": 1, "42": 2, "true": 1}, counts["known_key"]


def test_json_body_unknown_key_aggregation_over_body(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs_with_unknown_keys: Callable[[list[Logs], set[str]], None],
) -> None:
    """
    Setup:
    The same attribute/body collision dataset — `field` carried as a string / number /
    bool attribute and in the body JSON, one place per record.

    Tests:
    Aggregating over the unknown `field` walks the whole multiIf including the body
    branch: count() sees every record (all 6) and count_distinct() counts the distinct
    stringified values across attribute maps AND the body ("sa", "10", "true", "bs").
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    logs = [
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": SERVICE}, attributes={"field": "sa"}, body="attr-str-0"),
        Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": SERVICE}, attributes={"field": "sa"}, body="attr-str-1"),
        Logs(timestamp=now - timedelta(seconds=3), resources={"service.name": SERVICE}, attributes={"field": 10}, body="attr-num"),
        Logs(timestamp=now - timedelta(seconds=4), resources={"service.name": SERVICE}, attributes={"field": True}, body="attr-bool"),
        Logs(timestamp=now - timedelta(seconds=5), resources={"service.name": SERVICE}, attributes={"http.method": "GET"}, body=json.dumps({"field": "bs"})),
        Logs(timestamp=now - timedelta(seconds=6), resources={"service.name": SERVICE}, attributes={"http.method": "GET"}, body=json.dumps({"field": "bs"})),
    ]
    insert_logs_with_unknown_keys(logs, {"field"})

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [
            build_scalar_query(
                "A",
                "logs",
                [build_aggregation("count(field)", "cnt"), build_aggregation("count_distinct(field)", "distinct")],
                filter_expression=f'service.name = "{SERVICE}"',
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = get_scalar_table_data(response.json())
    assert len(data) == 1, f"expected a single ungrouped row, got {data}"
    # count() over all 6 records; count_distinct() over {sa, 10, true, bs} incl. the body value.
    assert tuple(data[0]) == (6, 4), data[0]


def test_json_body_unknown_key_body_path_parity(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[JSONPathType]], None],
) -> None:
    """
    Setup:
    Logs whose body carries the same value under two paths — known_field and
    unknown_field — but only known_field is exported to the body path metadata
    (distributed_field_keys); unknown_field is left unregistered.

    Tests:
    Grouping/filtering by the registered body path (known_field, metadata-driven) and
    by the unregistered one (unknown_field, synthesized body branch) return identical
    results — the synthesize fallback reproduces exported-metadata resolution for body
    paths, the body counterpart of the attribute parity in 13_unknown_key_collisions.py.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    logs = []
    i = 0
    for value, count in [("alpha", 2), ("beta", 1)]:
        for _ in range(count):
            logs.append(
                Logs(
                    timestamp=now - timedelta(seconds=i + 1),
                    resources={"service.name": SERVICE},
                    body=json.dumps({"known_field": value, "unknown_field": value}),
                )
            )
            i += 1
    insert_logs(logs)
    # Register only known_field in the body path metadata; unknown_field stays unknown.
    export_json_types([JSONPathType("known_field", "string")])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    counts: dict[str, dict[str, int]] = {}
    for key in ("known_field", "unknown_field"):
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

    assert counts["known_field"] == counts["unknown_field"], f"registered {counts['known_field']} != synthesized {counts['unknown_field']}"
    assert counts["known_field"] == {"alpha": 2, "beta": 1}, counts["known_field"]
