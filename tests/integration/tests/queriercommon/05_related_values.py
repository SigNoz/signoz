from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.fs import get_testdata_file_path
from fixtures.logs import Logs
from fixtures.metadata import AttributesMetadata
from fixtures.metrics import Metrics
from fixtures.traces import Traces

# Related values (/api/v1/fields/values with existingQuery) are served from the
# shared signoz_metadata.attributes_metadata table, scoped by data_source =
# signal. One dataset (queriercommon/related_values.jsonl) drives every scenario:
#   - Filter attributes (namespace/statefulset/cluster) are identical across
#     data_sources, so the same existingQuery matches under any signal.
#   - Target values (k8s.pod.name / host.name) are suffixed per data_source, so
#     the returned set differs by signal -> every scenario also proves the
#     data_source scoping (no cross-signal leakage).
DATASET = "queriercommon/related_values.jsonl"


@pytest.fixture(name="seed_related_values", scope="function")
def seed_related_values(
    insert_attributes_metadata: Callable[[list[AttributesMetadata]], None],
    insert_logs: Callable[[list[Logs]], None],
    insert_traces: Callable[[list[Traces]], None],
    insert_metrics: Callable[[list[Metrics]], None],
) -> datetime:
    now = datetime.now(tz=UTC)

    # values queried by related-values come from attributes_metadata
    insert_attributes_metadata(AttributesMetadata.load_from_file(get_testdata_file_path(DATASET), timestamp=now))

    # existingQuery key resolution reads each signal's own keys tables, not
    # attributes_metadata; register the filter keys (namespace/statefulset/
    # cluster) as resource keys for all three signals. These rows do not write
    # to attributes_metadata, so they never leak into the related values.
    reg_res = {
        "k8s.cluster.name": "c1",
        "k8s.namespace.name": "reg-ns",
        "k8s.statefulset.name": "reg-sts",
    }
    insert_logs([Logs(timestamp=now, resources=reg_res, body="reg")])
    insert_traces([Traces(timestamp=now, resources=reg_res)])
    insert_metrics([Metrics(metric_name="reg_metric", timestamp=now, value=1.0, resource_attributes=reg_res)])

    return now


@pytest.mark.parametrize(
    "signal,name,existing_query,search_text,expected",
    [
        pytest.param(
            "logs",
            "k8s.pod.name",
            "k8s.namespace.name = 'ns-a'",
            "",
            {"podA1-logs", "podA2-logs"},
            id="positive_equal_excludes_missing_key",
        ),
        pytest.param(
            "metrics",
            "k8s.pod.name",
            "k8s.namespace.name IN ['ns-a', 'ns-b']",
            "",
            {"podA1-metrics", "podA2-metrics", "podB1-metrics"},
            id="positive_in",
        ),
        pytest.param(
            "traces",
            "k8s.pod.name",
            "k8s.statefulset.name NOT IN ['sts-a']",
            "",
            {"podA2-traces", "podB1-traces", "podOrphan-traces"},
            id="negative_not_in_keeps_missing_key",
        ),
        pytest.param(
            "metrics",
            "k8s.pod.name",
            "k8s.namespace.name != 'ns-a'",
            "",
            {"podB1-metrics", "podOrphan-metrics"},
            id="negative_not_equal_keeps_missing_key",
        ),
        pytest.param(
            "logs",
            "k8s.pod.name",
            "k8s.namespace.name IN ['ns-a'] AND k8s.statefulset.name NOT IN ['sts-a']",
            "",
            {"podA2-logs"},
            id="mixed_positive_and_negative_and",
        ),
        pytest.param(
            "traces",
            "k8s.pod.name",
            "k8s.statefulset.name EXISTS",
            "",
            {"podA1-traces"},
            id="positive_exists",
        ),
        pytest.param(
            "logs",
            "k8s.pod.name",
            "k8s.statefulset.name NOT EXISTS",
            "",
            {"podA2-logs", "podB1-logs", "podOrphan-logs", "podEmpty-logs"},
            id="negative_not_exists_keeps_missing_key",
        ),
        pytest.param(
            "logs",
            "host.name",
            "k8s.cluster.name = 'c1'",
            "host",
            {"host-res-logs", "host-attr-logs"},
            id="dual_context_search_text_or",
        ),
        pytest.param(
            "metrics",
            "host.name",
            "k8s.cluster.name = 'c1'",
            "host",
            {"host-res-metrics", "host-attr-metrics"},
            id="dual_context_search_text_signal_scoped",
        ),
        pytest.param(
            "logs",
            "host.name",
            "k8s.cluster.name = 'c1'",
            "HOST-RES",
            {"host-res-logs"},
            id="search_text_case_insensitive",
        ),
        pytest.param(
            "logs",
            "k8s.pod.name",
            "k8s.namespace.name != 'ns-a'",
            "",
            {"podB1-logs", "podOrphan-logs", "podEmpty-logs"},
            id="empty_value_and_absent_key_both_kept_on_negative",
        ),
        pytest.param(
            None,
            "k8s.pod.name",
            "k8s.namespace.name = 'ns-a'",
            "",
            {
                "podA1-logs",
                "podA2-logs",
                "podA1-traces",
                "podA2-traces",
                "podA1-metrics",
                "podA2-metrics",
            },
            id="unspecified_signal_unions_all_data_sources",
        ),
    ],
)
def test_related_values(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    seed_related_values: datetime,
    signal: str | None,
    name: str,
    existing_query: str,
    search_text: str,
    expected: set[str],
) -> None:
    now = seed_related_values
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    params = {
        "name": name,
        "searchText": search_text,
        "existingQuery": existing_query,
        "startUnixMilli": int((now - timedelta(hours=1)).timestamp() * 1000),
        "endUnixMilli": int((now + timedelta(hours=1)).timestamp() * 1000),
    }
    # omit signal entirely for the unspecified-signal scenario
    if signal is not None:
        params["signal"] = signal

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/values"),
        timeout=5,
        headers={"authorization": f"Bearer {token}"},
        params=params,
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    related = response.json()["data"]["values"].get("relatedValues") or []
    assert set(related) == expected
