import pytest
import requests

from fixtures import types

CONSTRAINED_PROFILE = "<max_result_rows>10</max_result_rows><max_threads>3</max_threads><constraints><max_result_rows><min>1</min><max>100</max></max_result_rows><max_threads><const/></max_threads></constraints>"


def test_profile_holds_without_query_settings(clickhouse: types.TestContainerClickhouse, clickhouse_settings_profile) -> None:
    clickhouse_settings_profile("integration_constrained", CONSTRAINED_PROFILE)
    http = clickhouse.container.host_configs["8123"]

    for query in [
        "SELECT getSetting('max_result_rows')",
        "SELECT getSetting('max_result_rows') SETTINGS profile = 'default'",
    ]:
        response = requests.post(
            f"http://{http.address}:{http.port}/",
            params={"profile": "integration_constrained"},
            data=query,
            auth=(clickhouse.env["SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_USERNAME"], clickhouse.env["SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_PASSWORD"]),
            timeout=10,
        )
        assert response.status_code == 200, response.text
        assert response.text.strip() == "10", query


@pytest.mark.parametrize(
    "settings",
    [
        "max_result_rows = 1000",
        "max_result_rows = 0",
        "max_threads = 8",
        "profile = 'default', max_result_rows = 1000",
        "max_result_rows = 1000, profile = 'default'",
        "profile = 'integration_loose'",
    ],
    ids=[
        "above_max",
        "zero_is_unlimited",
        "const_changed",
        "switch_profile_then_raise",
        "raise_then_switch_profile",
        "switch_to_looser_profile",
    ],
)
def test_query_settings_cannot_escape_profile(clickhouse: types.TestContainerClickhouse, clickhouse_settings_profile, settings: str) -> None:
    clickhouse_settings_profile("integration_constrained", CONSTRAINED_PROFILE)
    clickhouse_settings_profile("integration_loose", "<max_result_rows>0</max_result_rows>")
    http = clickhouse.container.host_configs["8123"]

    response = requests.post(
        f"http://{http.address}:{http.port}/",
        params={"profile": "integration_constrained"},
        data=f"SELECT getSetting('max_result_rows') SETTINGS {settings}",
        auth=(clickhouse.env["SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_USERNAME"], clickhouse.env["SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_PASSWORD"]),
        timeout=10,
    )

    assert response.status_code != 200, response.text
    assert "SETTING_CONSTRAINT_VIOLATION" in response.text, response.text
