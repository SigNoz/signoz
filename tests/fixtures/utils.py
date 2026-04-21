# Deprecation shim: fixtures.utils split into fixtures.time (parse_timestamp,
# parse_duration) and fixtures.fs (get_testdata_file_path) — "utils" said
# nothing. To be removed once all integration/ import sites are swept.
# pylint: disable=unused-import
from fixtures.fs import get_testdata_file_path  # noqa: F401
from fixtures.time import parse_duration, parse_timestamp  # noqa: F401
