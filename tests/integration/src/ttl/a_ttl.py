"""
Summary:
This test file contains integration tests for Time-To-Live (TTL) and custom retention policies in SigNoz's query service.
It verifies the correct behavior of TTL settings for traces, metrics, and logs, including support for cold storage, custom retention conditions, error handling for invalid configurations, and retrieval of TTL settings.
"""

import time
from http import HTTPStatus
from typing import Callable

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logger import setup_logger
from fixtures.logs import Logs

logger = setup_logger(__name__)


@pytest.fixture(name="ttl_test_suite_setup", scope="package", autouse=True)
def ttl_test_suite_setup(create_user_admin):  # pylint: disable=unused-argument
    # This fixture creates a admin user for the entire ttl test suite
    # The create_user_admin fixture is executed just by being a dependency
    print("Setting up ttl test suite")
    yield


def test_set_ttl_traces_success(
    signoz: types.SigNoz, get_token: Callable[[str, str], str]
):
    """Test setting TTL for traces with new ttlConfig structure."""
    payload = {
        "type": "traces",
        "duration": "3600h",
    }

    headers = {
        "Authorization": f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"
    }

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/settings/ttl"),
        params=payload,
        headers=headers,
        timeout=30,
    )

    assert response.status_code == HTTPStatus.OK
    response_data = response.json()
    assert "message" in response_data
    assert "successfully set up" in response_data["message"].lower()

    # Verify TTL settings in Clickhouse
    # Allow some time for the TTL to be applied
    time.sleep(2)

    # Check TTL settings on relevant tables
    tables_to_check = [
        "signoz_index_v3",
        "traces_v3_resource",
        "signoz_error_index_v2",
        "usage_explorer",
        "dependency_graph_minutes_v2",
        "trace_summary",
        "span_attributes_keys",
    ]

    # Query to get table engine info which includes TTL
    table_list = ", ".join(f"'{table}'" for table in tables_to_check)
    query = f"SELECT engine_full FROM system.tables WHERE table in [{table_list}]"

    result = signoz.telemetrystore.conn.query(query).result_rows

    # Verify TTL exists in all table definitions
    assert all("TTL" in r[0] for r in result)

    assert all(" SETTINGS" in r[0] for r in result)

    ttl_parts = [r[0].split("TTL ")[1].split(" SETTINGS")[0] for r in result]
    # All TTLs should include toIntervalSecond(12960000) which is 3600h
    assert all("toIntervalSecond(12960000)" in ttl_part for ttl_part in ttl_parts)


def test_set_ttl_traces_with_cold_storage(signoz: types.SigNoz, get_token: Callable[[str, str], str]):
    """Test setting TTL for traces with cold storage configuration."""
    payload = {
        "type": "traces",
        "duration": f"{90*24}h",  # 90 days in hours
        "coldStorageVolume": "cold_storage_vol",
        "toColdStorageDuration": f"{30*24}h",  # 30 days in hours
    }

    headers = {
        "Authorization": f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"
    }

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/settings/ttl"),
        params=payload,
        headers=headers,
        timeout=30,
    )

    assert response.status_code == HTTPStatus.OK
    response_data = response.json()
    assert "message" in response_data
    assert "successfully set up" in response_data["message"].lower()


def test_set_ttl_metrics_success(
    signoz: types.SigNoz, get_token: Callable[[str, str], str]
):
    """Test setting TTL for metrics using the new setTTLMetrics method."""
    payload = {
        "type": "metrics",
        "duration": f"{90*24}h",  # 90 days in hours
        "coldStorageVolume": "",
        "toColdStorageDuration": 0,
    }

    headers = {
        "Authorization": f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"
    }

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/settings/ttl"),
        params=payload,
        headers=headers,
        timeout=30,
    )

    assert response.status_code == HTTPStatus.OK
    response_data = response.json()
    assert "message" in response_data
    assert "successfully set up" in response_data["message"].lower()

    # Verify TTL settings in Clickhouse
    # Allow some time for the TTL to be applied
    time.sleep(2)

    # Check TTL settings on relevant metrics tables
    tables_to_check = [
        "samples_v4",
        "samples_v4_agg_5m",
        "samples_v4_agg_30m",
        "time_series_v4",
        "time_series_v4_6hrs",
        "time_series_v4_1day",
        "time_series_v4_1week",
    ]

    # Query to get table engine info which includes TTL
    table_list = "', '".join(tables_to_check)
    query = f"SELECT engine_full FROM system.tables WHERE table in ['{table_list}']"

    result = signoz.telemetrystore.conn.query(query).result_rows

    # Verify TTL exists in all table definitions
    assert all("TTL" in r[0] for r in result)

    assert all(" SETTINGS" in r[0] for r in result)

    ttl_parts = [r[0].split("TTL ")[1].split(" SETTINGS")[0] for r in result]

    # All TTLs should include toIntervalSecond(7776000) which is 90*24h
    assert all("toIntervalSecond(7776000)" in ttl_part for ttl_part in ttl_parts)


def test_set_ttl_metrics_with_cold_storage(
    signoz: types.SigNoz, get_token: Callable[[str, str], str]
):
    """Test setting TTL for metrics with cold storage configuration."""
    payload = {
        "type": "metrics",
        "duration": f"{90*24}h",  # 90 days in hours
        "coldStorageVolume": "metrics_cold_vol",
        "toColdStorageDuration": f"{20*24}h",  # 20 days in hours
    }

    headers = {
        "Authorization": f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"
    }

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/settings/ttl"),
        params=payload,
        headers=headers,
        timeout=30,
    )

    assert response.status_code == HTTPStatus.OK
    response_data = response.json()
    assert "message" in response_data
    assert "successfully set up" in response_data["message"].lower()


def test_set_ttl_invalid_type(
    signoz: types.SigNoz, get_token: Callable[[str, str], str]
):
    """Test setting TTL with invalid type returns error."""
    payload = {
        "type": "invalid_type",
        "duration": f"{90*24}h",
        "coldStorageVolume": "",
        "toColdStorageDuration": 0,
    }

    headers = {
        "Authorization": f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"
    }

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/settings/ttl"),
        params=payload,
        headers=headers,
        timeout=30,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_set_custom_retention_ttl_basic(
    signoz: types.SigNoz, get_token: Callable[[str, str], str]
):
    """Test setting custom retention TTL with basic configuration."""
    payload = {
        "type": "logs",
        "defaultTTLDays": 100,
        "ttlConditions": [],
        "coldStorageVolume": "",
        "coldStorageDurationDays": 0,
    }

    headers = {
        "Authorization": f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"
    }

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/settings/ttl"),
        json=payload,
        headers=headers,
        timeout=30,
    )

    assert response.status_code == HTTPStatus.OK
    response_data = response.json()
    assert "message" in response_data

    # Verify TTL settings in Clickhouse
    # Allow some time for the TTL to be applied
    time.sleep(2)

    # Check TTL settings on relevant tables
    tables_to_check = [
        "logs_v2",
        "logs_v2_resource",
    ]

    # Query to get table engine info which includes TTL
    table_list = "', '".join(tables_to_check)
    query = f"SELECT engine_full FROM system.tables WHERE table in ['{table_list}']"
    result = signoz.telemetrystore.conn.query(query).result_rows

    # Verify TTL exists in all table definitions
    assert all("TTL" in r[0] for r in result)

    assert all(" SETTINGS" in r[0] for r in result)

    ttl_parts = [r[0].split("TTL ")[1].split(" SETTINGS")[0] for r in result]

    # Also verify the TTL parts contain retention_days
    assert all("_retention_days" in ttl_part for ttl_part in ttl_parts)

    # Query to describe tables and check retention_days column
    for table in tables_to_check:
        describe_query = f"DESCRIBE TABLE signoz_logs.{table}"
        describe_result = signoz.telemetrystore.conn.query(describe_query).result_rows

        # Find the _retention_days column
        retention_col = next(
            (row for row in describe_result if row[0] == "_retention_days"), None
        )
        assert (
            retention_col is not None
        ), f"_retention_days column not found in table {table}"
        assert (
            retention_col[1] == "UInt16"
        ), f"Expected _retention_days to be UInt16 in table {table}, but got {retention_col[1]}"
        assert (
            retention_col[3] == "100"
        ), f"Expected default value of _retention_days to be 100 in table {table}, but got {retention_col[3]}"

    tables_to_check = [
        "logs_attribute_keys",
        "logs_resource_keys"
    ]

    # Query to get table engine info which includes TTL
    table_list = "', '".join(tables_to_check)
    query = f"SELECT engine_full FROM system.tables WHERE table in ['{table_list}']"
    result = signoz.telemetrystore.conn.query(query).result_rows

    # Verify TTL exists in all table definitions
    assert all("TTL" in r[0] for r in result)

    assert all(" SETTINGS" in r[0] for r in result)

    ttl_parts = [r[0].split("TTL ")[1].split(" SETTINGS")[0] for r in result]

    # Also verify the TTL parts contain retention_days
    assert all("toIntervalDay(100)" in ttl_part for ttl_part in ttl_parts)


def test_set_custom_retention_ttl_basic_fallback(
    signoz: types.SigNoz,
    get_token,
    ttl_legacy_logs_v2_table_setup, # pylint: disable=unused-argument
    ttl_legacy_logs_v2_resource_table_setup, # pylint: disable=unused-argument
):
    """Test setting TTL for logs using the new setTTLLogs method."""

    payload = {
        "type": "logs",
        "defaultTTLDays": 100,
        "ttlConditions": [],
        "coldStorageVolume": "",
        "coldStorageDurationDays": 0,
    }

    headers = {
        "Authorization": f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"
    }

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/settings/ttl"),
        json=payload,
        headers=headers,
        timeout=30,
    )

    assert response.status_code == HTTPStatus.OK
    response_data = response.json()
    assert "message" in response_data
    assert "successfully set up" in response_data["message"].lower()

    # Verify TTL settings in Clickhouse
    # Allow some time for the TTL to be applied
    time.sleep(2)

    # Check TTL settings on relevant logs tables
    tables_to_check = [
        "logs_v2",
        "logs_v2_resource",
        "logs_attribute_keys",
        "logs_resource_keys"
    ]

    # Query to get table engine info which includes TTL
    table_list = "', '".join(tables_to_check)
    query = f"SELECT engine_full FROM system.tables WHERE table in ['{table_list}']"

    result = signoz.telemetrystore.conn.query(query).result_rows

    # Verify TTL exists in all table definitions
    assert all("TTL" in r[0] for r in result)

    assert all(" SETTINGS" in r[0] for r in result)

    ttl_parts = [r[0].split("TTL ")[1].split(" SETTINGS")[0] for r in result]

    # All TTLs should include toIntervalSecond(8640000) which is 100 days
    assert all("toIntervalSecond(8640000)" in ttl_part for ttl_part in ttl_parts)


def test_set_custom_retention_ttl_basic_101_times(signoz: types.SigNoz, get_token):
    """Test setting custom retention TTL with basic configuration to trigger housekeeping."""

    for _ in range(101):
        payload = {
            "type": "logs",
            "defaultTTLDays": 100,
            "ttlConditions": [],
            "coldStorageVolume": "",
            "coldStorageDurationDays": 0,
        }

        headers = {
            "Authorization": f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"
        }

        response = requests.post(
            signoz.self.host_configs["8080"].get("/api/v2/settings/ttl"),
            json=payload,
            headers=headers,
            timeout=30,
        )

        assert response.status_code == HTTPStatus.OK
        response_data = response.json()
        assert "message" in response_data

    # Check TTL settings on relevant tables
    tables_to_check = [
        "logs_v2",
        "logs_v2_resource",
    ]

    # Query to get table engine info which includes TTL
    table_list = "', '".join(tables_to_check)
    query = f"SELECT engine_full FROM system.tables WHERE table in ['{table_list}']"
    result = signoz.telemetrystore.conn.query(query).result_rows

    # Verify TTL exists in all table definitions
    assert all("TTL" in r[0] for r in result)

    assert all(" SETTINGS" in r[0] for r in result)

    ttl_parts = [r[0].split("TTL ")[1].split(" SETTINGS")[0] for r in result]

    # Also verify the TTL parts contain retention_days
    assert all("_retention_days" in ttl_part for ttl_part in ttl_parts)

    # Query to describe tables and check retention_days column
    for table in tables_to_check:
        describe_query = f"DESCRIBE TABLE signoz_logs.{table}"
        describe_result = signoz.telemetrystore.conn.query(describe_query).result_rows

        # Find the _retention_days column
        retention_col = next(
            (row for row in describe_result if row[0] == "_retention_days"), None
        )
        assert (
            retention_col is not None
        ), f"_retention_days column not found in table {table}"
        assert (
            retention_col[1] == "UInt16"
        ), f"Expected _retention_days to be UInt16 in table {table}, but got {retention_col[1]}"
        assert (
            retention_col[3] == "100"
        ), f"Expected default value of _retention_days to be 100 in table {table}, but got {retention_col[3]}"


def test_set_custom_retention_ttl_with_conditions(
    signoz: types.SigNoz, get_token: Callable[[str, str], str], insert_logs
):
    """Test setting custom retention TTL with filter conditions."""

    payload = {
        "type": "logs",
        "defaultTTLDays": 30,
        "ttlConditions": [
            {
                "conditions": [
                    {"key": "service_name", "values": ["frontend", "backend"]}
                ],
                "ttlDays": 60,
            }
        ],
        "coldStorageVolume": "",
        "coldStorageDurationDays": 0,
    }

    headers = {
        "Authorization": f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"
    }

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/settings/ttl"),
        json=payload,
        headers=headers,
        timeout=30,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST

    # Need to ensure that "severity" and "service_name" keys exist in logsAttributeKeys table
    # Insert some logs with these attribute keys

    logs = [
        Logs(resources={"service_name": "frontend"}, severity_text="ERROR"),
        Logs(resources={"service_name": "backend"}, severity_text="FATAL"),
    ]
    insert_logs(logs)
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/settings/ttl"),
        json=payload,
        headers=headers,
        timeout=30,
    )
    assert response.status_code == HTTPStatus.OK
    response_data = response.json()
    assert "message" in response_data


def test_set_custom_retention_ttl_with_cold_storage(
    signoz: types.SigNoz, get_token: Callable[[str, str], str], insert_logs
):
    """Test setting custom retention TTL with cold storage configuration."""
    payload = {
        "type": "logs",
        "defaultTTLDays": 60,
        "ttlConditions": [
            {
                "conditions": [{"key": "environment", "values": ["production"]}],
                "ttlDays": 180,
            }
        ],
        "coldStorageVolume": "logs_cold_storage",
        "coldStorageDurationDays": 30,  # 30 days to cold storage
    }
    # Insert some logs with these attribute keys

    logs = [
        Logs(resources={"environment": "production"}, severity_text="ERROR"),
    ]
    insert_logs(logs)

    headers = {
        "Authorization": f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"
    }

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/settings/ttl"),
        json=payload,
        headers=headers,
        timeout=30,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    response_data = response.json()
    assert "error" in response_data
    assert "message" in response_data["error"]
    assert "Unknown storage policy `tiered`" in response_data["error"]["message"]


def test_set_custom_retention_ttl_duplicate_conditions(
    signoz: types.SigNoz, get_token: Callable[[str, str], str]
):
    """Test that duplicate TTL conditions are rejected."""
    payload = {
        "type": "logs",
        "defaultTTLDays": 30,
        "ttlConditions": [
            {
                "conditions": [{"key": "service_name", "values": ["frontend"]}],
                "ttlDays": 60,
            },
            {
                "conditions": [
                    {
                        "key": "service_name",
                        "values": ["frontend"],  # Duplicate condition
                    }
                ],
                "ttlDays": 90,
            },
        ],
        "coldStorageVolume": "",
        "coldStorageDurationDays": 0,
    }

    headers = {
        "Authorization": f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"
    }

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/settings/ttl"),
        json=payload,
        headers=headers,
        timeout=30,
    )

    # Should return error for duplicate conditions
    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_set_custom_retention_ttl_invalid_condition(
    signoz: types.SigNoz, get_token: Callable[[str, str], str]
):
    """Test that conditions with empty values are rejected."""
    payload = {
        "type": "logs",
        "defaultTTLDays": 30,
        "ttlConditions": [
            {
                "conditions": [
                    {
                        "key": "service_name",
                        "values": [],  # Empty values should be rejected
                    }
                ],
                "ttlDays": 60,
            }
        ],
        "coldStorageVolume": "",
        "coldStorageDurationDays": 0,
    }

    headers = {
        "Authorization": f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"
    }

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/settings/ttl"),
        json=payload,
        headers=headers,
        timeout=30,
    )

    # Should return error for empty condition values
    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_get_custom_retention_ttl(
    signoz: types.SigNoz, get_token: Callable[[str, str], str], insert_logs
):
    """Test getting custom retention TTL configuration."""
    # First set a custom retention TTL
    set_payload = {
        "type": "logs",
        "defaultTTLDays": 45,
        "ttlConditions": [
            {
                "conditions": [{"key": "service_name", "values": ["test-service"]}],
                "ttlDays": 90,
            }
        ],
        "coldStorageVolume": "",
        "coldStorageDurationDays": 0,
    }

    # Insert some logs with these attribute keys
    logs = [
        Logs(resources={"service_name": "test-service"}, severity_text="ERROR"),
    ]
    insert_logs(logs)

    headers = {
        "Authorization": f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"
    }
    set_response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/settings/ttl"),
        json=set_payload,
        headers=headers,
        timeout=30,
    )
    assert set_response.status_code == HTTPStatus.OK

    # Allow some time for the TTL to be processed
    time.sleep(2)

    # Now get the TTL configuration
    headers = {
        "Authorization": f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"
    }

    get_response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/settings/ttl"),
        params={"type": "logs"},
        headers=headers,
        timeout=30,
    )

    response_data = get_response.json()

    # Verify the response contains expected fields
    assert response_data["status"] == "success"
    assert response_data["default_ttl_days"] == 45
    assert response_data["cold_storage_ttl_days"] == -1
    assert response_data["ttl_conditions"][0]["ttlDays"] == 90
    assert response_data["ttl_conditions"][0]["conditions"][0]["key"] == "service_name"
    assert response_data["ttl_conditions"][0]["conditions"][0]["values"] == [
        "test-service"
    ]


def test_set_ttl_logs_success(
    signoz: types.SigNoz,
    get_token,
    ttl_legacy_logs_v2_table_setup,# pylint: disable=unused-argument
    ttl_legacy_logs_v2_resource_table_setup,# pylint: disable=unused-argument
):
    """Test setting TTL for logs using the new setTTLLogs method."""

    payload = {
        "type": "logs",
        "duration": "3600h",
    }

    headers = {
        "Authorization": f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"
    }

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/settings/ttl"),
        params=payload,
        headers=headers,
        timeout=30,
    )

    assert response.status_code == HTTPStatus.OK
    response_data = response.json()
    assert "message" in response_data
    assert "successfully set up" in response_data["message"].lower()

    # Verify TTL settings in Clickhouse
    # Allow some time for the TTL to be applied
    time.sleep(5)

    # Check TTL settings on relevant logs tables
    tables_to_check = [
        "logs_v2",
        "logs_v2_resource",
    ]

    # Query to get table engine info which includes TTL
    table_list = "', '".join(tables_to_check)
    query = f"SELECT engine_full FROM system.tables WHERE table in ['{table_list}']"

    result = signoz.telemetrystore.conn.query(query).result_rows

    # Verify TTL exists in all table definitions
    assert all("TTL" in r[0] for r in result)

    assert all(" SETTINGS" in r[0] for r in result)

    ttl_parts = [r[0].split("TTL ")[1].split(" SETTINGS")[0] for r in result]

    # All TTLs should include toIntervalSecond(12960000) which is 3600h
    assert all("toIntervalSecond(12960000)" in ttl_part for ttl_part in ttl_parts)


def test_get_ttl_traces_success(
    signoz: types.SigNoz, get_token: Callable[[str, str], str]
):
    """Test getting TTL for traces."""
    # First set a TTL configuration for traces
    set_payload = {
        "type": "traces",
        "duration": "720h",  # 30 days in hours
    }

    headers = {
        "Authorization": f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"
    }

    set_response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/settings/ttl"),
        params=set_payload,
        headers=headers,
        timeout=30,
    )

    assert set_response.status_code == HTTPStatus.OK

    # Allow some time for the TTL to be processed
    time.sleep(2)

    # Now get the TTL configuration for traces
    get_response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/settings/ttl"),
        params={"type": "traces"},
        headers=headers,
        timeout=30,
    )

    assert get_response.status_code == HTTPStatus.OK
    response_data = get_response.json()

    # Verify the response contains expected fields and values
    assert response_data["status"] == "success"
    assert "traces_ttl_duration_hrs" in response_data
    assert "traces_move_ttl_duration_hrs" in response_data
    assert (
        response_data["traces_ttl_duration_hrs"] == 720
    )  # Note: response is in hours as integer
    assert (
        response_data["traces_move_ttl_duration_hrs"] == -1
    )  # -1 indicates no cold storage configured


def test_large_ttl_conditions_list(
    signoz: types.SigNoz, get_token: Callable[[str, str], str], insert_logs
):
    """Test custom retention TTL with many conditions."""
    # Create a list of many TTL conditions to test performance and limits
    conditions = []
    for i in range(10):  # Test with 10 conditions
        conditions.append(
            {
                "conditions": [{"key": "service_name", "values": [f"service-{i}"]}],
                "ttlDays": 30 + (i * 10),
            }
        )

    logs = [
        Logs(resources={"service_name": f"service-{i}"}, severity_text="ERROR")
        for i in range(10)
    ]
    insert_logs(logs)

    payload = {
        "type": "logs",
        "defaultTTLDays": 30,
        "ttlConditions": conditions,
        "coldStorageVolume": "",
        "coldStorageDurationDays": 0,
    }

    headers = {
        "Authorization": f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"
    }

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/settings/ttl"),
        json=payload,
        headers=headers,
        timeout=30,
    )

    assert response.status_code == HTTPStatus.OK
    response_data = response.json()
    assert "message" in response_data
