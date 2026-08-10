from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics
from fixtures.querier import get_all_series, make_query_request

SUM_METRIC = "job_duration_sum"
COUNT_METRIC = "job_duration_count"
HOUR_MS = 3_600_000
SAMPLE_INTERVAL_MS = 60_000


def test_promql_ratio_with_zero_denominator_is_dropped_and_cached(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    # 12h ending on an hour boundary 15m ago — old enough to be cached.
    end_ms = (int((datetime.now(tz=UTC) - timedelta(minutes=15)).timestamp() * 1000) // HOUR_MS) * HOUR_MS
    start_ms = end_ms - 12 * HOUR_MS

    # active_job divides finite; idle_job is 0/0 at every step.
    series = {"active_job": (100.0, 4.0), "idle_job": (0.0, 0.0)}
    metrics: list[Metrics] = []
    for job_name, (sum_value, count_value) in series.items():
        for ts_ms in range(start_ms, end_ms + 1, SAMPLE_INTERVAL_MS):
            timestamp = datetime.fromtimestamp(ts_ms / 1000, tz=UTC)
            metrics.append(Metrics(metric_name=SUM_METRIC, labels={"job_name": job_name}, timestamp=timestamp, value=sum_value))
            metrics.append(Metrics(metric_name=COUNT_METRIC, labels={"job_name": job_name}, timestamp=timestamp, value=count_value))
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    promql = f"sum by (job_name) ({SUM_METRIC}) / sum by (job_name) ({COUNT_METRIC})"

    def run() -> tuple[dict[str, dict[int, object]], int]:
        query = {"type": "promql", "spec": {"name": "A", "query": promql}}
        response = make_query_request(signoz, token, start_ms, end_ms, [query], no_cache=False)
        assert response.status_code == HTTPStatus.OK, response.text[:300]
        body = response.json()
        out: dict[str, dict[int, object]] = {}
        for entry in get_all_series(body, "A") or []:
            labels = {l["key"]["name"]: str(l["value"]) for l in entry.get("labels") or []}
            out[labels["job_name"]] = {v["timestamp"]: v["value"] for v in entry.get("values") or []}
        return out, int(body["data"]["meta"]["stepIntervals"]["A"])

    # First populates the cache, second must be served from it.
    first, step_seconds = run()
    second, _ = run()

    expected_points = (end_ms - start_ms) // (step_seconds * 1000) + 1
    assert set(first) == {"active_job"}, f"the 0/0 series must not reach the response: {sorted(first)}"
    assert set(first["active_job"].values()) == {25.0}, sorted(set(first["active_job"].values()))
    assert len(first["active_job"]) == expected_points, f"expected {expected_points} points, got {len(first['active_job'])}"

    # The cached read excludes end_ms, the one legitimate difference.
    assert set(second) == set(first), sorted(second)
    for job_name, points in first.items():
        expected = {ts: value for ts, value in points.items() if ts < end_ms}
        assert second[job_name] == expected, f"{job_name}: got {len(second[job_name])} of {len(expected)} points"
