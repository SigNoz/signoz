from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus
from uuid import uuid4

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics
from fixtures.querier import get_all_series, make_query_request

MINUTE_MS = 60_000

LEGS: list[tuple[str, dict | None]] = [
    ("default", None),
    ("clickhousev2", {"X-SigNoz-PromQL-Provider": "clickhousev2"}),
]


def test_promql_subquery_without_step_evaluates(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    """
    A subquery that omits its step, e.g. `metric[5m:]`, is valid PromQL: the
    engine fills in its default resolution. A nil NoStepSubqueryIntervalFn
    segfaults the whole process on the first such query.
    """
    end_ms = (int((datetime.now(tz=UTC) - timedelta(minutes=5)).timestamp() * 1000) // MINUTE_MS) * MINUTE_MS
    start_ms = end_ms - 30 * MINUTE_MS

    metric = f"no_step_subquery_gauge_{uuid4().hex[:8]}"
    insert_metrics(
        [
            Metrics(
                metric_name=metric,
                labels={"host": "server-01"},
                timestamp=datetime.fromtimestamp(ts_ms / 1000, tz=UTC),
                value=42.0,
            )
            for ts_ms in range(start_ms, end_ms + 1, MINUTE_MS)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    for leg, headers in LEGS:
        query = {"type": "promql", "spec": {"name": "A", "query": f"max_over_time({metric}[5m:])"}}
        response = make_query_request(signoz, token, start_ms, end_ms, [query], headers=headers)
        assert response.status_code == HTTPStatus.OK, f"{leg}: {response.text[:300]}"
        series = get_all_series(response.json(), "A")
        assert series, f"{leg}: the subquery must return the inserted series"
        values = {point["value"] for entry in series for point in entry.get("values") or []}
        assert values == {42.0}, f"{leg}: {sorted(values)[:5]}"

    # A plain follow-up query proves the process survived the subquery legs.
    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [{"type": "promql", "spec": {"name": "A", "query": metric}}],
    )
    assert response.status_code == HTTPStatus.OK, response.text[:300]
