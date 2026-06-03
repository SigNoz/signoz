"""
Integration tests for promoted-body-path time-window semantics.

Promotion splits the data timeline at a known timestamp.  The query builder
chooses which JSON column(s) to reference based on the query window:

  beforePromoted : window entirely before promotion_ts → body_v2 only
  afterPromoted  : window entirely after  promotion_ts → body_promoted only
  inBetween      : window spanning  the  promotion_ts  → both (multiIf merge)

Every case validates TWO things:
  1. Data correctness  — right rows are returned for the window (validate lambda)
  2. SQL column shape  — ClickHouse query references the expected column(s)
                         (check_query_log, inspects system.query_log)
"""
import json
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import (
    build_logs_aggregation,
    build_order_by,
    build_raw_query,
    build_scalar_query,
    get_rows,
    get_scalar_table_data,
    make_query_request,
)

# ──────────────────────────────────────────────────────────────────────────────
# Module-level constants
# ──────────────────────────────────────────────────────────────────────────────

_BODY_V2 = "body_v2"
_BODY_PROMOTED = "body_promoted"

# Paths fed to export_promoted_paths for the list-query test
_PROMOTED_PATHS = ["user.name", "user.age", "education"]


# ──────────────────────────────────────────────────────────────────────────────
# Shared helpers
# ──────────────────────────────────────────────────────────────────────────────


def _get_bodies(response: Any) -> list[dict[str, Any]]:
    return [row["data"]["body"] for row in get_rows(response)]


def _build_windows(promotion_ts: datetime) -> list[dict[str, Any]]:
    """Three canonical time windows relative to a promotion timestamp."""
    return [
        {
            "name": "before_promoted",
            "startMs": int((promotion_ts - timedelta(minutes=25)).timestamp() * 1000),
            "endMs": int((promotion_ts - timedelta(minutes=1)).timestamp() * 1000),
            "check_fn": lambda q: _BODY_V2 in q and _BODY_PROMOTED not in q,
        },
        {
            "name": "after_promoted",
            "startMs": int((promotion_ts + timedelta(minutes=1)).timestamp() * 1000),
            "endMs": int((promotion_ts + timedelta(minutes=25)).timestamp() * 1000),
            "check_fn": lambda q: _BODY_PROMOTED in q and _BODY_V2 not in q,
        },
        {
            "name": "in_between",
            "startMs": int((promotion_ts - timedelta(minutes=25)).timestamp() * 1000),
            "endMs": int((promotion_ts + timedelta(minutes=25)).timestamp() * 1000),
            "check_fn": lambda q: _BODY_V2 in q and _BODY_PROMOTED in q,
        },
    ]


# ──────────────────────────────────────────────────────────────────────────────
# Test 1 — raw (list) query shape + data correctness
# ──────────────────────────────────────────────────────────────────────────────


def test_body_promoted_list_query_shape(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
    export_promoted_paths: Callable[[list[str], datetime], None],
    check_query_log: Any,
) -> None:
    """
    Data landscape (4 logs, 2 pre-promotion, 2 post-promotion):

      -15 min  auth-service   alice  age=25  email  IIT/Iron(sports)+Gold(academic)
       -5 min  api-service    bob    age=30         MIT/Silver(research)
       +5 min  compute-svc    carol  age=35  email  Stanford/Bronze(sports)
      +12 min  storage-svc    dan    age=40         Harvard/Diamond(research)

    bob appears only before promotion → useful sentinel for "after_promoted: 0 rows".
    "sports" awards straddle the boundary (alice pre, carol post) → tests inBetween merge.

    Cases:
      prim.string_eq  — body.user.name = "bob"
      prim.int_gt     — body.user.age > 32
      arr.element_eq  — body.education[].name = "IIT"
      arr.awards_type — body.education[].awards[].type = "sports"
    """
    now = datetime.now(tz=UTC)
    promotion_ts = now - timedelta(minutes=20)

    # ── Pre-promotion logs (body_v2 only) ─────────────────────────────────────
    pre_alice = json.dumps({
        "user": {"name": "alice", "age": 25, "email": "alice@corp.io"},
        "status": 200,
        "education": [
            {
                "name": "IIT",
                "year": 2018,
                "parameters": [1.65, 2.5, 3.0],
                "awards": [
                    {"name": "Iron Award", "type": "sports"},
                    {"name": "Gold Award", "type": "academic"},
                ],
            }
        ],
    })
    pre_bob = json.dumps({
        "user": {"name": "bob", "age": 30},
        "status": 401,
        "education": [
            {
                "name": "MIT",
                "year": 2020,
                "parameters": [4.0, 5.5],
                "awards": [{"name": "Silver Award", "type": "research"}],
            }
        ],
    })

    # ── Post-promotion logs (body_v2 + body_promoted, promoted omits status) ──
    post_carol_full = {
        "user": {"name": "carol", "age": 35, "email": "carol@corp.io"},
        "status": 202,
        "education": [
            {
                "name": "Stanford",
                "year": 2021,
                "parameters": [2.75, 3.5],
                "awards": [{"name": "Bronze Award", "type": "sports"}],
            }
        ],
    }
    post_dan_full = {
        "user": {"name": "dan", "age": 40},
        "status": 500,
        "education": [
            {
                "name": "Harvard",
                "year": 2023,
                "parameters": [6.0, 7.0, 8.0],
                "awards": [{"name": "Diamond Award", "type": "research"}],
            }
        ],
    }

    logs_list = [
        Logs(
            timestamp=promotion_ts - timedelta(minutes=15),
            resources={"service.name": "auth-service"},
            body_v2=pre_alice,
            body_promoted="",
            severity_text="INFO",
        ),
        Logs(
            timestamp=promotion_ts - timedelta(minutes=5),
            resources={"service.name": "api-service"},
            body_v2=pre_bob,
            body_promoted="",
            severity_text="ERROR",
        ),
        Logs(
            timestamp=promotion_ts + timedelta(minutes=5),
            resources={"service.name": "compute-service"},
            body_v2=json.dumps(post_carol_full),
            # body_promoted intentionally omits status — only the promoted paths
            body_promoted=json.dumps({
                "user": post_carol_full["user"],
                "education": post_carol_full["education"],
            }),
            severity_text="WARN",
        ),
        Logs(
            timestamp=promotion_ts + timedelta(minutes=12),
            resources={"service.name": "storage-service"},
            body_v2=json.dumps(post_dan_full),
            body_promoted=json.dumps({
                "user": post_dan_full["user"],
                "education": post_dan_full["education"],
            }),
            severity_text="ERROR",
        ),
    ]

    export_json_types(logs_list)
    export_promoted_paths(_PROMOTED_PATHS, promotion_ts)
    insert_logs(logs_list)
    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

    cases = [
        # "a" in name: alice(pre), carol+dan(post) — 1 / 2 / 3 across windows
        {
            "name": "prim.name_contains",
            "expression": 'body.user.name CONTAINS "a"',
            "validates": {
                "before_promoted": lambda r: (
                    len(get_rows(r)) == 1
                    and _get_bodies(r)[0]["user"]["name"] == "alice"
                ),
                "after_promoted": lambda r: (
                    len(get_rows(r)) == 2
                    and {b["user"]["name"] for b in _get_bodies(r)} == {"carol", "dan"}
                ),
                "in_between": lambda r: (
                    len(get_rows(r)) == 3
                    and {b["user"]["name"] for b in _get_bodies(r)} == {"alice", "carol", "dan"}
                ),
            },
        },
        # age < 36: alice(25)+bob(30) pre, carol(35) post, dan(40) excluded — 2 / 1 / 3
        {
            "name": "prim.age_lt",
            "expression": "body.user.age < 36",
            "validates": {
                "before_promoted": lambda r: (
                    len(get_rows(r)) == 2
                    and {b["user"]["name"] for b in _get_bodies(r)} == {"alice", "bob"}
                ),
                "after_promoted": lambda r: (
                    len(get_rows(r)) == 1
                    and _get_bodies(r)[0]["user"]["name"] == "carol"
                ),
                "in_between": lambda r: (
                    len(get_rows(r)) == 3
                    and {b["user"]["name"] for b in _get_bodies(r)} == {"alice", "bob", "carol"}
                ),
            },
        },
        # education year > 2019: bob/MIT/2020(pre), carol/Stanford/2021+dan/Harvard/2023(post) — 1 / 2 / 3
        # alice/IIT/2018 is intentionally excluded in every window (2018 ≤ 2019)
        {
            "name": "arr.edu_year_gt",
            "expression": "body.education[].year > 2019",
            "validates": {
                "before_promoted": lambda r: (
                    len(get_rows(r)) == 1
                    and any(e["name"] == "MIT" for e in _get_bodies(r)[0]["education"])
                ),
                "after_promoted": lambda r: (
                    len(get_rows(r)) == 2
                    and {b["user"]["name"] for b in _get_bodies(r)} == {"carol", "dan"}
                ),
                "in_between": lambda r: (
                    len(get_rows(r)) == 3
                    and {b["user"]["name"] for b in _get_bodies(r)} == {"bob", "carol", "dan"}
                ),
            },
        },
        # "sports" type straddles the boundary: alice pre (Iron), carol post (Bronze)
        {
            "name": "arr.awards_type",
            "expression": 'body.education[].awards[].type = "sports"',
            "validates": {
                "before_promoted": lambda r: (
                    len(get_rows(r)) == 1
                    and _get_bodies(r)[0]["user"]["name"] == "alice"
                ),
                "after_promoted": lambda r: (
                    len(get_rows(r)) == 1
                    and _get_bodies(r)[0]["user"]["name"] == "carol"
                ),
                "in_between": lambda r: (
                    len(get_rows(r)) == 2
                    and {b["user"]["name"] for b in _get_bodies(r)} == {"alice", "carol"}
                ),
            },
        },
    ]

    windows = _build_windows(promotion_ts)
    for case in cases:
        for window in windows:
            name = f"{case['name']}.{window['name']}"
            query = build_raw_query(
                name=name,
                signal="logs",
                filter_expression=case.get("expression"),
                order=[build_order_by("timestamp", "desc")],
                limit=case.get("limit", 100),
                step_interval=60,
            )
            before = datetime.now(tz=UTC)
            response = make_query_request(
                signoz=signoz,
                token=token,
                start_ms=window["startMs"],
                end_ms=window["endMs"],
                queries=[query],
                request_type="raw",
            )
            assert response.status_code == 200, f"HTTP {response.status_code} for '{name}': {response.text}"
            assert case["validates"][window["name"]](response), f"Validation failed for '{name}': {response.json()}"
            check_query_log(
                before,
                name,
                window["check_fn"],
                tables=["signoz_logs.distributed_logs_v2"],
            )


# ──────────────────────────────────────────────────────────────────────────────
# Test 2 — GroupBy scalar shape + data correctness
# ──────────────────────────────────────────────────────────────────────────────


def test_body_promoted_groupby_shape(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
    export_promoted_paths: Callable[[list[str], datetime], None],
    check_query_log: Any,
) -> None:
    """
    Data landscape (8 logs across both windows):

      Pre-promotion (body_v2 only):
        -14 min  alice  age=25  (count×3 in before window)
        -10 min  alice  age=25
         -6 min  bob    age=30  (count×1)
         -2 min  alice  age=25

      Post-promotion (body_v2 + body_promoted):
         +3 min  carol  age=35  (count×2 in after window)
         +8 min  alice  age=25  ← alice straddles both windows
        +13 min  eve    age=28  (count×1)
        +18 min  carol  age=35

    alice straddles the promotion boundary intentionally to verify that the
    inBetween multiIf(body_promoted.user.name, body_v2.user.name) coalesces
    her entries from both columns into the same group-by bucket (count=4).

    Cases (all requestType="scalar" for flat-table validation):
      groupby.name  — GROUP BY body.user.name
      groupby.age   — GROUP BY body.user.age
      groupby.multi — GROUP BY body.user.name + body.user.age
    """
    now = datetime.now(tz=UTC)
    promotion_ts = now - timedelta(minutes=20)
    promoted_paths = ["user.name", "user.age"]

    # (timestamp_offset, name, age, severity)
    pre_entries = [
        (timedelta(minutes=14), "alice", 25, "INFO"),
        (timedelta(minutes=10), "alice", 25, "WARN"),
        (timedelta(minutes=6),  "bob",   30, "ERROR"),
        (timedelta(minutes=2),  "alice", 25, "INFO"),
    ]
    post_entries = [
        (timedelta(minutes=3),  "carol", 35, "INFO"),
        (timedelta(minutes=8),  "alice", 25, "DEBUG"),
        (timedelta(minutes=13), "eve",   28, "INFO"),
        (timedelta(minutes=18), "carol", 35, "WARN"),
    ]

    logs_list = [
        Logs(
            timestamp=promotion_ts - offset,
            resources={"service.name": "api-service"},
            body_v2=json.dumps({"user": {"name": name, "age": age}}),
            body_promoted="",
            severity_text=sev,
        )
        for offset, name, age, sev in pre_entries
    ] + [
        Logs(
            timestamp=promotion_ts + offset,
            resources={"service.name": "api-service"},
            body_v2=json.dumps({"user": {"name": name, "age": age}}),
            body_promoted=json.dumps({"user": {"name": name, "age": age}}),
            severity_text=sev,
        )
        for offset, name, age, sev in post_entries
    ]

    export_json_types(logs_list)
    export_promoted_paths(promoted_paths, promotion_ts)
    insert_logs(logs_list)
    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

    # ── Scalar result helpers ─────────────────────────────────────────────────

    def _name_counts(r: Any) -> dict[str, int]:
        return {str(row[0]): row[-1] for row in get_scalar_table_data(r.json()) if row}

    def _age_counts(r: Any) -> dict[str, int]:
        return {str(row[0]): row[-1] for row in get_scalar_table_data(r.json()) if row}

    def _pair_counts(r: Any) -> dict[tuple[str, str], int]:
        return {
            (str(row[0]), str(row[1])): row[-1]
            for row in get_scalar_table_data(r.json())
            if len(row) >= 3
        }

    # ── Cases ─────────────────────────────────────────────────────────────────

    cases = [
        # before: alice×3, bob×1
        # after:  carol×2, alice×1, eve×1
        # span:   alice×4, bob×1, carol×2, eve×1
        {
            "name": "groupby.name",
            "groupBy": [{"name": "body.user.name", "fieldDataType": "string"}],
            "aggregation": "count()",
            "stepInterval": 60,
            "validates": {
                "before_promoted": lambda r: _name_counts(r) == {"alice": 3, "bob": 1},
                "after_promoted":  lambda r: _name_counts(r) == {"carol": 2, "alice": 1, "eve": 1},
                "in_between":      lambda r: _name_counts(r) == {"alice": 4, "bob": 1, "carol": 2, "eve": 1},
            },
        },
        # before: age-25×3, age-30×1
        # after:  age-35×2, age-25×1, age-28×1
        # span:   age-25×4, age-30×1, age-35×2, age-28×1
        {
            "name": "groupby.age",
            "groupBy": [{"name": "body.user.age", "fieldDataType": "int64"}],
            "aggregation": "count()",
            "stepInterval": 60,
            "validates": {
                "before_promoted": lambda r: _age_counts(r) == {"25": 3, "30": 1},
                "after_promoted":  lambda r: _age_counts(r) == {"35": 2, "25": 1, "28": 1},
                "in_between":      lambda r: _age_counts(r) == {"25": 4, "30": 1, "35": 2, "28": 1},
            },
        },
        # before: (alice,25)×3, (bob,30)×1
        # after:  (carol,35)×2, (alice,25)×1, (eve,28)×1
        # span:   (alice,25)×4, (bob,30)×1, (carol,35)×2, (eve,28)×1
        {
            "name": "groupby.multi",
            "groupBy": [
                {"name": "body.user.name", "fieldDataType": "string"},
                {"name": "body.user.age",  "fieldDataType": "int64"},
            ],
            "aggregation": "count()",
            "stepInterval": 60,
            "validates": {
                "before_promoted": lambda r: _pair_counts(r) == {
                    ("alice", "25"): 3, ("bob", "30"): 1,
                },
                "after_promoted": lambda r: _pair_counts(r) == {
                    ("carol", "35"): 2, ("alice", "25"): 1, ("eve", "28"): 1,
                },
                "in_between": lambda r: _pair_counts(r) == {
                    ("alice", "25"): 4, ("bob", "30"): 1,
                    ("carol", "35"): 2, ("eve", "28"): 1,
                },
            },
        },
    ]

    windows = _build_windows(promotion_ts)
    for case in cases:
        for window in windows:
            name = f"{case['name']}.{window['name']}"
            query = build_scalar_query(
                name=name,
                signal="logs",
                aggregations=[build_logs_aggregation(case["aggregation"])],
                group_by=case["groupBy"],
                step_interval=case["stepInterval"],
            )
            before = datetime.now(tz=UTC)
            response = make_query_request(
                signoz=signoz,
                token=token,
                start_ms=window["startMs"],
                end_ms=window["endMs"],
                queries=[query],
                request_type="scalar",
            )
            assert response.status_code == 200, f"HTTP {response.status_code} for '{name}': {response.text}"
            assert case["validates"][window["name"]](response), f"Validation failed for '{name}': {response.json()}"
            check_query_log(
                before,
                name,
                window["check_fn"],
                tables=["signoz_logs.distributed_logs_v2"],
            )
