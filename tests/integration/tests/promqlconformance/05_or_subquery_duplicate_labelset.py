from collections.abc import Callable
from datetime import UTC, datetime
from http import HTTPStatus
from uuid import uuid4

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics
from fixtures.querier import get_all_series, make_query_request

MINUTE_MS = 60_000
QUERY_TIMEOUT = 30


# Valid PromQL: the [30m:5m] subquery evaluates the or expression every 5m,
# yielding sum(flicker) while the flicker metric has data and sum(steady)
# after it stops. sum() drops __name__ from both, so every evaluation shares
# one labelset and the result is a single series. query_range must return it —
# not a "vector cannot contain metrics with the same labelset" error — and
# must agree with /prometheus/api/v1/query on the same expression.
def test_or_arms_merge_under_subquery_name_drop(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    now_ms = int(datetime.now(tz=UTC).timestamp() * 1000)
    base_ms = (now_ms // (5 * MINUTE_MS)) * (5 * MINUTE_MS) - 45 * MINUTE_MS

    flicker = f"or_flicker_arm_{uuid4().hex[:8]}"
    steady = f"or_steady_arm_{uuid4().hex[:8]}"
    insert_metrics(
        [
            Metrics(
                metric_name=name,
                labels={"host": "server-01"},
                timestamp=datetime.fromtimestamp((base_ms + minute * MINUTE_MS) / 1000, tz=UTC),
                value=1.0,
            )
            # The flicker arm stops at minute 9, so every 30m subquery window
            # below sees it present at some 5m-aligned steps and absent (past
            # lookback) at others, with the steady arm filling the gaps.
            for name, minutes in ((flicker, range(10)), (steady, range(36)))
            for minute in minutes
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = f"max_over_time((sum({flicker}) or sum({steady}))[30m:5m])"
    start_ms = base_ms + 20 * MINUTE_MS
    end_ms = base_ms + 35 * MINUTE_MS

    # A range query is semantically the instant evaluation of the same
    # expression at each grid timestamp. Each one must yield the single
    # nameless series; together they are the reference for query_range.
    instant_values: dict[int, float] = {}
    for ts_ms in range(start_ms, end_ms + 1, 5 * MINUTE_MS):
        response = requests.get(
            signoz.self.host_configs["8080"].get("/prometheus/api/v1/query"),
            params={"query": query, "time": ts_ms / 1000},
            timeout=QUERY_TIMEOUT,
            headers={"authorization": f"Bearer {token}"},
        )
        assert response.status_code == HTTPStatus.OK, response.text[:300]
        body = response.json()
        assert body.get("status") == "success", body
        result = body["data"]["result"]
        assert [series["metric"] for series in result] == [{}], (ts_ms, result)
        instant_values[ts_ms] = float(result[0]["value"][1])
    assert set(instant_values.values()) == {1.0}, instant_values

    # query_range over the same grid must agree point for point.
    spec = {"name": "A", "query": query, "step": 300}
    response = make_query_request(signoz, token, start_ms, end_ms, [{"type": "promql", "spec": spec}])
    assert response.status_code == HTTPStatus.OK, response.text[:300]
    series = get_all_series(response.json(), "A")
    assert len(series) == 1, f"both or arms must merge into one series: {series}"
    points = {point["timestamp"]: point["value"] for point in series[0].get("values") or []}
    assert points == instant_values, (points, instant_values)
