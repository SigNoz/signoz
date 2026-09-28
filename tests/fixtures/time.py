import datetime
import time
from typing import Any

import isodate


# parses the given timestamp string from ISO format to datetime.datetime
def parse_timestamp(ts_str: str) -> datetime.datetime:
    if ts_str.endswith("Z"):
        ts_str = ts_str[:-1] + "+00:00"
    return datetime.datetime.fromisoformat(ts_str)


# parses the given duration to datetime.timedelta
def parse_duration(duration: Any) -> datetime.timedelta:
    # if it's string then parse it as iso format
    if isinstance(duration, str):
        return isodate.parse_duration(duration)
    if isinstance(duration, datetime.timedelta):
        return duration
    return datetime.timedelta(seconds=duration)


def wait_until_second_of_minute(low: int, high: int) -> None:
    """Block until the wall-clock second is within [low, high]."""
    while not low <= datetime.datetime.now(tz=datetime.UTC).second <= high:
        time.sleep(1)
