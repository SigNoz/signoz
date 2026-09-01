from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics

QUERY_TIMEOUT = 30


def test_fetch_budgets(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    # The container runs with max_fetched_series=10 and
    # max_fetched_samples=100 (see conftest.py). Both metrics take the
    # engine path: instant queries always do, and changes() is not
    # transpilable, so the range query falls back too.
    end = datetime.now(tz=UTC).replace(second=0, microsecond=0) - timedelta(minutes=5)
    metrics = [
        Metrics(
            metric_name="budget_series_metric",
            labels={"instance": str(i)},
            timestamp=end,
            value=1.0,
            flags=0,
        )
        for i in range(25)
    ]
    start = end - timedelta(minutes=50)
    metrics.extend(
        Metrics(
            metric_name="budget_samples_metric",
            labels={"instance": "0"},
            timestamp=start + timedelta(seconds=15 * i),
            value=float(i),
            flags=0,
        )
        for i in range(200)
    )
    insert_metrics(metrics)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    headers = {"authorization": f"Bearer {token}"}

    # 25 matched series exceed the series budget of 10: the series lookup is
    # refused by ClickHouse and surfaces as a Prometheus execution error.
    response = requests.get(
        signoz.self.host_configs["8080"].get("/prometheus/api/v1/query"),
        params={"query": "budget_series_metric", "time": end.timestamp()},
        timeout=QUERY_TIMEOUT,
        headers=headers,
    )
    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY
    body = response.json()
    assert body["status"] == "error"
    assert body["errorType"] == "execution"
    assert "matched more than 10 series" in body["error"]

    # The range selector fetches all 200 raw samples, exceeding the samples
    # budget of 100.
    response = requests.get(
        signoz.self.host_configs["8080"].get("/prometheus/api/v1/query_range"),
        params={
            "query": "changes(budget_samples_metric[30m])",
            "start": start.timestamp(),
            "end": end.timestamp(),
            "step": 60,
        },
        timeout=QUERY_TIMEOUT,
        headers=headers,
    )
    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY
    body = response.json()
    assert body["status"] == "error"
    assert body["errorType"] == "execution"
    assert "more than 100 samples" in body["error"]

    # One series and one last-sample fetch sit inside both budgets.
    response = requests.get(
        signoz.self.host_configs["8080"].get("/prometheus/api/v1/query"),
        params={"query": "budget_samples_metric", "time": end.timestamp()},
        timeout=QUERY_TIMEOUT,
        headers=headers,
    )
    assert response.status_code == HTTPStatus.OK
    body = response.json()
    assert body["status"] == "success"
    assert len(body["data"]["result"]) == 1
