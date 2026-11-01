import re
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.fs import get_testdata_file_path
from fixtures.logs import Logs
from fixtures.traces import Traces

ENDPOINT = "/api/v1/annotations"
IDENTITY_KEYS = ("service.name", "deployment.environment", "deployment.environment.name", "service.version")
# load_from_file shifts the earliest dataset row (the baseline tuple) to now - BASELINE_OFFSET.
BASELINE_OFFSET = timedelta(hours=3)
ALL_MARKERS = {("checkout", "1.1.0"), ("cart", "2.0.0"), ("worker", "3.0.0"), ("tieA", "4.0.0"), ("tieB", "4.0.0"), ("api", "6.0.0"), ("sp`ec'ial", "5.0.0$0")}


def test_deployments_empty_tables(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_traces,  # pylint: disable=unused-argument
    insert_logs,  # pylint: disable=unused-argument
) -> None:
    """No telemetry at all: 200 with no records and no history edge."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json={"kind": "deployment", "start": int((now - timedelta(hours=1)).timestamp() * 1000), "end": int(now.timestamp() * 1000), "limit": 50},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"] == {"records": [], "total": 0, "historyAvailableFrom": 0}


def test_deployments_accuracy(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_traces,
    insert_logs,
) -> None:
    """Seed both signals; assert the full record contract, exact first-seen times,
    deep-link ids, stripped identity keys, ordering, merge winners and the history edge."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    traces = Traces.load_from_file(get_testdata_file_path("annotations/traces.jsonl"), base_time=now - BASELINE_OFFSET)
    logs = Logs.load_from_file(get_testdata_file_path("annotations/logs.jsonl"), base_time=now - BASELINE_OFFSET)
    insert_traces(traces)
    insert_logs(logs)
    span_of: dict[tuple[str, str], Traces] = {}
    for span in sorted(traces, key=lambda span: span.timestamp):
        span_of.setdefault((span.resources_string["service.name"], span.resources_string["service.version"]), span)
    log_of: dict[tuple[str, str], Logs] = {}
    for log in sorted(logs, key=lambda log: log.timestamp):
        log_of.setdefault((log.resources_string["service.name"], log.resources_string["service.version"]), log)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json={"kind": "deployment", "start": int((now - timedelta(hours=1)).timestamp() * 1000), "end": int(now.timestamp() * 1000), "limit": 50},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]

    # Ordered by firstSeen then service. checkout 1.1.0: logs 30s before traces, logs wins.
    # worker 3.0.0: same timestamp on both signals, traces wins. tieA/tieB: same timestamp.
    # checkout 1.0.0 (oldest bucket), legacy 0.5.0 (before start), noversion (empty version) are not markers.
    expected = [
        ("checkout", "1.1.0", "logs"),
        ("cart", "2.0.0", "traces"),
        ("worker", "3.0.0", "traces"),
        ("tieA", "4.0.0", "traces"),
        ("tieB", "4.0.0", "traces"),
        ("api", "6.0.0", "logs"),
        ("sp`ec'ial", "5.0.0$0", "traces"),
    ]
    assert [(r["spec"]["service"], r["spec"]["version"], r["spec"]["signal"]) for r in data["records"]] == expected
    assert data["total"] == len(expected)
    assert data["historyAvailableFrom"] == (int((now - BASELINE_OFFSET).timestamp()) // 1800 * 1800 + 1800) * 1000

    for record in data["records"]:
        assert record["kind"] == "deployment"
        spec = record["spec"]
        for field in ("id", "signal", "service", "environment", "version", "firstSeen", "traceId", "spanId", "logId", "resourceAttributes"):
            assert field in spec, f"missing {field} in {spec!r}"
        assert re.fullmatch(r"dep_[0-9a-f]{8}", spec["id"])
        key = (spec["service"], spec["version"])
        if spec["signal"] == "traces":
            span = span_of[key]
            assert spec["firstSeen"] == int(span.timestamp.timestamp() * 1000)
            assert (spec["traceId"], spec["spanId"], spec["logId"]) == (span.trace_id, span.span_id, "")
            resources = span.resources_string
        else:
            log = log_of[key]
            assert spec["firstSeen"] == int(log.timestamp) // 1_000_000
            assert (spec["traceId"], spec["spanId"], spec["logId"]) == ("", "", log.id)
            resources = log.resources_string
        assert spec["environment"] == resources["deployment.environment"]
        assert spec["resourceAttributes"] == {k: v for k, v in resources.items() if k not in IDENTITY_KEYS}

    assert len({r["spec"]["id"] for r in data["records"]}) == len(expected)


@pytest.mark.parametrize(
    ("start_anchor", "start_offset", "end_anchor", "end_offset", "expected"),
    [
        pytest.param("cart", 0, "now", 0, ALL_MARKERS - {("checkout", "1.1.0")}, id="start_at_first_row_inclusive"),
        pytest.param("cart", 1, "now", 0, ALL_MARKERS - {("checkout", "1.1.0"), ("cart", "2.0.0")}, id="start_after_first_row"),
        pytest.param("baseline", 7200, "cart", 0, {("checkout", "1.1.0"), ("cart", "2.0.0")}, id="end_at_first_row_inclusive"),
        pytest.param("baseline", 7200, "cart", -1, {("checkout", "1.1.0")}, id="end_before_first_row"),
        pytest.param("baseline", -60, "baseline", 60, set(), id="oldest_bucket_only"),
        pytest.param("baseline", -7200, "baseline", -3600, set(), id="window_before_data"),
        pytest.param("now", -300, "now", 0, set(), id="window_after_data"),
    ],
)
def test_deployments_exclusions(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_traces,
    insert_logs,
    start_anchor: str,
    start_offset: int,
    end_anchor: str,
    end_offset: int,
    expected: set[tuple[str, str]],
) -> None:
    """Window bounds bind exactly on first_seen (inclusive both ends). Rows in the oldest
    bucket, before start, or outside the window never produce markers, and the history
    edge is reported even when nothing matches."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    traces = Traces.load_from_file(get_testdata_file_path("annotations/traces.jsonl"), base_time=now - BASELINE_OFFSET)
    logs = Logs.load_from_file(get_testdata_file_path("annotations/logs.jsonl"), base_time=now - BASELINE_OFFSET)
    insert_traces(traces)
    insert_logs(logs)

    anchors = {"cart": next(span.timestamp for span in traces if span.resources_string["service.name"] == "cart"), "baseline": now - BASELINE_OFFSET, "now": now}
    start = anchors[start_anchor] + timedelta(seconds=start_offset)
    end = anchors[end_anchor] + timedelta(seconds=end_offset)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json={"kind": "deployment", "start": int(start.timestamp() * 1000), "end": int(end.timestamp() * 1000), "limit": 50},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert {(r["spec"]["service"], r["spec"]["version"]) for r in data["records"]} == expected
    assert data["total"] == len(expected)
    assert data["historyAvailableFrom"] == (int((now - BASELINE_OFFSET).timestamp()) // 1800 * 1800 + 1800) * 1000


@pytest.mark.parametrize(
    ("signals", "expected"),
    [
        pytest.param(None, {("checkout", "1.1.0", "logs"), ("cart", "2.0.0", "traces"), ("worker", "3.0.0", "traces"), ("tieA", "4.0.0", "traces"), ("tieB", "4.0.0", "traces"), ("api", "6.0.0", "logs"), ("sp`ec'ial", "5.0.0$0", "traces")}, id="unset_both"),
        pytest.param([], {("checkout", "1.1.0", "logs"), ("cart", "2.0.0", "traces"), ("worker", "3.0.0", "traces"), ("tieA", "4.0.0", "traces"), ("tieB", "4.0.0", "traces"), ("api", "6.0.0", "logs"), ("sp`ec'ial", "5.0.0$0", "traces")}, id="empty_list_both"),
        pytest.param(["traces"], {("checkout", "1.1.0", "traces"), ("cart", "2.0.0", "traces"), ("worker", "3.0.0", "traces"), ("tieA", "4.0.0", "traces"), ("tieB", "4.0.0", "traces"), ("sp`ec'ial", "5.0.0$0", "traces")}, id="traces_only"),
        pytest.param(["logs"], {("checkout", "1.1.0", "logs"), ("worker", "3.0.0", "logs"), ("api", "6.0.0", "logs")}, id="logs_only"),
        pytest.param(["logs", "traces"], {("checkout", "1.1.0", "logs"), ("cart", "2.0.0", "traces"), ("worker", "3.0.0", "traces"), ("tieA", "4.0.0", "traces"), ("tieB", "4.0.0", "traces"), ("api", "6.0.0", "logs"), ("sp`ec'ial", "5.0.0$0", "traces")}, id="explicit_both"),
    ],
)
def test_deployments_signals(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_traces,
    insert_logs,
    signals: list[str] | None,
    expected: set[tuple[str, str, str]],
) -> None:
    """Signal selection: a single signal only ever reports that signal and its ids; the
    deployment id of a tuple is the same whichever signal reports it."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    traces = Traces.load_from_file(get_testdata_file_path("annotations/traces.jsonl"), base_time=now - BASELINE_OFFSET)
    logs = Logs.load_from_file(get_testdata_file_path("annotations/logs.jsonl"), base_time=now - BASELINE_OFFSET)
    insert_traces(traces)
    insert_logs(logs)

    body: dict = {"kind": "deployment", "start": int((now - timedelta(hours=1)).timestamp() * 1000), "end": int(now.timestamp() * 1000), "limit": 50}
    if signals is not None:
        body["signals"] = signals
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.post(signoz.self.host_configs["8080"].get(ENDPOINT), headers={"authorization": f"Bearer {token}"}, json=body, timeout=5)
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert {(r["spec"]["service"], r["spec"]["version"], r["spec"]["signal"]) for r in data["records"]} == expected
    assert data["total"] == len(expected)
    for record in data["records"]:
        spec = record["spec"]
        if spec["signal"] == "traces":
            assert spec["traceId"] and spec["spanId"] and spec["logId"] == ""
        else:
            assert spec["logId"] and spec["traceId"] == "" and spec["spanId"] == ""

    # Same tuple, other signal: same deployment id.
    other = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json={**body, "signals": ["traces"] if signals == ["logs"] else ["logs"]},
        timeout=5,
    )
    assert other.status_code == HTTPStatus.OK, other.text
    ids = {(r["spec"]["service"], r["spec"]["version"]): r["spec"]["id"] for r in data["records"]}
    for record in other.json()["data"]["records"]:
        key = (record["spec"]["service"], record["spec"]["version"])
        if key in ids:
            assert record["spec"]["id"] == ids[key]


@pytest.mark.parametrize(
    ("signals", "edge_offset"),
    [
        pytest.param(None, timedelta(hours=3), id="both_earliest_edge"),
        pytest.param(["traces"], timedelta(hours=3), id="traces_edge"),
        pytest.param(["logs"], timedelta(hours=2), id="logs_edge"),
    ],
)
def test_deployments_history_edge(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_traces,
    insert_logs,
    signals: list[str] | None,
    edge_offset: timedelta,
) -> None:
    """historyAvailableFrom is the bucket after the oldest resource bucket of the queried
    signals; with both signals it is the earlier of the two edges."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_traces(Traces.load_from_file(get_testdata_file_path("annotations/edge_traces.jsonl"), base_time=now - timedelta(hours=3)))
    insert_logs(Logs.load_from_file(get_testdata_file_path("annotations/edge_logs.jsonl"), base_time=now - timedelta(hours=2)))

    body: dict = {"kind": "deployment", "start": int((now - timedelta(hours=1)).timestamp() * 1000), "end": int(now.timestamp() * 1000), "limit": 50}
    if signals is not None:
        body["signals"] = signals
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.post(signoz.self.host_configs["8080"].get(ENDPOINT), headers={"authorization": f"Bearer {token}"}, json=body, timeout=5)
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["historyAvailableFrom"] == (int((now - edge_offset).timestamp()) // 1800 * 1800 + 1800) * 1000
    assert {(r["spec"]["service"], r["spec"]["version"]) for r in data["records"]} == {("checkout", "1.1.0")}


@pytest.mark.parametrize(
    ("expression", "expected"),
    [
        pytest.param("k8s.namespace.name = 'jobs'", {("worker", "3.0.0")}, id="eq"),
        pytest.param("k8s.namespace.name IN ('jobs', 'shop')", ALL_MARKERS, id="in"),
        pytest.param("k8s.namespace.name NOT IN ('shop')", {("worker", "3.0.0")}, id="not_in"),
        pytest.param("service.name CONTAINS 'tie'", {("tieA", "4.0.0"), ("tieB", "4.0.0")}, id="contains"),
        pytest.param("service.name LIKE 'tie%'", {("tieA", "4.0.0"), ("tieB", "4.0.0")}, id="like"),
        pytest.param("k8s.namespace.name = 'shop' AND service.name = 'cart'", {("cart", "2.0.0")}, id="and"),
        pytest.param("service.name = 'cart' OR service.name = 'api'", {("cart", "2.0.0"), ("api", "6.0.0")}, id="or_across_signals"),
        pytest.param("deployment.environment = 'pr$0d'", {("sp`ec'ial", "5.0.0$0")}, id="dollar_in_value"),
        pytest.param('service.name = "sp`ec\'ial"', {("sp`ec'ial", "5.0.0$0")}, id="backtick_quote_in_value"),
        pytest.param("custom.team = 'payments'", ALL_MARKERS, id="custom_resource_attribute"),
        pytest.param("signoz.workspace.key.id = 'key-b'", {("cart", "2.0.0"), ("worker", "3.0.0"), ("api", "6.0.0")}, id="workspace_key"),
        pytest.param("service.name = 'nope'", set(), id="no_match"),
        pytest.param("k8s.namespace.namee = 'jobs'", ALL_MARKERS, id="unresolved_key_noop"),
        pytest.param("http.request.method = 'GET'", ALL_MARKERS, id="span_attribute_noop"),
        pytest.param("", ALL_MARKERS, id="empty_expression"),
    ],
)
def test_deployments_filter(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_traces,
    insert_logs,
    expression: str,
    expected: set[tuple[str, str]],
) -> None:
    """Filters apply to resource attributes on both signals; keys that are not resource
    attributes compile to nothing and leave the result unfiltered."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_traces(Traces.load_from_file(get_testdata_file_path("annotations/traces.jsonl"), base_time=now - BASELINE_OFFSET))
    insert_logs(Logs.load_from_file(get_testdata_file_path("annotations/logs.jsonl"), base_time=now - BASELINE_OFFSET))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json={"kind": "deployment", "start": int((now - timedelta(hours=1)).timestamp() * 1000), "end": int(now.timestamp() * 1000), "limit": 50, "filter": {"expression": expression}},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert {(r["spec"]["service"], r["spec"]["version"]) for r in data["records"]} == expected
    assert data["total"] == len(expected)


@pytest.mark.parametrize(
    "expression",
    [
        pytest.param("service.name =", id="trailing_op"),
        pytest.param("(service.name = 'cart'", id="unclosed_paren"),
    ],
)
def test_deployments_filter_invalid(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    expression: str,
) -> None:
    now = datetime.now(tz=UTC).replace(microsecond=0)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json={"kind": "deployment", "start": int((now - timedelta(hours=1)).timestamp() * 1000), "end": int(now.timestamp() * 1000), "limit": 50, "filter": {"expression": expression}},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "syntax error" in response.json()["error"]["message"]


@pytest.mark.parametrize(
    ("limit", "expected_len"),
    [
        pytest.param(1, 1, id="below_count"),
        pytest.param(7, 7, id="equals_count"),
        pytest.param(5000, 7, id="above_count"),
    ],
)
def test_deployments_limit(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_traces,
    insert_logs,
    limit: int,
    expected_len: int,
) -> None:
    """limit truncates the merged, ordered list; total always counts every marker."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_traces(Traces.load_from_file(get_testdata_file_path("annotations/traces.jsonl"), base_time=now - BASELINE_OFFSET))
    insert_logs(Logs.load_from_file(get_testdata_file_path("annotations/logs.jsonl"), base_time=now - BASELINE_OFFSET))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json={"kind": "deployment", "start": int((now - timedelta(hours=1)).timestamp() * 1000), "end": int(now.timestamp() * 1000), "limit": limit},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert len(data["records"]) == expected_len
    assert data["total"] == len(ALL_MARKERS)
    assert (data["records"][0]["spec"]["service"], data["records"][0]["spec"]["version"]) == ("checkout", "1.1.0")
    assert [r["spec"]["firstSeen"] for r in data["records"]] == sorted(r["spec"]["firstSeen"] for r in data["records"])


@pytest.mark.parametrize(
    ("overrides", "message"),
    [
        pytest.param({"kind": None}, "invalid kind", id="kind_missing"),
        pytest.param({"kind": "release"}, "invalid kind", id="kind_unknown"),
        pytest.param({"start": 0}, "start must be greater than 0", id="start_zero"),
        pytest.param({"start": -1}, "start must be greater than 0", id="start_negative"),
        pytest.param({"end": 0}, "end must be greater than 0", id="end_zero"),
        pytest.param({"end": "same"}, "must be less than end", id="start_equals_end"),
        pytest.param({"end": "before"}, "must be less than end", id="start_greater_than_end"),
        pytest.param({"signals": ["metrics"]}, "invalid signal", id="signal_unknown"),
        pytest.param({"limit": None}, "limit must be between", id="limit_missing"),
        pytest.param({"limit": 0}, "limit must be between", id="limit_zero"),
        pytest.param({"limit": -1}, "limit must be between", id="limit_negative"),
        pytest.param({"limit": 5001}, "limit must be between", id="limit_too_large"),
    ],
)
def test_deployments_validation_errors(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    overrides: dict,
    message: str,
) -> None:
    now = datetime.now(tz=UTC).replace(microsecond=0)
    body: dict = {"kind": "deployment", "start": int((now - timedelta(hours=1)).timestamp() * 1000), "end": int(now.timestamp() * 1000), "limit": 50}
    for key, value in overrides.items():
        if value is None:
            body.pop(key)
        elif value == "same":
            body[key] = body["start"]
        elif value == "before":
            body[key] = body["start"] - 1
        else:
            body[key] = value

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.post(signoz.self.host_configs["8080"].get(ENDPOINT), headers={"authorization": f"Bearer {token}"}, json=body, timeout=5)
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert message in response.json()["error"]["message"]


def test_deployments_malformed_body(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}", "content-type": "application/json"},
        data='{"kind": "deployment", "start": ',
        timeout=5,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
