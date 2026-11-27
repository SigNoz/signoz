import datetime
from collections.abc import Callable
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics

QUERY_TIMEOUT = 30


def test_labels_lists_names_and_match_filters_them(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    now = datetime.datetime.now()
    insert_metrics(
        [
            Metrics(metric_name="http_requests_total", labels={"job": "api", "instance": "i1"}, timestamp=now),
            Metrics(metric_name="cpu_usage", labels={"job": "api", "core": "0"}, timestamp=now),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    headers = {"authorization": f"Bearer {token}"}
    window = {"start": (now - datetime.timedelta(minutes=1)).timestamp(), "end": (now + datetime.timedelta(minutes=1)).timestamp()}

    unfiltered = requests.get(signoz.self.host_configs["8080"].get("/prometheus/api/v1/labels"), params=window, headers=headers, timeout=QUERY_TIMEOUT)
    assert unfiltered.status_code == HTTPStatus.OK
    assert unfiltered.json()["status"] == "success"
    assert {"__name__", "job", "instance", "core"}.issubset(set(unfiltered.json()["data"]))

    filtered = requests.get(
        signoz.self.host_configs["8080"].get("/prometheus/api/v1/labels"),
        params={**window, "match[]": '{__name__="http_requests_total"}'},
        headers=headers,
        timeout=QUERY_TIMEOUT,
    )
    assert filtered.status_code == HTTPStatus.OK
    filtered_names = set(filtered.json()["data"])
    assert {"__name__", "job", "instance"}.issubset(filtered_names)
    assert "core" not in filtered_names


def test_label_values_scoped_by_match(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    now = datetime.datetime.now()
    insert_metrics(
        [
            Metrics(metric_name="http_requests_total", labels={"job": "api"}, timestamp=now),
            Metrics(metric_name="http_requests_total", labels={"job": "worker"}, timestamp=now),
            Metrics(metric_name="cpu_usage", labels={"job": "api"}, timestamp=now),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    headers = {"authorization": f"Bearer {token}"}
    window = {"start": (now - datetime.timedelta(minutes=1)).timestamp(), "end": (now + datetime.timedelta(minutes=1)).timestamp()}

    all_jobs = requests.get(signoz.self.host_configs["8080"].get("/prometheus/api/v1/label/job/values"), params=window, headers=headers, timeout=QUERY_TIMEOUT)
    assert all_jobs.status_code == HTTPStatus.OK
    assert set(all_jobs.json()["data"]) == {"api", "worker"}

    scoped = requests.get(
        signoz.self.host_configs["8080"].get("/prometheus/api/v1/label/job/values"),
        params={**window, "match[]": '{__name__="cpu_usage"}'},
        headers=headers,
        timeout=QUERY_TIMEOUT,
    )
    assert scoped.status_code == HTTPStatus.OK
    assert set(scoped.json()["data"]) == {"api"}


def test_series_requires_match_and_unions_multiple(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    now = datetime.datetime.now()
    insert_metrics(
        [
            Metrics(metric_name="http_requests_total", labels={"job": "api"}, timestamp=now),
            Metrics(metric_name="cpu_usage", labels={"job": "worker"}, timestamp=now),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    headers = {"authorization": f"Bearer {token}"}
    window = {"start": (now - datetime.timedelta(minutes=1)).timestamp(), "end": (now + datetime.timedelta(minutes=1)).timestamp()}

    no_match = requests.get(signoz.self.host_configs["8080"].get("/prometheus/api/v1/series"), params=window, headers=headers, timeout=QUERY_TIMEOUT)
    assert no_match.status_code == HTTPStatus.BAD_REQUEST
    assert no_match.json()["errorType"] == "bad_data"

    unioned = requests.get(
        signoz.self.host_configs["8080"].get("/prometheus/api/v1/series"),
        params={**window, "match[]": ['{__name__="http_requests_total"}', '{__name__="cpu_usage"}']},
        headers=headers,
        timeout=QUERY_TIMEOUT,
    )
    assert unioned.status_code == HTTPStatus.OK
    label_sets = [frozenset(series.items()) for series in unioned.json()["data"]]
    assert frozenset({"__name__": "http_requests_total", "job": "api"}.items()) in label_sets
    assert frozenset({"__name__": "cpu_usage", "job": "worker"}.items()) in label_sets


def test_default_time_window_covers_recently_inserted_data(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    insert_metrics([Metrics(metric_name="freshly_inserted_metric", labels={"job": "api"})])
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    headers = {"authorization": f"Bearer {token}"}

    response = requests.get(
        signoz.self.host_configs["8080"].get("/prometheus/api/v1/labels"),
        params={"match[]": '{__name__="freshly_inserted_metric"}'},
        headers=headers,
        timeout=QUERY_TIMEOUT,
    )
    assert response.status_code == HTTPStatus.OK
    assert "job" in response.json()["data"]
