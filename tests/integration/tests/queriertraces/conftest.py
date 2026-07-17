from typing import Any

import pytest

# ============================================================================
# Clean / corrupt factor (shared across the traces querier tests)
# ============================================================================
# Colliding/corrupt metadata mixed into every seeded span in the "corrupt"
# variant of the list/aggregation tests. It injects:
#   - intrinsic column names as span attributes (timestamp, duration_nano, ...)
#   - calculated column names as span attributes (http_method, db_name, ...)
#   - a key (service.name) present in both attributes and resources
# Values deliberately mix Python types (str / int / float / bool) so the
# collision also spans the attributes_string / attributes_number /
# attributes_bool type-variant columns — e.g. a string attribute named
# duration_nano vs the numeric intrinsic, a numeric attribute named
# response_status_code vs the string calculated column, a bool attribute named
# db_name vs the string calculated column.
# Field-key collision resolution must keep the real intrinsic/calculated/resource
# columns winning regardless of the attribute's type, so every assertion holds
# identically for clean and corrupt spans. The corrupt values only ever surface
# inside the raw `attributes` map.
CORRUPT_ATTRIBUTES: dict[str, Any] = {
    # intrinsic names (real column type in comment)
    "timestamp": "corrupt_data",  # string vs number
    "trace_id": 12345,  # number vs string
    "span_id": True,  # bool vs string
    "parent_span_id": "corrupt_data",  # string vs string
    "trace_state": 99,  # number vs string
    "flags": "corrupt_data",  # string vs number
    "name": 42,  # number vs string
    "kind": "corrupt_data",  # string vs number
    "kind_string": 7,  # number vs string
    "duration_nano": "corrupt_data",  # string vs number
    "status_code": True,  # bool vs number
    "status_message": 500,  # number vs string
    "status_code_string": False,  # bool vs string
    # calculated names (real column type in comment)
    "response_status_code": 999,  # number vs string
    "external_http_url": 8080,  # number vs string
    "http_url": True,  # bool vs string
    "external_http_method": 1,  # number vs string
    "http_method": False,  # bool vs string
    "http_host": 12,  # number vs string
    "db_name": True,  # bool vs string
    "db_operation": 3.5,  # number vs string
    "has_error": "corrupt_data",  # string vs bool
    "is_remote": 1,  # number vs string
    # collides with the resource key of the same name
    "service.name": "collision-attr-value",
}
# Resources are always stored as strings, so the resource-side collision only
# varies the key names.
CORRUPT_RESOURCES: dict[str, Any] = {
    "timestamp": "corrupt_data",
    "duration_nano": "corrupt_data",
    "http_method": "corrupt_data",
}


@pytest.fixture(name="trace_noise", params=["clean", "corrupt"])
def trace_noise(request: pytest.FixtureRequest) -> tuple[dict[str, Any], dict[str, Any]]:
    """(extra_attributes, extra_resources) merged into every span a traces test
    seeds. The 'clean' variant adds nothing; the 'corrupt' variant injects
    colliding intrinsic/calculated field names and an attribute/resource
    collision so each test doubles as a collision-robustness check."""
    if request.param == "clean":
        return {}, {}
    return dict(CORRUPT_ATTRIBUTES), dict(CORRUPT_RESOURCES)
