from typing import Any, Generator

import py
import pytest

LEGACY_PATH = py.path.local


@pytest.fixture(scope="package")
def tmpfs(
    tmp_path_factory: pytest.TempPathFactory,
) -> Generator[LEGACY_PATH, Any, None]:
    def _tmp(basename: str):
        return tmp_path_factory.mktemp(basename)

    yield _tmp
