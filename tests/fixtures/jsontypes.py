"""
Simpler version of metadataexporter for exporting jsontypes for test fixtures.
This exports JSON type metadata to the path_types table by parsing JSON bodies
and extracting all paths with their types, similar to how the real metadataexporter works.
"""

import datetime
import json
from abc import ABC
from collections.abc import Callable, Generator
from http import HTTPStatus
from typing import (
    Any,
)

import numpy as np
import pytest
import requests

from fixtures import types


class JSONPathType(ABC):
    """Represents a JSON path with its type information"""

    field_name: str
    field_data_type: str
    last_seen: np.uint64
    signal: str = "logs"
    field_context: str = "body"

    def __init__(
        self,
        field_name: str,
        field_data_type: str,
        last_seen: datetime.datetime | None = None,
    ) -> None:
        self.field_name = field_name
        self.field_data_type = field_data_type
        self.signal = "logs"
        self.field_context = "body"
        if last_seen is None:
            last_seen = datetime.datetime.now()
        self.last_seen = np.uint64(int(last_seen.timestamp() * 1e9))

    def np_arr(self) -> np.array:
        """Return path type data as numpy array for database insertion"""
        return np.array([self.signal, self.field_context, self.field_name, self.field_data_type, self.last_seen])


# Constants matching metadataexporter
ARRAY_SEPARATOR = "[]."  # Used in paths like "education[].name"
ARRAY_SUFFIX = "[]"  # Used when traversing into array element objects


def _infer_array_type_from_type_strings(types: list[str]) -> str | None:
    """
    Infer array type from a list of pre-classified type strings.
    Matches metadataexporter's inferArrayMask logic.

    Internal type strings are: "JSON", "String", "Bool", "Float64", "Int64"

    SuperTyping rules (matching Go inferArrayMask):
    - JSON alone → []json
    - JSON + any primitive → []dynamic
    - String alone → []string; String + other → []dynamic
    - Float64 wins over Int64 and Bool
    - Int64 wins over Bool
    - Bool alone → []bool
    """
    if len(types) == 0:
        return None

    unique = set(types)

    has_json = "JSON" in unique
    # hasPrimitive mirrors Go: (hasJSON && len(unique) > 1) || (!hasJSON && len(unique) > 0)
    has_primitive = (has_json and len(unique) > 1) or (not has_json and len(unique) > 0)

    if has_json:
        if not has_primitive:
            return "[]json"
        return "[]dynamic"

    # ---- Primitive Type Resolution (Float > Int > Bool) ----
    if "String" in unique:
        if len(unique) > 1:
            return "[]dynamic"
        return "[]string"

    if "Float64" in unique:
        return "[]float64"
    if "Int64" in unique:
        return "[]int64"
    if "Bool" in unique:
        return "[]bool"

    return "[]dynamic"


def _infer_array_type(elements: list[Any]) -> str | None:
    """
    Infer array type from raw Python list elements.
    Classifies each element then delegates to _infer_array_type_from_type_strings.
    """
    if len(elements) == 0:
        return None

    types = []
    for elem in elements:
        if elem is None:
            continue
        if isinstance(elem, dict):
            types.append("JSON")
        elif isinstance(elem, str):
            types.append("String")
        elif isinstance(elem, bool):  # must be before int (bool is subclass of int)
            types.append("Bool")
        elif isinstance(elem, float):
            types.append("Float64")
        elif isinstance(elem, int):
            types.append("Int64")

    return _infer_array_type_from_type_strings(types)


def _python_type_to_clickhouse_type(value: Any) -> str:
    """
    Convert Python type to ClickHouse JSON type string.
    Maps Python types to ClickHouse JSON data types.
    Matches metadataexporter's mapPCommonValueTypeToDataType.
    """
    if isinstance(value, bool):
        return "bool"
    elif isinstance(value, int):
        return "int64"
    elif isinstance(value, float):
        return "float64"
    elif isinstance(value, str):
        return "string"
    elif isinstance(value, list):
        # Use the sophisticated array type inference
        array_type = _infer_array_type(value)
        return array_type if array_type else "[]dynamic"
    elif isinstance(value, dict):
        return "json"
    else:
        return "string"  # Default fallback


def _extract_json_paths(
    obj: Any,
    current_path: str = "",
    path_types: dict[str, set[str]] | None = None,
    level: int = 0,
) -> dict[str, set[str]]:
    """
    Recursively extract all paths and their types from a JSON object.
    Matches metadataexporter's analyzePValue logic.

    Args:
        obj: The JSON object to traverse
        current_path: Current path being built (e.g., "user.name")
        path_types: Dictionary mapping paths to sets of types found
        level: Current nesting level (for depth limiting)

    Returns:
        Dictionary mapping paths to sets of type strings
    """
    if path_types is None:
        path_types = {}

    if obj is None:
        # Skip null values — matches Go walkNode which errors on ValueTypeEmpty
        return path_types

    if isinstance(obj, dict):
        # For objects, recurse into keys without recording the object itself as a type.
        # Matches Go walkMap which recurses without calling ta.record on the map node.

        for key, value in obj.items():
            # Build the path for this key
            if current_path:
                new_path = f"{current_path}.{key}"
            else:
                new_path = key

            # Recurse into the value
            _extract_json_paths(value, new_path, path_types, level + 1)

    elif isinstance(obj, list):
        # Skip empty arrays
        if len(obj) == 0:
            return path_types

        # Collect types from array elements (matching Go: types := make([]pcommon.ValueType, 0, s.Len()))
        types = []

        for item in obj:
            if isinstance(item, dict):
                # When traversing into array element objects, use ArraySuffix ([])
                # This matches: prefix+ArraySuffix in the Go code
                # Example: if current_path is "education", we use "education[]" to traverse into objects
                array_prefix = current_path + ARRAY_SUFFIX if current_path else ""
                for key, value in item.items():
                    if array_prefix:
                        # Use array separator: education[].name
                        array_path = f"{array_prefix}.{key}"
                    else:
                        array_path = key
                    # Recurse without increasing level (matching Go behavior)
                    _extract_json_paths(value, array_path, path_types, level)
                types.append("JSON")
            elif isinstance(item, list):
                # Arrays inside arrays are not supported - skip the whole path
                # Matching Go: e.logger.Error("arrays inside arrays are not supported!", ...); return nil
                return path_types
            elif isinstance(item, str):
                types.append("String")
            elif isinstance(item, bool):
                types.append("Bool")
            elif isinstance(item, float):
                types.append("Float64")
            elif isinstance(item, int):
                types.append("Int64")

        # Infer array type from collected types (matching Go: if mask := inferArrayMask(types); mask != 0)
        if len(types) > 0:
            array_type = _infer_array_type_from_type_strings(types)
            if array_type and current_path:
                if current_path not in path_types:
                    path_types[current_path] = set()
                path_types[current_path].add(array_type)

    # Primitive value (string, number, bool)
    elif current_path:
        if current_path not in path_types:
            path_types[current_path] = set()
        obj_type = _python_type_to_clickhouse_type(obj)
        path_types[current_path].add(obj_type)

    return path_types


def _parse_json_bodies_and_extract_paths(
    json_bodies: list[str],
    timestamp: datetime.datetime | None = None,
) -> list[JSONPathType]:
    """
    Parse JSON bodies and extract all paths with their types.
    This mimics the behavior of metadataexporter.

    Args:
        json_bodies: List of JSON body strings to parse
        timestamp: Timestamp to use for last_seen (defaults to now)

    Returns:
        List of JSONPathType objects with all discovered paths and types
    """
    if timestamp is None:
        timestamp = datetime.datetime.now()

    # Aggregate all paths and their types across all JSON bodies
    all_path_types: dict[str, set[str]] = {}

    for json_body in json_bodies:
        try:
            parsed = json.loads(json_body)
            _extract_json_paths(parsed, "", all_path_types, level=0)
        except (json.JSONDecodeError, TypeError):
            # Skip invalid JSON
            continue

    # Convert to list of JSONPathType objects
    # Each path can have multiple types, so we create one JSONPathType per type
    path_type_objects: list[JSONPathType] = []
    for path, types_set in all_path_types.items():
        for type_str in types_set:
            path_type_objects.append(JSONPathType(field_name=path, field_data_type=type_str, last_seen=timestamp))

    return path_type_objects


@pytest.fixture(name="export_json_types", scope="function")
def export_json_types(
    clickhouse: types.TestContainerClickhouse,
) -> Generator[Callable[[list[JSONPathType] | list[str] | list[Any]], None], Any]:
    """
    Fixture for exporting JSON type metadata to the path_types table.
    This is a simpler version of metadataexporter for test fixtures.

    The function can accept:
    1. List of JSONPathType objects (manual specification)
    2. List of JSON body strings (auto-extract paths)
    3. List of Logs objects (extract from body_json field)

    Usage examples:
        # Manual specification
        export_json_types([
            JSONPathType(field_name="user.name", field_data_type="string"),
            JSONPathType(field_name="user.age", field_data_type="int64"),
        ])

        # Auto-extract from JSON strings
        export_json_types([
            '{"user": {"name": "alice", "age": 25}}',
            '{"user": {"name": "bob", "age": 30}}',
        ])

        # Auto-extract from Logs objects
        export_json_types(logs_list)
    """

    def _export_json_types(
        data: list[JSONPathType] | list[str] | list[Any],  # List[Logs] but avoiding circular import
    ) -> None:
        """
        Export JSON type metadata to signoz_metadata.distributed_field_keys table.
        This table stores signal, context, path, and type information for body JSON fields.
        """
        path_types: list[JSONPathType] = []

        if len(data) == 0:
            return

        # Determine input type and convert to JSONPathType list
        first_item = data[0]

        if isinstance(first_item, JSONPathType):
            # Already JSONPathType objects
            path_types = data  # type: ignore
        elif isinstance(first_item, str):
            # List of JSON strings - parse and extract paths
            path_types = _parse_json_bodies_and_extract_paths(data)  # type: ignore
        else:
            # Assume it's a list of Logs objects - extract body_v2
            json_bodies: list[str] = []
            for log in data:  # type: ignore
                # Try to get body_v2 attribute
                if hasattr(log, "body_v2") and log.body_v2:
                    json_bodies.append(log.body_v2)
                elif hasattr(log, "body") and log.body:
                    # Fallback to body if body_v2 not available
                    try:
                        # Try to parse as JSON
                        json.loads(log.body)
                        json_bodies.append(log.body)
                    except (json.JSONDecodeError, TypeError):
                        pass

            if json_bodies:
                path_types = _parse_json_bodies_and_extract_paths(json_bodies)

        if len(path_types) == 0:
            return

        clickhouse.conn.insert(
            database="signoz_metadata",
            table="distributed_field_keys",
            data=[path_type.np_arr() for path_type in path_types],
            column_names=[
                "signal",
                "field_context",
                "field_name",
                "field_data_type",
                "last_seen",
            ],
        )

    yield _export_json_types

    # Cleanup - truncate the local table after tests (following pattern from logs fixture)
    clickhouse.conn.query(f"TRUNCATE TABLE signoz_metadata.field_keys ON CLUSTER '{clickhouse.env['SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_CLUSTER']}' SYNC")


@pytest.fixture(name="create_json_index", scope="function")
def create_json_index(
    signoz: types.SigNoz,
) -> Generator[Callable[[str, list[dict[str, Any]]], None]]:
    """
    Create ClickHouse data-skipping indexes on body_v2 JSON sub-columns via
    POST /api/v1/logs/promote_paths.

    **Must be called BEFORE insert_logs** so that newly inserted data parts are
    covered by the index and the QB uses the indexed condition path.

    Each entry in `paths` follows the PromotePath API shape:
        {
            "path": "body.user.name",          # must start with "body."
            "indexes": [
                {
                    "fieldDataType": "string",   # string | int64 | float64
                    "type": "ngrambf_v1(3, 256, 2, 0)",  # or "minmax", "tokenbf_v1(...)"
                    "granularity": 1,
                }
            ],
        }

    Teardown drops every index created during the test by querying
    system.data_skipping_indices for matching expressions.

    Example::

        def test_foo(signoz, get_token, insert_logs, export_json_types, create_json_body_index):
            token = get_token(...)
            export_json_types(logs_list)
            create_json_body_index(token, [
                {"path": "body.user.name",
                 "indexes": [{"fieldDataType": "string", "type": "ngrambf_v1(3, 256, 2, 0)", "granularity": 1}]},
                {"path": "body.user.age",
                 "indexes": [{"fieldDataType": "int64", "type": "minmax", "granularity": 1}]},
            ])
            insert_logs(logs_list)   # data inserted after index exists — index is built automatically
    """
    created_paths: list[str] = []

    def _create_json_body_index(token: str, paths: list[dict[str, Any]]) -> None:
        response = requests.post(
            signoz.self.host_configs["8080"].get("/api/v1/logs/promote_paths"),
            headers={"authorization": f"Bearer {token}"},
            json=paths,
            timeout=30,
        )
        assert response.status_code == HTTPStatus.CREATED, f"Failed to create JSON body indexes: {response.status_code} {response.text}"
        for path in paths:
            # The API strips the "body." prefix before storing — mirror that here
            # so our cleanup query uses the bare path (e.g. "user.name").
            raw = path["path"].removeprefix("body.")
            if raw not in created_paths:
                created_paths.append(raw)

    yield _create_json_body_index

    if not created_paths:
        return

    cluster = signoz.telemetrystore.env["SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_CLUSTER"]
    for path in created_paths:
        result = signoz.telemetrystore.conn.query(f"SELECT name FROM system.data_skipping_indices WHERE database = 'signoz_logs' AND table = 'logs_v2' AND expr LIKE '%{path}%'")
        for (index_name,) in result.result_rows:
            signoz.telemetrystore.conn.query(f"ALTER TABLE signoz_logs.logs_v2 ON CLUSTER '{cluster}' DROP INDEX IF EXISTS `{index_name}`")
