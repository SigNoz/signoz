from abc import ABC
from typing import Any


class LogsOrTracesFingerprint(ABC):
    attributes: dict[str, Any]

    def __init__(self, attributes: dict[str, Any]) -> None:
        self.attributes = attributes

    def calculate(self) -> str:
        parts = []
        for attr in self.attributes:
            parts.append(f"{attr}={self.attributes[attr]}")

        fhash = LogsOrTracesFingerprint.hash(self.attributes)
        parts.append(f"hash={fhash}")

        return ";".join(parts)

    @staticmethod
    def hash(attributes: dict[str, Any]) -> int:
        # FNV-1a constants
        offset64 = 14695981039346656037
        prime64 = 1099511628211
        separator_byte = 255

        if not attributes:
            return offset64

        def hash_add(h: int, s: str) -> int:
            """Add a string to a fnv64a hash value, returning the updated hash."""
            for char in s:
                h ^= ord(char)
                h = (h * prime64) & 0xFFFFFFFFFFFFFFFF  # Keep 64-bit
            return h

        def hash_add_byte(h: int, b: int) -> int:
            """Add a byte to a fnv64a hash value, returning the updated hash."""
            h ^= b
            h = (h * prime64) & 0xFFFFFFFFFFFFFFFF  # Keep 64-bit
            return h

        # Sort keys to ensure consistent hash
        keys = sorted(attributes.keys())

        sum_hash = offset64
        for key in keys:
            sum_hash = hash_add(sum_hash, key)
            sum_hash = hash_add_byte(sum_hash, separator_byte)
            sum_hash = hash_add(sum_hash, str(attributes[key]))
            sum_hash = hash_add_byte(sum_hash, separator_byte)

        return sum_hash
