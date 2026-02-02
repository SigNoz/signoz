import datetime
import os
from typing import Any

import isodate


# parses the given timestamp string from ISO format to datetime.datetime
def parse_timestamp(ts_str: str) -> datetime.datetime:
    """
    Parse a timestamp string from ISO format.
    """
    if ts_str.endswith("Z"):
        ts_str = ts_str[:-1] + "+00:00"
    return datetime.datetime.fromisoformat(ts_str)


# parses the given duration to datetime.timedelta
def parse_duration(duration: Any) -> datetime.timedelta:
    """
    Parse a duration string from ISO format.
    """
    # if it's string then parse it as iso format
    if isinstance(duration, str):
        return isodate.parse_duration(duration)
    if isinstance(duration, datetime.timedelta):
        return duration
    return datetime.timedelta(seconds=duration)


def get_testdata_file_path(file: str) -> str:
    testdata_dir = os.path.join(os.path.dirname(__file__), "..", "testdata")
    return os.path.join(testdata_dir, file)
