"""
Simpler version of jsontypeexporter for test fixtures.
This exports JSON type metadata to the path_types table by parsing JSON bodies
and extracting all paths with their types, similar to how the real jsontypeexporter works.
"""
import datetime
import json
from abc import ABC
from typing import TYPE_CHECKING, Any, Callable, Dict, Generator, List, Optional, Set, Union

import numpy as np
import pytest

from fixtures import types

if TYPE_CHECKING:
    from fixtures.logs import Logs


class JSONPathType(ABC):
    """Represents a JSON path with its type information"""
    path: str
    type: str
    last_seen: np.uint64

    def __init__(
        self,
        path: str,
        type: str,  # pylint: disable=redefined-builtin
        last_seen: Optional[datetime.datetime] = None,
    ) -> None:
        self.path = path
        self.type = type
        if last_seen is None:
            last_seen = datetime.datetime.now()
        self.last_seen = np.uint64(int(last_seen.timestamp() * 1e9))

    def np_arr(self) -> np.array:
        """Return path type data as numpy array for database insertion"""
        return np.array([self.path, self.type, self.last_seen])


# Constants matching jsontypeexporter
ARRAY_SEPARATOR = "[]."  # Used in paths like "education[].name"
ARRAY_SUFFIX = "[]"      # Used when traversing into array element objects


def _infer_array_type(elements: List[Any]) -> Optional[str]:
    """
    Infer array type from array elements, matching jsontypeexporter's inferArrayMask logic.
    Returns None if no valid type can be inferred.
    """
    if len(elements) == 0:
        return None

    # Collect element types (matching Go: types := make([]pcommon.ValueType, 0, s.Len()))
    types = []
    for elem in elements:
        if elem is None:
            continue
        if isinstance(elem, dict):
            types.append("JSON")
        elif isinstance(elem, str):
            types.append("String")
        elif isinstance(elem, bool):
            types.append("Bool")
        elif isinstance(elem, float):
            types.append("Float64")
        elif isinstance(elem, int):
            types.append("Int64")

    if len(types) == 0:
        return None

    # Get unique types (matching Go: unique := make(map[pcommon.ValueType]struct{}, len(types)))
    unique = set(types)

    # Classify types (matching Go logic)
    has_json = "JSON" in unique
    has_primitive = any(t in unique for t in ["String", "Bool", "Float64", "Int64"])

    if has_json:
        # If only JSON → Array(JSON) (no primitive types)
        if not has_primitive:
            return "Array(JSON)"
        # If there's JSON + any primitive → Dynamic
        return "Array(Dynamic)"

    # ---- Primitive Type Resolution ----
    if "String" in unique:
        # Strings cannot coerce with any other primitive
        if len(unique) > 1:
            return "Array(Dynamic)"
        return "Array(Nullable(String))"

    if "Float64" in unique:
        return "Array(Nullable(Float64))"
    if "Int64" in unique:
        return "Array(Nullable(Int64))"
    if "Bool" in unique:
        return "Array(Nullable(Bool))"

    return "Array(Dynamic)"


def _python_type_to_clickhouse_type(value: Any) -> str:
    """
    Convert Python type to ClickHouse JSON type string.
    Maps Python types to ClickHouse JSON data types.
    """
    if value is None:
        return "String"  # Default for null values
    
    if isinstance(value, bool):
        return "Bool"
    elif isinstance(value, int):
        return "Int64"
    elif isinstance(value, float):
        return "Float64"
    elif isinstance(value, str):
        return "String"
    elif isinstance(value, list):
        # Use the sophisticated array type inference
        array_type = _infer_array_type(value)
        return array_type if array_type else "Array(Dynamic)"
    elif isinstance(value, dict):
        return "JSON"
    else:
        return "String"  # Default fallback


def _extract_json_paths(
    obj: Any,
    current_path: str = "",
    path_types: Optional[Dict[str, Set[str]]] = None,
    level: int = 0,
) -> Dict[str, Set[str]]:
    """
    Recursively extract all paths and their types from a JSON object.
    Matches jsontypeexporter's analyzePValue logic.
    
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
        if current_path:
            if current_path not in path_types:
                path_types[current_path] = set()
            path_types[current_path].add("String")  # Null defaults to String
        return path_types
    
    if isinstance(obj, dict):
        # For objects, add the object itself and recurse into keys
        if current_path:
            if current_path not in path_types:
                path_types[current_path] = set()
            path_types[current_path].add("JSON")
        
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
            array_type = _infer_array_type(obj)
            if array_type and current_path:
                if current_path not in path_types:
                    path_types[current_path] = set()
                path_types[current_path].add(array_type)
    
    else:
        # Primitive value (string, number, bool)
        if current_path:
            if current_path not in path_types:
                path_types[current_path] = set()
            obj_type = _python_type_to_clickhouse_type(obj)
            path_types[current_path].add(obj_type)
    
    return path_types


def _parse_json_bodies_and_extract_paths(
    json_bodies: List[str],
    timestamp: Optional[datetime.datetime] = None,
) -> List[JSONPathType]:
    """
    Parse JSON bodies and extract all paths with their types.
    This mimics the behavior of jsontypeexporter.
    
    Args:
        json_bodies: List of JSON body strings to parse
        timestamp: Timestamp to use for last_seen (defaults to now)
    
    Returns:
        List of JSONPathType objects with all discovered paths and types
    """
    if timestamp is None:
        timestamp = datetime.datetime.now()
    
    # Aggregate all paths and their types across all JSON bodies
    all_path_types: Dict[str, Set[str]] = {}
    
    for json_body in json_bodies:
        try:
            parsed = json.loads(json_body)
            _extract_json_paths(parsed, "", all_path_types, level=0)
        except (json.JSONDecodeError, TypeError):
            # Skip invalid JSON
            continue
    
    # Convert to list of JSONPathType objects
    # Each path can have multiple types, so we create one JSONPathType per type
    path_type_objects: List[JSONPathType] = []
    for path, types_set in all_path_types.items():
        for type_str in types_set:
            path_type_objects.append(
                JSONPathType(path=path, type=type_str, last_seen=timestamp)
            )
    
    return path_type_objects


@pytest.fixture(name="export_json_types", scope="function")
def export_json_types(
    clickhouse: types.TestContainerClickhouse,
    request: pytest.FixtureRequest,  # To access migrator fixture
) -> Generator[Callable[[Union[List[JSONPathType], List[str], List[Any]]], None], Any, None]:
    """
    Fixture for exporting JSON type metadata to the path_types table.
    This is a simpler version of jsontypeexporter for test fixtures.
    
    The function can accept:
    1. List of JSONPathType objects (manual specification)
    2. List of JSON body strings (auto-extract paths)
    3. List of Logs objects (extract from body_json field)
    
    Usage examples:
        # Manual specification
        export_json_types([
            JSONPathType(path="user.name", type="String"),
            JSONPathType(path="user.age", type="Int64"),
        ])
        
        # Auto-extract from JSON strings
        export_json_types([
            '{"user": {"name": "alice", "age": 25}}',
            '{"user": {"name": "bob", "age": 30}}',
        ])
        
        # Auto-extract from Logs objects
        export_json_types(logs_list)
    """
    # Ensure migrator has run to create the table
    try:
        request.getfixturevalue("migrator")
    except Exception:
        # If migrator fixture is not available, that's okay - table might already exist
        pass
    
    def _export_json_types(
        data: Union[List[JSONPathType], List[str], List[Any]],  # List[Logs] but avoiding circular import
    ) -> None:
        """
        Export JSON type metadata to signoz_metadata.distributed_json_path_types table.
        This table stores path and type information for body JSON fields.
        """
        path_types: List[JSONPathType] = []
        
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
            # Assume it's a list of Logs objects - extract body_json
            json_bodies: List[str] = []
            for log in data:  # type: ignore
                # Try to get body_json attribute
                if hasattr(log, "body_json") and log.body_json:
                    json_bodies.append(log.body_json)
                elif hasattr(log, "body") and log.body:
                    # Fallback to body if body_json not available
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
            table="distributed_json_path_types",
            data=[path_type.np_arr() for path_type in path_types],
            column_names=[
                "path",
                "type",
                "last_seen",
            ],
        )

    yield _export_json_types

    # Cleanup - truncate the local table after tests (following pattern from logs fixture)
    clickhouse.conn.query(
        f"TRUNCATE TABLE signoz_metadata.json_path_types ON CLUSTER '{clickhouse.env['SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_CLUSTER']}' SYNC"
    )


@pytest.fixture(name="export_promoted_paths", scope="function")
def export_promoted_paths(
    clickhouse: types.TestContainerClickhouse,
    request: pytest.FixtureRequest,  # To access migrator fixture
) -> Generator[Callable[[List[str]], None], Any, None]:
    """
    Fixture for exporting promoted JSON paths to the promoted paths table.
    """
    # Ensure migrator has run to create the table
    try:
        request.getfixturevalue("migrator")
    except Exception:
        # If migrator fixture is not available, that's okay - table might already exist
        pass

    def _export_promoted_paths(paths: List[str]) -> None:
        if len(paths) == 0:
            return

        now_ms = int(datetime.datetime.now().timestamp() * 1000)
        rows = [(path, now_ms) for path in paths]
        clickhouse.conn.insert(
            database="signoz_metadata",
            table="distributed_json_promoted_paths",
            data=rows,
            column_names=[
                "path",
                "created_at",
            ],
        )

    yield _export_promoted_paths

    clickhouse.conn.query(
        f"TRUNCATE TABLE signoz_metadata.json_promoted_paths ON CLUSTER '{clickhouse.env['SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_CLUSTER']}' SYNC"
    )
