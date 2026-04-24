import os
from collections.abc import Generator
from typing import Any

import pytest

from fixtures import types


@pytest.fixture(scope="package")
def tmpfs(
    tmp_path_factory: pytest.TempPathFactory,
) -> Generator[types.LegacyPath, Any]:
    def _tmp(basename: str):
        return tmp_path_factory.mktemp(basename)

    yield _tmp


def get_testdata_file_path(file: str) -> str:
    # Integration testdata lives at tests/integration/testdata/. This helper
    # resolves from tests/fixtures/fs.py, so walk up to tests/ and across.
    testdata_dir = os.path.join(os.path.dirname(__file__), "..", "integration", "testdata")
    return os.path.join(testdata_dir, file)
