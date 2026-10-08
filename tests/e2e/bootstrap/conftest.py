import pytest


@pytest.fixture(name="base_path", scope="package")
def base_path() -> str:
    """URL path prefix SigNoz is served under. Empty serves it at the root;
    basepath/conftest.py overrides it."""
    return ""
