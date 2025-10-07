"""
Summary:
This test file contains integration tests for Time-To-Live (TTL) and custom retention policies in SigNoz's query service.
It verifies the correct behavior of TTL settings for traces, metrics, and logs, including support for cold storage, custom retention conditions, error handling for invalid configurations, and retrieval of TTL settings.
"""

import json
import time
from http import HTTPStatus
from typing import Dict, Any

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logger import setup_logger
from fixtures.logs import insert_logs, Logs
import threading

logger = setup_logger(__name__)


class TestTTLMethods:
    """Test class for TTL-related functionality."""

    @pytest.fixture(autouse=True)
    def setup(self, signoz: types.SigNoz, get_jwt_token, clickhouse):
        """Setup for each test method."""
        self.signoz = signoz
        self.conn = clickhouse.conn
        self.base_headers = {
            "Authorization": f"Bearer {get_jwt_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)}",
            "Content-Type": "application/json"
        }

    def _make_ttl_request(self, endpoint: str, query_params: Dict[str, Any] = {}, json_body: Dict[str, Any] = {}, method = requests.post) -> requests.Response:
        """Helper method to make TTL API requests."""
        url = self.signoz.self.host_configs["8080"].get(endpoint)
        return method(url, json=json_body, params=query_params, headers=self.base_headers, timeout=30)

    def test_set_ttl_traces_success(self, clickhouse):
        """Test setting TTL for traces with new ttlConfig structure."""
        payload = {
            "type": "traces",
            "duration": "3600h",
        }

        response = self._make_ttl_request("/api/v1/settings/ttl", query_params=payload)
        assert response.status_code == HTTPStatus.OK
        response_data = response.json()
        assert "message" in response_data
        assert "successfully set up" in response_data["message"].lower()

        # Verify TTL settings in Clickhouse
        # Allow some time for the TTL to be applied
        time.sleep(2)

        # Check TTL settings on relevant tables
        tables_to_check = [
            'signoz_index_v3',
            'traces_v3_resource',
            'signoz_error_index_v2',
            'usage_explorer',
            'dependency_graph_minutes_v2',
            'trace_summary'
        ]

        # Query to get table engine info which includes TTL
        query = f"SELECT engine_full FROM system.tables WHERE table in ['{"\',\'".join(tables_to_check)}']"
        
        result = self.conn.query(query).result_rows

        # Verify TTL exists in all table definitions
        assert all("TTL" in r[0] for r in result)

        assert all(" SETTINGS" in r[0] for r in result)

        ttl_parts = [r[0].split('TTL ')[1].split(' SETTINGS')[0] for r in result]
        # All TTLs should include toIntervalSecond(12960000) which is 3600h
        assert all('toIntervalSecond(12960000)' in ttl_part for ttl_part in ttl_parts)

    def test_set_ttl_traces_with_cold_storage(self):
        """Test setting TTL for traces with cold storage configuration."""
        payload = {
            "type": "traces",
            "duration": f'{90*24}h',  # 90 days in hours
            "coldStorageVolume": "cold_storage_vol",
            "toColdStorageDuration": f'{30*24}h'  # 30 days in hours
        }

        response = self._make_ttl_request("/api/v1/settings/ttl", query_params=payload)

        assert response.status_code == HTTPStatus.OK
        response_data = response.json()
        assert "message" in response_data
        assert "successfully set up" in response_data["message"].lower()

    def test_set_ttl_metrics_success(self):
        """Test setting TTL for metrics using the new setTTLMetrics method."""
        payload = {
            "type": "metrics",
            "duration": f'{90*24}h',  # 90 days in hours
            "coldStorageVolume": "",
            "toColdStorageDuration": 0
        }
        
        response = self._make_ttl_request("/api/v1/settings/ttl", query_params=payload)
        
        assert response.status_code == HTTPStatus.OK
        response_data = response.json()
        assert "message" in response_data
        assert "successfully set up" in response_data["message"].lower()

        # Verify TTL settings in Clickhouse
        # Allow some time for the TTL to be applied
        time.sleep(2)

        # Check TTL settings on relevant metrics tables
        tables_to_check = [
            'samples_v4',
            'samples_v4_agg_5m',
            'samples_v4_agg_30m',
            'time_series_v4',
            'time_series_v4_6hrs',
            'time_series_v4_1day',
            'time_series_v4_1week'
        ]

        # Query to get table engine info which includes TTL
        query = f"SELECT engine_full FROM system.tables WHERE table in ['{"\',\'".join(tables_to_check)}']"
        
        result = self.conn.query(query).result_rows

        # Verify TTL exists in all table definitions
        assert all("TTL" in r[0] for r in result)

        assert all(" SETTINGS" in r[0] for r in result)

        ttl_parts = [r[0].split('TTL ')[1].split(' SETTINGS')[0] for r in result]

        # All TTLs should include toIntervalSecond(7776000) which is 90*24h
        assert all('toIntervalSecond(7776000)' in ttl_part for ttl_part in ttl_parts)

    def test_set_ttl_metrics_with_cold_storage(self):
        """Test setting TTL for metrics with cold storage configuration."""
        payload = {
            "type": "metrics",
            "duration": f'{90*24}h',  # 90 days in hours
            "coldStorageVolume": "metrics_cold_vol",
            "toColdStorageDuration": f'{20*24}h'  # 20 days in hours
        }
        
        response = self._make_ttl_request("/api/v1/settings/ttl", query_params=payload)
        
        assert response.status_code == HTTPStatus.OK
        response_data = response.json()
        assert "message" in response_data
        assert "successfully set up" in response_data["message"].lower()

    def test_set_ttl_invalid_type(self):
        """Test setting TTL with invalid type returns error."""
        payload = {
            "type": "invalid_type",
            "duration": f'{90*24}h',
            "coldStorageVolume": "",
            "toColdStorageDuration": 0
        }

        response = self._make_ttl_request("/api/v1/settings/ttl", query_params=payload)
        
        assert response.status_code == HTTPStatus.BAD_REQUEST

    def test_set_custom_retention_ttl_basic(self, clickhouse):
        """Test setting custom retention TTL with basic configuration."""
        payload = {
            "type": "logs", 
            "defaultTTLDays": 100,
            "ttlConditions": [],
            "coldStorageVolume": "",
            "coldStorageDuration": 0
        }
        
        response = self._make_ttl_request("/api/v2/settings/ttl", json_body=payload)
        assert response.status_code == HTTPStatus.OK
        response_data = response.json()
        assert "message" in response_data

        # Verify TTL settings in Clickhouse
        # Allow some time for the TTL to be applied
        time.sleep(2)

        # Check TTL settings on relevant tables
        tables_to_check = [
            'logs_v2',
            'logs_v2_resource',
        ]

        # Query to get table engine info which includes TTL
        query = f"SELECT engine_full FROM system.tables WHERE table in ['{"\',\'".join(tables_to_check)}']"
        
        result = self.conn.query(query).result_rows

        # Verify TTL exists in all table definitions
        assert all("TTL" in r[0] for r in result)

        assert all(" SETTINGS" in r[0] for r in result)

        ttl_parts = [r[0].split('TTL ')[1].split(' SETTINGS')[0] for r in result]
        
        # Also verify the TTL parts contain retention_days
        assert all('_retention_days' in ttl_part for ttl_part in ttl_parts)

        # Query to describe tables and check retention_days column
        for table in tables_to_check:
            describe_query = f"DESCRIBE TABLE signoz_logs.{table}"
            describe_result = self.conn.query(describe_query).result_rows
            
            # Find the _retention_days column
            retention_col = next((row for row in describe_result if row[0] == '_retention_days'), None)
            assert retention_col is not None, f"_retention_days column not found in table {table}"
            assert retention_col[1] == 'UInt16', f"Expected _retention_days to be UInt16 in table {table}, but got {retention_col[1]}"
            assert retention_col[3] == '100', f"Expected default value of _retention_days to be 100 in table {table}, but got {retention_col[3]}"

    def test_set_custom_retention_ttl_with_conditions(self, insert_logs):
        """Test setting custom retention TTL with filter conditions."""

        payload = {
            "type": "logs",
            "defaultTTLDays": 30,
            "ttlConditions": [
                {
                    "conditions": [
                        {
                            "key": "service_name",
                            "values": ["frontend", "backend"]
                        }
                    ],
                    "ttlDays": 60
                }
            ],
            "coldStorageVolume": "",
            "coldStorageDuration": 0
        }

        response = self._make_ttl_request("/api/v2/settings/ttl", json_body=payload)
        assert response.status_code == HTTPStatus.BAD_REQUEST

        # Need to ensure that "severity" and "service_name" keys exist in logsAttributeKeys table
        # Insert some logs with these attribute keys

        logs = [ 
            Logs(resources = {"service_name": "frontend"}, severity_text="ERROR"),
            Logs(resources = {"service_name": "backend"}, severity_text="FATAL")
        ]
        insert_logs(logs)
        response = self._make_ttl_request("/api/v2/settings/ttl", json_body=payload)

        assert response.status_code == HTTPStatus.OK
        response_data = response.json()
        assert "message" in response_data

    def test_set_custom_retention_ttl_with_cold_storage(self, insert_logs):
        """Test setting custom retention TTL with cold storage configuration."""
        payload = {
            "type": "logs",
            "defaultTTLDays": 60,
            "ttlConditions": [
                {
                    "conditions": [
                        {
                            "key": "environment", 
                            "values": ["production"]
                        }
                    ],
                    "ttlDays": 180
                }
            ],
            "coldStorageVolume": "logs_cold_storage",
            "coldStorageDuration": 30  # 30 days to cold storage
        }
        # Insert some logs with these attribute keys

        logs = [ 
            Logs(resources = {"environment": "production"}, severity_text="ERROR"),
        ]
        insert_logs(logs)
        
        response = self._make_ttl_request("/api/v2/settings/ttl", json_body=payload)
        
        assert response.status_code == HTTPStatus.BAD_REQUEST
        response_data = response.json()
        assert 'error' in response_data
        assert 'message' in response_data['error']
        assert "Unknown storage policy `tiered`" in response_data['error']['message']

    def test_set_custom_retention_ttl_duplicate_conditions(self):
        """Test that duplicate TTL conditions are rejected."""
        payload = {
            "type": "logs",
            "defaultTTLDays": 30,
            "ttlConditions": [
                {
                    "conditions": [
                        {
                            "key": "service_name",
                            "values": ["frontend"]
                        }
                    ],
                    "ttlDays": 60
                },
                {
                    "conditions": [
                        {
                            "key": "service_name", 
                            "values": ["frontend"]  # Duplicate condition
                        }
                    ],
                    "ttlDays": 90
                }
            ],
            "coldStorageVolume": "",
            "coldStorageDuration": 0
        }
        
        response = self._make_ttl_request("/api/v2/settings/ttl", query_params=payload)
        
        # Should return error for duplicate conditions
        assert response.status_code == HTTPStatus.BAD_REQUEST

    def test_set_custom_retention_ttl_invalid_condition(self):
        """Test that conditions with empty values are rejected."""
        payload = {
            "type": "logs",
            "defaultTTLDays": 30,
            "ttlConditions": [
                {
                    "conditions": [
                        {
                            "key": "service_name",
                            "values": []  # Empty values should be rejected
                        }
                    ],
                    "ttlDays": 60
                }
            ],
            "coldStorageVolume": "",
            "coldStorageDuration": 0
        }
        
        response = self._make_ttl_request("/api/v2/settings/ttl", query_params=payload)
        
        # Should return error for empty condition values
        assert response.status_code == HTTPStatus.BAD_REQUEST

    def test_get_custom_retention_ttl(self, insert_logs):
        """Test getting custom retention TTL configuration."""
        # First set a custom retention TTL
        set_payload = {
            "type": "logs",
            "defaultTTLDays": 45,
            "ttlConditions": [
                {
                    "conditions": [
                        {
                            "key": "service_name",
                            "values": ["test-service"]
                        }
                    ],
                    "ttlDays": 90
                }
            ],
            "coldStorageVolume": "",
            "coldStorageDuration": 0
        }

        # Insert some logs with these attribute keys
        logs = [ 
            Logs(resources = {"service_name": "test-service"}, severity_text="ERROR"),
        ]
        insert_logs(logs)

        set_response = self._make_ttl_request("/api/v2/settings/ttl", json_body=set_payload)
        assert set_response.status_code == HTTPStatus.OK
        
        # Allow some time for the TTL to be processed
        time.sleep(2)
        
        # Now get the TTL configuration
        get_response = self._make_ttl_request("/api/v2/settings/ttl", query_params={"type": "logs"}, method=requests.get)
        
        response_data = get_response.json()
        
        # Verify the response contains expected fields
        assert response_data['status'] == 'success'
        assert response_data['default_ttl_days'] == 45
        assert response_data['cold_storage_ttl_days'] == -1
        assert response_data['ttl_conditions'][0]['ttlDays'] == 90
        assert response_data['ttl_conditions'][0]['conditions'][0]['key'] == 'service_name'
        assert response_data['ttl_conditions'][0]['conditions'][0]['values'] == ['test-service']

    def test_get_ttl_traces_success(self):
        """Test getting TTL for traces."""
        # First set a TTL configuration for traces
        set_payload = {
            "type": "traces",
            "duration": "720h",  # 30 days in hours
        }
        
        set_response = self._make_ttl_request("/api/v1/settings/ttl", query_params=set_payload)
        assert set_response.status_code == HTTPStatus.OK
        
        # Allow some time for the TTL to be processed
        time.sleep(2)
        
        # Now get the TTL configuration for traces
        get_response = self._make_ttl_request("/api/v1/settings/ttl", query_params={"type": "traces"}, method=requests.get)
        
        assert get_response.status_code == HTTPStatus.OK
        response_data = get_response.json()
        
        # Verify the response contains expected fields and values
        assert response_data['status'] == 'success'
        assert 'traces_ttl_duration_hrs' in response_data
        assert 'traces_move_ttl_duration_hrs' in response_data
        assert response_data['traces_ttl_duration_hrs'] == 720  # Note: response is in hours as integer
        assert response_data['traces_move_ttl_duration_hrs'] == -1  # -1 indicates no cold storage configured

    def test_large_ttl_conditions_list(self, insert_logs):
        """Test custom retention TTL with many conditions."""
        # Create a list of many TTL conditions to test performance and limits
        conditions = []
        for i in range(10):  # Test with 10 conditions
            conditions.append({
                "conditions": [
                    {
                        "key": f"service_name",
                        "values": [f"service-{i}"]
                    }
                ],
                "ttlDays": 30 + (i * 10)
            })

        logs = [ 
            Logs(resources = {"service_name": f"service-{i}"}, severity_text="ERROR") for i in range(10)
        ]
        insert_logs(logs)
        
        payload = {
            "type": "logs",
            "defaultTTLDays": 30,
            "ttlConditions": conditions,
            "coldStorageVolume": "",
            "coldStorageDuration": 0
        }
        
        response = self._make_ttl_request("/api/v2/settings/ttl", json_body=payload)
        assert response.status_code == HTTPStatus.OK
        response_data = response.json()
        assert "message" in response_data
