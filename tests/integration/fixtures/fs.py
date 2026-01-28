import os
from typing import Any, Callable, Generator

import pytest

from fixtures import types


@pytest.fixture(scope="package")
def tmpfs(
    tmp_path_factory: pytest.TempPathFactory,
) -> Generator[types.LegacyPath, Any, None]:
    def _tmp(basename: str):
        return tmp_path_factory.mktemp(basename)

    yield _tmp

@pytest.fixture(scope="function")
def get_testdata_file_path() -> Callable[[str], str]:
    def _get_testdata_file_path(file: str) -> str:
        testdata_dir = os.path.join(os.path.dirname(__file__), "..", "testdata")
        return os.path.join(testdata_dir, file)
    return _get_testdata_file_path
