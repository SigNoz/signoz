from typing import Any, Generator

import pytest

from fixtures import types


@pytest.fixture(scope="package")
def tmpfs(
    tmp_path_factory: pytest.TempPathFactory,
) -> Generator[types.LegacyPath, Any, None]:
    def _tmp(basename: str):
        return tmp_path_factory.mktemp(basename)

    yield _tmp
