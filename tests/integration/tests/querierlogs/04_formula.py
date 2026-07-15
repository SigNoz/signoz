from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import (
    build_aggregation,
    build_formula_query,
    build_group_by_field,
    build_order_by,
    build_scalar_query,
    find_named_result,
    make_query_request,
)


def test_logs_formula_orderby_and_limit(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    Test that formula results are correctly ordered and limited when
    order and limit are applied on the formula.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    logs: list[Logs] = []
    # For service-i (i in 0..9): insert (10 - i) ERROR logs and 2 INFO logs.
    # A counts ERROR, B counts INFO, so A/B = (10 - i) / 2.
    # service-0 ratio = 5.0 (highest), service-9 ratio = 0.5 (lowest).
    for i in range(10):
        for j in range(10 - i):
            logs.append(
                Logs(
                    timestamp=now - timedelta(minutes=j + 1),
                    resources={"service.name": f"service-{i}"},
                    attributes={"code.file": "test.py"},
                    body=f"Error log {i}-{j}",
                    severity_text="ERROR",
                )
            )
        for k in range(2):
            logs.append(
                Logs(
                    timestamp=now - timedelta(minutes=k + 1),
                    resources={"service.name": f"service-{i}"},
                    attributes={"code.file": "test.py"},
                    body=f"Info log {i}-{k}",
                    severity_text="INFO",
                )
            )
    # Extra INFO-only services that appear in B but not in A. The formula
    for name in ("service-info-only-1", "service-info-only-2"):
        for k in range(2):
            logs.append(
                Logs(
                    timestamp=now - timedelta(minutes=k + 1),
                    resources={"service.name": name},
                    attributes={"code.file": "test.py"},
                    body=f"Info log {name}-{k}",
                    severity_text="INFO",
                )
            )

    # Logs look like this (columns = minutes before `now`; query range is
    # (now - 15m, now], so the `now` column is the exclusive upper bound and
    # no log lands there). E = ERROR, I = INFO, X = both at that minute.
    #
    #              t-10 t-9 t-8 t-7 t-6 t-5 t-4 t-3 t-2 t-1 |now |  A  B  A/B
    # service-0:    E   E   E   E   E   E   E   E   X   X  |    | 10  2  5.0
    # service-1:    .   E   E   E   E   E   E   E   X   X  |    |  9  2  4.5
    # service-2:    .   .   E   E   E   E   E   E   X   X  |    |  8  2  4.0
    # service-3:    .   .   .   E   E   E   E   E   X   X  |    |  7  2  3.5
    # service-4:    .   .   .   .   E   E   E   E   X   X  |    |  6  2  3.0
    # service-5:    .   .   .   .   .   E   E   E   X   X  |    |  5  2  2.5
    # service-6:    .   .   .   .   .   .   E   E   X   X  |    |  4  2  2.0
    # service-7:    .   .   .   .   .   .   .   E   X   X  |    |  3  2  1.5
    # service-8:    .   .   .   .   .   .   .   .   X   X  |    |  2  2  1.0
    # service-9:    .   .   .   .   .   .   .   .   I   X  |    |  1  2  0.5
    # info-only-1:  .   .   .   .   .   .   .   .   I   I  |    |  0* 2  0.0
    # info-only-2:  .   .   .   .   .   .   .   .   I   I  |    |  0* 2  0.0
    #
    # * A is missing for the info-only services; because A is count(), the
    #   formula evaluator defaults missing A to 0, yielding A/B = 0.
    insert_logs(logs)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    result = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=15)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type="scalar",
        queries=[
            build_scalar_query(
                name="A",
                signal="logs",
                aggregations=[build_aggregation("count()")],
                group_by=[build_group_by_field("service.name")],
                filter_expression="severity_text = 'ERROR'",
                disabled=True,
            ),
            build_scalar_query(
                name="B",
                signal="logs",
                aggregations=[build_aggregation("count()")],
                group_by=[build_group_by_field("service.name")],
                filter_expression="severity_text = 'INFO'",
                disabled=True,
            ),
            build_formula_query(
                "F1",
                "A / B",
                order=[build_order_by("__result", "desc")],
                limit=3,
            ),
            build_formula_query(
                "F2",
                "A / B",
                order=[build_order_by("__result", "desc")],
            ),
            build_formula_query(
                "F3",
                "A / B",
                order=[build_order_by("__result", "asc")],
                limit=3,
            ),
            build_formula_query(
                "F4",
                "A / B",
                order=[build_order_by("__result", "asc")],
            ),
        ],
    )
    assert result.status_code == HTTPStatus.OK
    assert result.json()["status"] == "success"

    results = result.json()["data"]["data"]["results"]

    def extract_services_and_values(query_name: str) -> tuple[list, list]:
        res = find_named_result(results, query_name)
        assert res is not None, f"Expected formula result named {query_name}"
        cols = res["columns"]
        s_col = next(i for i, c in enumerate(cols) if c["name"] == "service.name")
        v_col = next(i for i, c in enumerate(cols) if c["name"] == "__result")
        rows = res["data"]
        return [row[s_col] for row in rows], [row[v_col] for row in rows]

    # Because A is count(), canDefaultZero["A"] is true; the formula evaluator
    # defaults A to 0 for services that exist only in B. So the two INFO-only
    # services appear in the formula result with value 0.0 (extreme bottom in
    # desc order, extreme top in asc order). Their relative ordering is not
    # deterministic across separate formula evaluations (tied values).
    info_only_services = {"service-info-only-1", "service-info-only-2"}

    # F2: desc, no limit -> 12 rows in descending order by value.
    f2_services, f2_values = extract_services_and_values("F2")
    assert len(f2_services) == 12, f"F2: expected 12 rows with no limit, got {len(f2_services)}"
    assert f2_values == [5.0, 4.5, 4.0, 3.5, 3.0, 2.5, 2.0, 1.5, 1.0, 0.5, 0.0, 0.0], f2_values
    # Top 10 have distinct positive values -> deterministic service ordering.
    assert f2_services[:10] == [f"service-{i}" for i in range(10)], f2_services[:10]
    # Tail 2 are the INFO-only services tied at 0.0 (order between them not guaranteed).
    assert set(f2_services[10:]) == info_only_services, f2_services[10:]

    # F1: desc + limit 3 -> must be exactly the first 3 rows of F2.
    # Top 3 are not in the tie region, so prefix equality is safe.
    f1_services, f1_values = extract_services_and_values("F1")
    assert len(f1_services) == 3, f"F1: expected 3 rows after limit, got {len(f1_services)}"
    assert f1_services == f2_services[:3], f"F1 services {f1_services} are not the prefix of F2 services {f2_services}"
    assert f1_values == f2_values[:3], f"F1 values {f1_values} are not the prefix of F2 values {f2_values}"

    # F4: asc, no limit -> 12 rows in ascending order by value.
    f4_services, f4_values = extract_services_and_values("F4")
    assert len(f4_services) == 12, f"F4: expected 12 rows with no limit, got {len(f4_services)}"
    assert f4_values == sorted(f4_values), f"F4 not ascending: {f4_values}"
    # First 2 are the INFO-only services tied at 0.0 (order between them not guaranteed).
    assert set(f4_services[:2]) == info_only_services, f4_services[:2]
    assert f4_values[:2] == [0.0, 0.0], f4_values[:2]
    # Tail 10 are service-9 down to service-0 by value.
    assert f4_services[2:] == [f"service-{i}" for i in reversed(range(10))], f4_services[2:]
    assert f4_values[2:] == [(10 - i) / 2 for i in reversed(range(10))], f4_values[2:]

    # F3: asc + limit 3 -> values must match F4[:3] exactly; service set must
    # match too. Direct prefix equality on services would be flaky because the
    # two tied INFO-only entries can swap order between formula evaluations.
    f3_services, f3_values = extract_services_and_values("F3")
    assert len(f3_services) == 3, f"F3: expected 3 rows after limit, got {len(f3_services)}"
    assert f3_values == f4_values[:3], f"F3 values {f3_values} do not match F4[:3] values {f4_values[:3]}"
    assert set(f3_services) == set(f4_services[:3]), f"F3 services {f3_services} do not match F4[:3] services {f4_services[:3]}"
