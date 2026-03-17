from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Union


@dataclass
class TelemetryFieldKey:
    name: str
    field_data_type: str
    field_context: str

    def to_dict(self) -> Dict:
        return {
            "name": self.name,
            "fieldDataType": self.field_data_type,
            "fieldContext": self.field_context,
        }


@dataclass
class OrderBy:
    key: TelemetryFieldKey
    direction: str = "asc"

    def to_dict(self) -> Dict:
        return {"key": self.key.to_dict(), "direction": self.direction}


@dataclass
class BuilderQuery:
    signal: str
    name: str = "A"
    limit: Optional[int] = None
    filter_expression: Optional[str] = None
    select_fields: Optional[List[TelemetryFieldKey]] = None
    order: Optional[List[OrderBy]] = None

    def to_dict(self) -> Dict:
        spec: Dict[str, Any] = {
            "signal": self.signal,
            "name": self.name,
        }
        if self.limit is not None:
            spec["limit"] = self.limit
        if self.filter_expression:
            spec["filter"] = {"expression": self.filter_expression}
        if self.select_fields:
            spec["selectFields"] = [f.to_dict() for f in self.select_fields]
        if self.order:
            spec["order"] = [o.to_dict() for o in self.order]
        return {"type": "builder_query", "spec": spec}


@dataclass
class TraceOperatorQuery:
    name: str
    expression: str
    return_spans_from: str
    limit: Optional[int] = None
    order: Optional[List[OrderBy]] = None

    def to_dict(self) -> Dict:
        spec: Dict[str, Any] = {
            "name": self.name,
            "expression": self.expression,
            "returnSpansFrom": self.return_spans_from,
        }
        if self.limit is not None:
            spec["limit"] = self.limit
        if self.order:
            spec["order"] = [o.to_dict() for o in self.order]
        return {"type": "builder_trace_operator", "spec": spec}


@dataclass
class QueryRangeRequest:
    start: int  # nanoseconds
    end: int  # nanoseconds
    queries: List[Union[BuilderQuery, TraceOperatorQuery]]
    request_type: Optional[str] = "raw"

    def to_dict(self) -> Dict:
        body: Dict[str, Any] = {
            "start": self.start,
            "end": self.end,
            "compositeQuery": {
                "queries": [q.to_dict() for q in self.queries],
            },
        }
        if self.request_type is not None:
            body["requestType"] = self.request_type
        return body
