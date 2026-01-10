"""
Summary:
This test file contains integration tests for Time-To-Live (TTL) and custom retention policies
in SigNoz's query service. It verifies the correct behavior of TTL settings for traces, metrics,
and logs, including support for cold storage, custom retention conditions, error handling for
invalid configurations, and retrieval of TTL settings.
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

"""
Helper functions to verify TTL and partition settings in Clickhouse tables.
NOTE: These functions only works when last inserted data is in the latest partition.
"""


def verify_table_partition_expressions(
    signoz: types.SigNoz,
    expected_partition_expressions_map: dict[str, tuple[int, int, int]],
):
    """
    Verify table partitions exist with data and have correct retention values.

    Args:
        signoz: SigNoz fixture providing access to telemetry store
        expected_partition_expressions_map: Dictionary mapping table names to expected count of partitions
                            Example: {"logs_v2": (10, 15, 1), "logs_v2_resource": (10, 15, 1)}
    """

    time.sleep(2)  # Wait for partitions to be created
    for table in expected_partition_expressions_map:
        # Query to check if ANY row exists with the expected retention values
        # This verifies that data was inserted into a partition with the correct TTL
        retention, retention_cold, count = expected_partition_expressions_map[table]

        retention_query = (
            f"SELECT COUNT(*) FROM {table} "
            f"WHERE _retention_days = {retention} AND _retention_days_cold = {retention_cold}"
        )
        retention_result = signoz.telemetrystore.conn.query(retention_query).result_rows

        assert retention_result[0][0] == count, (
            f"No data found with retention values '{retention}, {retention_cold}' in table {table}. "
            f"Expected at least one row with these retention settings."
        )

        partition_query = (
            "SELECT rows FROM system.parts "
            f"WHERE `table` = '{table.split('.')[-1]}' AND active = 1 AND partition LIKE '%{retention},{retention_cold}%' "
            "ORDER BY partition ASC"
        )

        partition_result = signoz.telemetrystore.conn.query(partition_query).result_rows
        assert (
            len(partition_result) >= 1
        ), f"No active partitions found for table {table}"

        assert partition_result[0][0] >= count


def verify_table_retention_expression(
    signoz: types.SigNoz, table_expected_retention_expression_map: dict[str, str]
):
    """
    Verify table partitions exist with data and have correct retention values.

    Args:
        signoz: SigNoz fixture providing access to telemetry store
        table_expected_retention_expression_map: Dictionary mapping table names to expected retention expressions
            Example: {"logs_v2": "created_at + INTERVAL 100 DAY", "logs_v2_resource": "created_at + INTERVAL 100 DAY"}
    """

    for table in table_expected_retention_expression_map:
        query = f"SELECT engine_full FROM system.tables WHERE table = '{table}'"
        result = signoz.telemetrystore.conn.query(query).result_rows
        assert len(result) == 1, f"Table {table} not found in system.tables"

        assert all("TTL" in r[0] for r in result)

        assert all(" SETTINGS" in r[0] for r in result)

        ttl_part = result[0][0].split("TTL ")[1].split(" SETTINGS")[0]
        assert table_expected_retention_expression_map[table] in ttl_part, (
            f"Expected retention expression {table_expected_retention_expression_map[table]} "
            f"not found in table {table} TTL part {ttl_part}"
        )


@pytest.fixture(name="ttl_test_suite_setup", scope="package", autouse=True)
def ttl_test_suite_setup(create_user_admin):  # pylint: disable=unused-argument
    # This fixture creates a admin user for the entire ttl test suite
    # The create_user_admin fixture is executed just by being a dependency
    print("Setting up ttl test suite")
    yield


def test_set_ttl_traces_success(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    remove_traces_ttl_and_storage_settings,  # pylint: disable=unused-argument
):
    """Test setting TTL for traces with new ttlConfig structure."""

    test_duration_hours = 3601  # 3601 hours

    payload = {
        "type": "traces",
        "duration": f"{test_duration_hours}h",  # Don't choose a round number to avoid matching any residual test data
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

    # Allow some time for the TTL to be applied
    time.sleep(2)

    verify_table_retention_expression(
        signoz,
        {
            "signoz_index_v3": f"toIntervalSecond({test_duration_hours*3600})",  # 3601 hours in seconds
            "traces_v3_resource": f"toIntervalSecond({test_duration_hours*3600})",  # 3601 hours in seconds
            "signoz_error_index_v2": f"toIntervalSecond({test_duration_hours*3600})",  # 3601 hours in seconds
            "usage_explorer": f"toIntervalSecond({test_duration_hours*3600})",  # 3601 hours in seconds
            "dependency_graph_minutes_v2": f"toIntervalSecond({test_duration_hours*3600})",  # 3601 hours in seconds
            "trace_summary": f"toIntervalSecond({test_duration_hours*3600})",  # 3601 hours in seconds
            "span_attributes_keys": f"toIntervalSecond({test_duration_hours*3600})",  # 3601 hours in seconds
        },
    )


def test_set_ttl_traces_with_cold_storage(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    remove_traces_ttl_and_storage_settings,  # pylint: disable=unused-argument
):
    """Test setting TTL for traces with cold storage configuration."""

    test_duration_hours = 91 * 24  # 91 days in hours
    test_cold_duration_hours = 32 * 24  # 32 days in hours

    payload = {
        "type": "traces",
        "duration": f"{test_duration_hours}h",  # 91 days in hours
        "coldStorage": "cold",
        "toColdDuration": f"{test_cold_duration_hours}h",  # 32 days in hours
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

    time.sleep(2)

    verify_table_retention_expression(
        signoz,
        {
            "signoz_index_v3": f"toIntervalSecond({test_duration_hours*3600})",  # 91 days in seconds
            "traces_v3_resource": f"toIntervalSecond({test_duration_hours*3600})",  # 91 days in seconds
            "signoz_error_index_v2": f"toIntervalSecond({test_duration_hours*3600})",  # 91 days in seconds
            "usage_explorer": f"toIntervalSecond({test_duration_hours*3600})",  # 91 days in seconds
            "dependency_graph_minutes_v2": f"toIntervalSecond({test_duration_hours*3600})",  # 91 days in seconds
            "trace_summary": f"toIntervalSecond({test_duration_hours*3600})",  # 91 days in seconds
            "span_attributes_keys": f"toIntervalSecond({test_duration_hours*3600})",  # 91 days in seconds
        },
    )

    verify_table_retention_expression(
        signoz,
        {
            "signoz_index_v3": f"toIntervalSecond({test_cold_duration_hours*3600}) TO VOLUME 'cold'",
            "traces_v3_resource": f"toIntervalSecond({test_cold_duration_hours*3600}) TO VOLUME 'cold'",
            "signoz_error_index_v2": f"toIntervalSecond({test_cold_duration_hours*3600}) TO VOLUME 'cold'",
            "usage_explorer": f"toIntervalSecond({test_cold_duration_hours*3600}) TO VOLUME 'cold'",
            "dependency_graph_minutes_v2": f"toIntervalSecond({test_cold_duration_hours*3600}) TO VOLUME 'cold'",
            "trace_summary": f"toIntervalSecond({test_cold_duration_hours*3600}) TO VOLUME 'cold'",
            # "span_attributes_keys": f"toIntervalSecond({test_cold_duration_hours*3600}) TO VOLUME",
            # Span attributes keys table does not have cold storage configured
        },
    )


def test_set_ttl_metrics_success(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    remove_metrics_ttl_and_storage_settings,  # pylint: disable=unused-argument
):
    """Test setting TTL for metrics using the new setTTLMetrics method."""

    test_duration_hours = 92 * 24  # 92 days in hours

    payload = {
        "type": "metrics",
        "duration": f"{test_duration_hours}h",  # 92 days in hours
        "coldStorage": "",
        "toColdDuration": 0,
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
    verify_table_retention_expression(
        signoz,
        {
            "samples_v4": f"toIntervalSecond({test_duration_hours * 3600})",  # 92 days in seconds
            "samples_v4_agg_5m": f"toIntervalSecond({test_duration_hours * 3600})",  # 92 days in seconds
            "samples_v4_agg_30m": f"toIntervalSecond({test_duration_hours * 3600})",  # 92 days in seconds
            "time_series_v4": f"toIntervalSecond({test_duration_hours * 3600})",  # 92 days in seconds
            "time_series_v4_6hrs": f"toIntervalSecond({test_duration_hours * 3600})",  # 92 days in seconds
            "time_series_v4_1day": f"toIntervalSecond({test_duration_hours * 3600})",  # 92 days in seconds
            "time_series_v4_1week": f"toIntervalSecond({test_duration_hours * 3600})",  # 92 days in seconds
        },
    )


def test_set_ttl_metrics_with_cold_storage(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    remove_metrics_ttl_and_storage_settings,  # pylint: disable=unused-argument
):
    """Test setting TTL for metrics with cold storage configuration."""

    test_duration_hours = 91 * 24  # 91 days in hours
    test_cold_duration_hours = 21 * 24  # 21 days in hours

    payload = {
        "type": "metrics",
        "duration": f"{test_duration_hours}h",  # 91 days in hours
        "coldStorage": "cold",
        "toColdDuration": f"{test_cold_duration_hours}h",  # 21 days in hours
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

    time.sleep(2)

    # Check TTL settings on relevant metrics tables
    verify_table_retention_expression(
        signoz,
        {
            "samples_v4": f"toIntervalSecond({test_duration_hours * 3600})",  # 92 days in seconds
            "samples_v4_agg_5m": f"toIntervalSecond({test_duration_hours * 3600})",  # 92 days in seconds
            "samples_v4_agg_30m": f"toIntervalSecond({test_duration_hours * 3600})",  # 92 days in seconds
            "time_series_v4": f"toIntervalSecond({test_duration_hours * 3600})",  # 92 days in seconds
            "time_series_v4_6hrs": f"toIntervalSecond({test_duration_hours * 3600})",  # 92 days in seconds
            "time_series_v4_1day": f"toIntervalSecond({test_duration_hours * 3600})",  # 92 days in seconds
            "time_series_v4_1week": f"toIntervalSecond({test_duration_hours * 3600})",  # 92 days in seconds
        },
    )

    # Check cold storage settings on relevant metrics tables
    verify_table_retention_expression(
        signoz,
        {
            # 21 days in seconds
            "samples_v4": f"toIntervalSecond({test_cold_duration_hours * 3600}) TO VOLUME 'cold'",
            # 21 days in seconds
            "samples_v4_agg_5m": f"toIntervalSecond({test_cold_duration_hours * 3600}) TO VOLUME 'cold'",
            # 21 days in seconds
            "samples_v4_agg_30m": f"toIntervalSecond({test_cold_duration_hours * 3600}) TO VOLUME 'cold'",
            # 21 days in seconds
            "time_series_v4": f"toIntervalSecond({test_cold_duration_hours * 3600}) TO VOLUME 'cold'",
            # 21 days in seconds
            "time_series_v4_6hrs": f"toIntervalSecond({test_cold_duration_hours * 3600}) TO VOLUME 'cold'",
            # 21 days in seconds
            "time_series_v4_1day": f"toIntervalSecond({test_cold_duration_hours * 3600}) TO VOLUME 'cold'",
            # 21 days in seconds
            "time_series_v4_1week": f"toIntervalSecond({test_cold_duration_hours * 3600}) TO VOLUME 'cold'",
        },
    )


def test_set_ttl_invalid_type(
    signoz: types.SigNoz, get_token: Callable[[str, str], str]
):
    """Test setting TTL with invalid type returns error."""
    payload = {
        "type": "invalid_type",
        "duration": f"{90*24}h",
        "coldStorage": "",
        "toColdDuration": 0,
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
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    insert_logs,
    remove_logs_ttl_settings,  # pylint: disable=unused-argument
):
    """Test setting custom retention TTL with basic configuration."""

    test_retention_days = 103  # 103 days

    payload = {
        "type": "logs",
        "defaultTTLDays": test_retention_days,
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

    logs = [
        Logs(
            body="test",
            resources={"service_name": "test-service"},
            severity_text="INFO",
        ),
    ]
    insert_logs(logs)

    # Verify partitions for logs tables
    verify_table_partition_expressions(
        signoz,
        {
            "signoz_logs.logs_v2": (test_retention_days, 0, 1),
            "signoz_logs.logs_v2_resource": (test_retention_days, 0, 1),
        },
    )

    # Verify retention settings for logs tables
    verify_table_retention_expression(
        signoz,
        {
            "logs_attribute_keys": f"toIntervalDay({test_retention_days})",
            "logs_resource_keys": f"toIntervalDay({test_retention_days})",
        },
    )


def test_set_custom_retention_ttl_basic_with_cold_storage(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    insert_logs,
    remove_logs_ttl_settings,  # pylint: disable=unused-argument
):
    """Test setting custom retention TTL with basic configuration."""

    test_retention_days = 104  # 104 days
    test_retention_days_cold = 27  # 27 days

    payload = {
        "type": "logs",
        "defaultTTLDays": test_retention_days,
        "ttlConditions": [],
        "coldStorageVolume": "cold",
        "coldStorageDurationDays": test_retention_days_cold,
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

    logs = [
        Logs(
            body="test",
            resources={"service_name": "test-service"},
            severity_text="INFO",
        ),
    ]
    insert_logs(logs)

    # Verify partitions and retention for logs tables
    verify_table_partition_expressions(
        signoz,
        {
            "signoz_logs.logs_v2": (test_retention_days, test_retention_days_cold, 1),
            "signoz_logs.logs_v2_resource": (
                test_retention_days,
                test_retention_days_cold,
                1,
            ),
        },
    )

    verify_table_retention_expression(
        signoz,
        {
            "logs_v2": "toIntervalDay(_retention_days_cold) TO VOLUME 'cold'",
            "logs_v2_resource": "toIntervalDay(_retention_days_cold) TO VOLUME 'cold'",
            # Cold storage retention is not applicable for attribute keys table
            "logs_attribute_keys": f"toIntervalDay({test_retention_days})",
            # Cold storage retention is not applicable for resource keys table
            "logs_resource_keys": f"toIntervalDay({test_retention_days})",
        },
    )


def test_set_custom_retention_ttl_basic_fallback(
    signoz: types.SigNoz,
    get_token,
    ttl_legacy_logs_v2_table_setup,  # pylint: disable=unused-argument
    ttl_legacy_logs_v2_resource_table_setup,  # pylint: disable=unused-argument,
):
    """Test setting TTL for logs using the new setTTLLogs method."""

    test_retention_days = 101  # 101 days
    test_retention_days_cold = 17  # 17 days
    payload = {
        "type": "logs",
        "defaultTTLDays": test_retention_days,
        "ttlConditions": [],
        "coldStorageVolume": "cold",
        "coldStorageDurationDays": test_retention_days_cold,
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
    verify_table_retention_expression(
        signoz,
        {
            # 101 days in seconds
            "logs_v2": f"toIntervalSecond({test_retention_days * 24 * 3600})",
            # 101 days in seconds
            "logs_v2_resource": f"toIntervalSecond({test_retention_days * 24 * 3600})",
            # Cold storage retention is not applicable for attribute keys table
            "logs_attribute_keys": f"toIntervalSecond({test_retention_days * 24 * 3600})",
            # Cold storage retention is not applicable for resource keys table
            "logs_resource_keys": f"toIntervalSecond({test_retention_days * 24 * 3600})",
        },
    )

    verify_table_retention_expression(
        signoz,
        {
            # 17 days in seconds
            "logs_v2": f"toIntervalSecond({test_retention_days_cold * 24 * 3600}) TO VOLUME 'cold'",
            # 17 days in seconds
            "logs_v2_resource": f"toIntervalSecond({test_retention_days_cold * 24 * 3600}) TO VOLUME 'cold'",
        },
    )


def test_set_custom_retention_ttl_basic_101_times(
    signoz: types.SigNoz,
    get_token,
    remove_logs_ttl_settings,  # pylint: disable=unused-argument
):
    """Test setting custom retention TTL with basic configuration to trigger housekeeping."""

    test_retention_days = 113  # 113 days

    for _ in range(101):
        payload = {
            "type": "logs",
            "defaultTTLDays": test_retention_days,
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

    # Verify retention settings for logs tables
    verify_table_retention_expression(
        signoz,
        {
            "logs_attribute_keys": f"toIntervalDay({test_retention_days})",
            "logs_resource_keys": f"toIntervalDay({test_retention_days})",
        },
    )


def test_set_custom_retention_ttl_with_conditions(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    insert_logs,
    remove_logs_ttl_settings,  # pylint: disable=unused-argument
):
    """Test setting custom retention TTL with filter conditions."""

    test_retention_days = 30  # 30 days
    test_retention_days_condition = 60  # 60 days
    test_retention_days_cold = 5  # 5 days

    payload = {
        "type": "logs",
        "defaultTTLDays": test_retention_days,
        "ttlConditions": [
            {
                "conditions": [
                    {"key": "service_name", "values": ["frontend", "backend"]}
                ],
                "ttlDays": test_retention_days_condition,
            }
        ],
        "coldStorageVolume": "cold",
        "coldStorageDurationDays": test_retention_days_cold,
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

    # insert some logs, these should go test_retention_days_condition (60 days) partition
    logs = [
        Logs(resources={"service_name": "frontend"}, severity_text="ERROR"),
    ]
    insert_logs(logs)

    # Verify partitions and retention for logs tables
    verify_table_partition_expressions(
        signoz,
        {
            "signoz_logs.logs_v2": (
                test_retention_days_condition,
                test_retention_days_cold,
                1,
            ),
            "signoz_logs.logs_v2_resource": (
                test_retention_days_condition,
                test_retention_days_cold,
                1,
            ),
        },
    )

    # insert some logs, these should go test_retention_days (30 days) partition
    logs = [
        Logs(resources={"service_name": "others"}, severity_text="ERROR"),
    ]
    insert_logs(logs)

    # Verify partitions and retention for logs tables
    verify_table_partition_expressions(
        signoz,
        {
            "signoz_logs.logs_v2": (test_retention_days, test_retention_days_cold, 1),
            "signoz_logs.logs_v2_resource": (
                test_retention_days,
                test_retention_days_cold,
                1,
            ),
        },
    )

    verify_table_retention_expression(
        signoz,
        {
            "logs_v2": "toIntervalDay(_retention_days_cold) TO VOLUME 'cold'",
            "logs_v2_resource": "toIntervalDay(_retention_days_cold) TO VOLUME 'cold'",
            # Cold storage retention is not applicable for attribute keys table
            "logs_attribute_keys": f"toIntervalDay({max(test_retention_days, test_retention_days_condition)})",
            # Cold storage retention is not applicable for resource keys table
            "logs_resource_keys": f"toIntervalDay({max(test_retention_days, test_retention_days_condition)})",
        },
    )


def test_set_custom_retention_ttl_with_invalid_cold_storage(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    insert_logs,
    remove_logs_ttl_settings,  # pylint: disable=unused-argument
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
    assert "No such volume `logs_cold_storage`" in response_data["error"]["message"]


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
    ttl_legacy_logs_v2_table_setup,  # pylint: disable=unused-argument
    ttl_legacy_logs_v2_resource_table_setup,  # pylint: disable=unused-argument
):
    """Test setting TTL for logs using the new setTTLLogs method."""

    test_retention_days = 150  # 150 days
    payload = {
        "type": "logs",
        "duration": f"{test_retention_days * 24}h",
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

    time.sleep(2)

    # Verify TTL settings in Clickhouse
    verify_table_retention_expression(
        signoz,
        {
            "logs_v2": f"toIntervalSecond({test_retention_days * 24 * 3600})",  # 150 days in seconds
            "logs_v2_resource": f"toIntervalSecond({test_retention_days * 24 * 3600})",  # 150 days in seconds
            "logs_attribute_keys": f"toIntervalSecond({test_retention_days * 24 * 3600})",  # 150 days in seconds
            "logs_resource_keys": f"toIntervalSecond({test_retention_days * 24 * 3600})",  # 150 days in seconds
        },
    )


def test_get_ttl_traces_success(
    signoz: types.SigNoz, get_token: Callable[[str, str], str]
):
    """Test getting TTL for traces."""
    # First set a TTL configuration for traces

    test_retention_days = 33  # 33 days
    set_payload = {
        "type": "traces",
        "duration": f"{test_retention_days * 24}h",  # 33 days in hours
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
        response_data["traces_ttl_duration_hrs"] == test_retention_days * 24
    )  # Note: response is in hours as integer
    assert (
        response_data["traces_move_ttl_duration_hrs"] == -1
    )  # -1 indicates no cold storage configured


def test_large_ttl_conditions_list(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    insert_logs,
    remove_logs_ttl_settings,  # pylint: disable=unused-argument
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
