from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional


def expected_minutely_bucket_timestamps_ms(now: datetime) -> List[List[int]]:
    previous_five = [
        int((now - timedelta(minutes=m)).timestamp() * 1000) for m in range(5, 0, -1)
    ]
    with_current = previous_five + [int(now.timestamp() * 1000)]
    return [previous_five, with_current]


def assert_minutely_bucket_timestamps(
    points: List[Dict[str, Any]],
    now: datetime,
    *,
    context: str,
) -> List[int]:
    expected = expected_minutely_bucket_timestamps_ms(now)
    actual = [p["timestamp"] for p in points]
    assert actual in expected, f"Unexpected timestamps for {context}: {actual}"
    return actual


def assert_minutely_bucket_values(
    points: List[Dict[str, Any]],
    now: datetime,
    *,
    expected_by_ts: Dict[int, float],
    context: str,
) -> None:
    timestamps = assert_minutely_bucket_timestamps(points, now, context=context)
    expected = {ts: 0 for ts in timestamps}
    expected.update(expected_by_ts)

    for point in points:
        ts = point["timestamp"]
        assert point["value"] == expected[ts], (
            f"Unexpected value for {context} at timestamp={ts}: "
            f"got {point['value']}, expected {expected[ts]}"
        )


def index_series_by_label(
    series: List[Dict[str, Any]],
    label_name: str,
) -> Dict[str, Dict[str, Any]]:
    series_by_label: Dict[str, Dict[str, Any]] = {}
    for s in series:
        label = next(
            (
                l
                for l in s.get("labels", [])
                if l.get("key", {}).get("name") == label_name
            ),
            None,
        )
        assert label is not None, f"Expected {label_name} label in series"
        series_by_label[label["value"]] = s
    return series_by_label


def find_named_result(
    results: List[Dict[str, Any]],
    name: str,
) -> Optional[Dict[str, Any]]:
    return next(
        (
            r
            for r in results
            if r.get("name") == name
            or r.get("queryName") == name
            or (r.get("spec") or {}).get("name") == name
        ),
        None,
    )
