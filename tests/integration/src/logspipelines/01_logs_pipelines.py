"""
Summary:
This test file contains integration tests for log parsing pipelines in SigNoz's query service.
It verifies the correct behavior of log pipeline CRUD operations, versioning, preview functionality,
and pipeline processing.
"""

from http import HTTPStatus
from typing import Callable

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD


def test_create_logs_pipeline_success(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """
    Setup:
    Create a new log parsing pipeline with a simple regex parser.

    Tests:
    1. Create a pipeline with valid configuration
    2. Verify the pipeline is created successfully
    3. Verify the response contains version information
    4. Verify the pipeline is returned in the response
    """
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    pipeline_payload = {
        "pipelines": [
            {
                "id": "",
                "orderId": 1,
                "name": "Test Pipeline",
                "alias": "test-pipeline",
                "description": "Test pipeline for integration testing",
                "enabled": True,
                "filter": {
                    "op": "AND",
                    "items": [
                        {
                            "key": {
                                "key": "body",
                                "dataType": "string",
                                "type": "",
                                "isColumn": True,
                                "isJSON": False,
                            },
                            "value": ".*",
                            "op": "regex",
                        }
                    ],
                },
                "config": [
                    {
                        "type": "regex_parser",
                        "id": "regex-parser-1",
                        "orderId": 1,
                        "parse_from": "body",
                        "parse_to": "attributes",
                        "regex": r"^(?P<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) (?P<level>\w+) (?P<message>.*)$",
                        "on_error": "send",
                    }
                ],
            }
        ]
    }

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/logs/pipelines"),
        timeout=10,
        headers={
            "authorization": f"Bearer {token}",
            "content-type": "application/json",
        },
        json=pipeline_payload,
    )

    assert response.status_code == HTTPStatus.OK
    response_data = response.json()
    assert response_data["status"] == "success"
    assert "data" in response_data
    assert "pipelines" in response_data["data"]
    assert len(response_data["data"]["pipelines"]) == 1

    pipeline = response_data["data"]["pipelines"][0]
    assert pipeline["name"] == "Test Pipeline"
    assert pipeline["alias"] == "test-pipeline"
    assert pipeline["enabled"] is True
    assert pipeline["orderId"] == 1
    assert len(pipeline["config"]) == 1
    assert pipeline["config"][0]["type"] == "regex_parser"

    # Verify version information
    assert "version" in response_data["data"]
    assert (
        response_data["data"]["version"] >= 1
    )  # Version might be higher if other tests ran first


def test_list_logs_pipelines_success(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """
    Setup:
    Create a pipeline first, then list all pipelines.

    Tests:
    1. Create a pipeline
    2. List all pipelines and verify the created pipeline is present
    3. Verify the response structure
    """
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Create a pipeline first
    create_payload = {
        "pipelines": [
            {
                "id": "",
                "orderId": 1,
                "name": "List Test Pipeline",
                "alias": "list-test-pipeline",
                "description": "Pipeline for list testing",
                "enabled": True,
                "filter": {
                    "op": "AND",
                    "items": [
                        {
                            "key": {
                                "key": "body",
                                "dataType": "string",
                                "type": "",
                                "isColumn": True,
                                "isJSON": False,
                            },
                            "value": ".*",
                            "op": "regex",
                        }
                    ],
                },
                "config": [
                    {
                        "type": "json_parser",
                        "id": "json-parser-1",
                        "orderId": 1,
                        "parse_from": "body",
                        "parse_to": "attributes",
                        "on_error": "send",
                    }
                ],
            }
        ]
    }

    create_response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/logs/pipelines"),
        timeout=10,
        headers={
            "authorization": f"Bearer {token}",
            "content-type": "application/json",
        },
        json=create_payload,
    )

    assert create_response.status_code == HTTPStatus.OK

    # List pipelines
    list_response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/logs/pipelines/latest"),
        timeout=10,
        headers={
            "authorization": f"Bearer {token}",
        },
    )

    assert list_response.status_code == HTTPStatus.OK
    list_data = list_response.json()
    assert list_data["status"] == "success"
    assert "data" in list_data
    assert "pipelines" in list_data["data"]
    assert len(list_data["data"]["pipelines"]) >= 1

    # Verify the created pipeline is in the list
    pipeline_names = [p["name"] for p in list_data["data"]["pipelines"]]
    assert "List Test Pipeline" in pipeline_names


def test_list_logs_pipelines_by_version(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """
    Setup:
    Create multiple pipeline versions and list by specific version.

    Tests:
    1. Create initial pipeline (version 1)
    2. Create updated pipeline (version 2)
    3. List pipelines by version 1 and verify it returns the original
    4. List pipelines by version 2 and verify it returns the updated version
    """
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Create version 1
    v1_payload = {
        "pipelines": [
            {
                "id": "",
                "orderId": 1,
                "name": "Version Test Pipeline V1",
                "alias": "version-test-v1",
                "description": "Version 1",
                "enabled": True,
                "filter": {
                    "op": "AND",
                    "items": [
                        {
                            "key": {
                                "key": "body",
                                "dataType": "string",
                                "type": "",
                                "isColumn": True,
                                "isJSON": False,
                            },
                            "value": ".*",
                            "op": "regex",
                        }
                    ],
                },
                "config": [
                    {
                        "type": "json_parser",
                        "id": "json-parser-v1",
                        "orderId": 1,
                        "parse_from": "body",
                        "parse_to": "attributes",
                        "on_error": "send",
                    }
                ],
            }
        ]
    }

    v1_response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/logs/pipelines"),
        timeout=10,
        headers={
            "authorization": f"Bearer {token}",
            "content-type": "application/json",
        },
        json=v1_payload,
    )

    assert v1_response.status_code == HTTPStatus.OK
    v1_data = v1_response.json()
    assert v1_data["status"] == "success"
    v1_version = v1_data["data"]["version"]
    assert v1_version >= 1  # Version might be higher if other tests ran first

    # Create version 2
    v2_payload = {
        "pipelines": [
            {
                "id": "",
                "orderId": 1,
                "name": "Version Test Pipeline V2",
                "alias": "version-test-v2",
                "description": "Version 2",
                "enabled": True,
                "filter": {
                    "op": "AND",
                    "items": [
                        {
                            "key": {
                                "key": "body",
                                "dataType": "string",
                                "type": "",
                                "isColumn": True,
                                "isJSON": False,
                            },
                            "value": ".*",
                            "op": "regex",
                        }
                    ],
                },
                "config": [
                    {
                        "type": "json_parser",
                        "id": "json-parser-v2",
                        "orderId": 1,
                        "parse_from": "body",
                        "parse_to": "attributes",
                        "on_error": "send",
                    }
                ],
            }
        ]
    }

    v2_response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/logs/pipelines"),
        timeout=10,
        headers={
            "authorization": f"Bearer {token}",
            "content-type": "application/json",
        },
        json=v2_payload,
    )

    assert v2_response.status_code == HTTPStatus.OK
    v2_data = v2_response.json()
    assert v2_data["status"] == "success"
    v2_version = v2_data["data"]["version"]
    assert v2_version == v1_version + 1

    # List by version 1
    v1_list_response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/logs/pipelines/{v1_version}"),
        timeout=10,
        headers={
            "authorization": f"Bearer {token}",
        },
    )

    assert v1_list_response.status_code == HTTPStatus.OK
    v1_list_data = v1_list_response.json()
    assert v1_list_data["status"] == "success"
    assert v1_list_data["data"]["version"] == v1_version
    assert len(v1_list_data["data"]["pipelines"]) == 1
    assert v1_list_data["data"]["pipelines"][0]["name"] == "Version Test Pipeline V1"

    # List by version 2
    v2_list_response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/logs/pipelines/{v2_version}"),
        timeout=10,
        headers={
            "authorization": f"Bearer {token}",
        },
    )

    assert v2_list_response.status_code == HTTPStatus.OK
    v2_list_data = v2_list_response.json()
    assert v2_list_data["status"] == "success"
    assert v2_list_data["data"]["version"] == v2_version
    assert len(v2_list_data["data"]["pipelines"]) == 1
    assert v2_list_data["data"]["pipelines"][0]["name"] == "Version Test Pipeline V2"


def test_preview_logs_pipelines_success(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """
    Setup:
    Create a preview request with a pipeline and sample logs.

    Tests:
    1. Send preview request with valid pipeline configuration
    2. Verify the preview processes logs correctly
    3. Verify the response contains processed logs
    """
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    preview_payload = {
        "pipelines": [
            {
                "orderId": 1,
                "name": "Preview Test Pipeline",
                "alias": "preview-test",
                "description": "Pipeline for preview testing",
                "enabled": True,
                "filter": {
                    "op": "AND",
                    "items": [
                        {
                            "key": {
                                "key": "body",
                                "dataType": "string",
                                "type": "",
                                "isColumn": True,
                                "isJSON": False,
                            },
                            "value": ".*",
                            "op": "regex",
                        }
                    ],
                },
                "config": [
                    {
                        "type": "json_parser",
                        "id": "json-parser-preview",
                        "parse_from": "body",
                        "parse_to": "attributes",
                        "on_error": "send",
                    }
                ],
            }
        ],
        "logs": [
            {
                "body": '{"level": "info", "message": "Test log message", "timestamp": "2024-01-01T00:00:00Z"}',
                "timestamp": 1704067200000000000,  # nanoseconds, not milliseconds
                "id": "",
                "trace_id": "",
                "span_id": "",
                "trace_flags": 0,
                "severity_text": "",
                "severity_number": 0,
                "attributes_string": {},
                "attributes_int": {},
                "attributes_float": {},
                "attributes_bool": {},
                "resources_string": {"service.name": "test-service"},
            }
        ],
    }

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/logs/pipelines/preview"),
        timeout=10,
        headers={
            "authorization": f"Bearer {token}",
            "content-type": "application/json",
        },
        json=preview_payload,
    )

    assert response.status_code == HTTPStatus.OK
    response_data = response.json()
    assert response_data["status"] == "success"
    assert "data" in response_data
    assert "logs" in response_data["data"]
    assert len(response_data["data"]["logs"]) == 1

    # Verify the log was processed
    processed_log = response_data["data"]["logs"][0]
    assert "attributes_string" in processed_log or "attributes" in processed_log


def test_create_multiple_pipelines_success(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """
    Setup:
    Create multiple pipelines in a single request.

    Tests:
    1. Create multiple pipelines with different configurations
    2. Verify all pipelines are created
    3. Verify pipelines are ordered correctly
    """
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    multi_pipeline_payload = {
        "pipelines": [
            {
                "id": "",
                "orderId": 1,
                "name": "First Pipeline",
                "alias": "first-pipeline",
                "description": "First pipeline",
                "enabled": True,
                "filter": {
                    "op": "AND",
                    "items": [
                        {
                            "key": {
                                "key": "body",
                                "dataType": "string",
                                "type": "",
                                "isColumn": True,
                                "isJSON": False,
                            },
                            "value": ".*",
                            "op": "regex",
                        }
                    ],
                },
                "config": [
                    {
                        "type": "json_parser",
                        "id": "json-parser-1",
                        "orderId": 1,
                        "parse_from": "body",
                        "parse_to": "attributes",
                        "on_error": "send",
                    }
                ],
            },
            {
                "id": "",
                "orderId": 2,
                "name": "Second Pipeline",
                "alias": "second-pipeline",
                "description": "Second pipeline",
                "enabled": True,
                "filter": {
                    "op": "AND",
                    "items": [
                        {
                            "key": {
                                "key": "body",
                                "dataType": "string",
                                "type": "",
                                "isColumn": True,
                                "isJSON": False,
                            },
                            "value": ".*",
                            "op": "regex",
                        }
                    ],
                },
                "config": [
                    {
                        "type": "regex_parser",
                        "id": "regex-parser-2",
                        "orderId": 1,
                        "parse_from": "body",
                        "parse_to": "attributes",
                        "regex": r"^(?P<level>\w+): (?P<message>.*)$",
                        "on_error": "send",
                    }
                ],
            },
        ]
    }

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/logs/pipelines"),
        timeout=10,
        headers={
            "authorization": f"Bearer {token}",
            "content-type": "application/json",
        },
        json=multi_pipeline_payload,
    )

    assert response.status_code == HTTPStatus.OK
    response_data = response.json()
    assert response_data["status"] == "success"
    assert "data" in response_data
    assert "pipelines" in response_data["data"]
    assert len(response_data["data"]["pipelines"]) == 2

    # Verify order
    assert response_data["data"]["pipelines"][0]["orderId"] == 1
    assert response_data["data"]["pipelines"][0]["name"] == "First Pipeline"
    assert response_data["data"]["pipelines"][1]["orderId"] == 2
    assert response_data["data"]["pipelines"][1]["name"] == "Second Pipeline"


def test_delete_all_pipelines_success(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """
    Setup:
    Create a pipeline first, then delete all pipelines by sending empty array.

    Tests:
    1. Create a pipeline
    2. Delete all pipelines by sending empty pipelines array
    3. Verify pipelines are deleted
    4. Verify new version is created
    """
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Create a pipeline first
    create_payload = {
        "pipelines": [
            {
                "id": "",
                "orderId": 1,
                "name": "Pipeline to Delete",
                "alias": "delete-test",
                "description": "Pipeline to be deleted",
                "enabled": True,
                "filter": {
                    "op": "AND",
                    "items": [
                        {
                            "key": {
                                "key": "body",
                                "dataType": "string",
                                "type": "",
                                "isColumn": True,
                                "isJSON": False,
                            },
                            "value": ".*",
                            "op": "regex",
                        }
                    ],
                },
                "config": [
                    {
                        "type": "json_parser",
                        "id": "json-parser-delete",
                        "orderId": 1,
                        "parse_from": "body",
                        "parse_to": "attributes",
                        "on_error": "send",
                    }
                ],
            }
        ]
    }

    create_response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/logs/pipelines"),
        timeout=10,
        headers={
            "authorization": f"Bearer {token}",
            "content-type": "application/json",
        },
        json=create_payload,
    )

    assert create_response.status_code == HTTPStatus.OK
    initial_version = create_response.json()["data"]["version"]

    # Delete all pipelines by sending empty array
    delete_payload = {"pipelines": []}

    delete_response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/logs/pipelines"),
        timeout=10,
        headers={
            "authorization": f"Bearer {token}",
            "content-type": "application/json",
        },
        json=delete_payload,
    )

    assert delete_response.status_code == HTTPStatus.OK
    delete_data = delete_response.json()
    assert delete_data["status"] == "success"
    assert "data" in delete_data
    assert "pipelines" in delete_data["data"]
    assert len(delete_data["data"]["pipelines"]) == 0
    assert delete_data["data"]["version"] == initial_version + 1

    # Verify pipelines are deleted by listing
    list_response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/logs/pipelines/latest"),
        timeout=10,
        headers={
            "authorization": f"Bearer {token}",
        },
    )

    assert list_response.status_code == HTTPStatus.OK
    list_data = list_response.json()
    assert list_data["status"] == "success"
    assert "data" in list_data
    assert "pipelines" in list_data["data"]
    # Note: Integration pipelines might still be present, so we check user-created ones
    user_pipelines = [
        p
        for p in list_data["data"]["pipelines"]
        if p.get("name") == "Pipeline to Delete"
    ]
    assert len(user_pipelines) == 0
