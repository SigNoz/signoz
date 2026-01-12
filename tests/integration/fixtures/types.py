from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union
from urllib.parse import urljoin

import clickhouse_connect
import clickhouse_connect.driver
import clickhouse_connect.driver.client
import py
from sqlalchemy import Engine

LegacyPath = py.path.local


@dataclass
class TestContainerUrlConfig:
    __test__ = False
    scheme: str
    address: str
    port: int

    def base(self) -> str:
        return f"{self.scheme}://{self.address}:{self.port}"

    def get(self, path: str) -> str:
        return urljoin(self.base(), path)

    def __cache__(self) -> dict:
        return {
            "scheme": self.scheme,
            "address": self.address,
            "port": self.port,
        }

    def __log__(self) -> str:
        return f"TestContainerUrlConfig(scheme={self.scheme}, address={self.address}, port={self.port})"


@dataclass
class TestContainerDocker:
    __test__ = False
    id: str
    host_configs: Dict[str, TestContainerUrlConfig]
    container_configs: Dict[str, TestContainerUrlConfig]

    @staticmethod
    def from_cache(cache: dict) -> "TestContainerDocker":
        return TestContainerDocker(
            id=cache["id"],
            host_configs={
                port: TestContainerUrlConfig(**config)
                for port, config in cache["host_configs"].items()
            },
            container_configs={
                port: TestContainerUrlConfig(**config)
                for port, config in cache["container_configs"].items()
            },
        )

    def __cache__(self) -> dict:
        return {
            "id": self.id,
            "host_configs": {
                port: config.__cache__() for port, config in self.host_configs.items()
            },
            "container_configs": {
                port: config.__cache__()
                for port, config in self.container_configs.items()
            },
        }

    def __log__(self) -> str:
        return f"TestContainerDocker(id={self.id}, host_configs={', '.join(host_config.__log__() for host_config in self.host_configs.values())}, container_configs={', '.join(container_config.__log__() for container_config in self.container_configs.values())})"


@dataclass
class TestContainerSQL:
    __test__ = False
    container: TestContainerDocker
    conn: Engine
    env: Dict[str, str]

    def __cache__(self) -> dict:
        return {
            "container": self.container.__cache__(),
            "env": self.env,
        }

    def __log__(self) -> str:
        return f"TestContainerSQL(container={self.container.__log__()}, env={self.env})"


@dataclass
class TestContainerClickhouse:
    __test__ = False
    container: TestContainerDocker
    conn: clickhouse_connect.driver.client.Client
    env: Dict[str, str]

    def __cache__(self) -> dict:
        return {
            "container": self.container.__cache__(),
            "env": self.env,
        }

    def __log__(self) -> str:
        return f"TestContainerClickhouse(container={self.container.__log__()}, env={self.env})"


@dataclass
class TestContainerIDP:
    __test__ = False
    container: TestContainerDocker

    def __cache__(self) -> dict:
        return {
            "container": self.container.__cache__(),
        }

    def __log__(self) -> str:
        return f"TestContainerIDP(container={self.container.__log__()})"


@dataclass
class SigNoz:
    __test__ = False
    self: TestContainerDocker
    sqlstore: TestContainerSQL
    telemetrystore: TestContainerClickhouse
    zeus: TestContainerDocker
    gateway: TestContainerDocker

    def __cache__(self) -> dict:
        return self.self.__cache__()

    def __log__(self) -> str:
        return f"SigNoz(self={self.self.__log__()}, sqlstore={self.sqlstore.__log__()}, telemetrystore={self.telemetrystore.__log__()}, zeus={self.zeus.__log__()}, gateway={self.gateway.__log__()})"


@dataclass
class Operation:
    __test__ = False
    name: str

    def __cache__(self) -> dict:
        return {"name": self.name}

    def __log__(self) -> str:
        return f"Operation(name={self.name})"


@dataclass
class Network:
    __test__ = False
    id: str
    name: str

    def __cache__(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
        }

    def __log__(self) -> str:
        return f"Network(id={self.id}, name={self.name})"

# Alerts types

class CompareOp(str, Enum):
    """Comparison operators for threshold conditions."""

    NONE = "0"
    ABOVE = "1"
    BELOW = "2"
    EQUAL = "3"
    NOT_EQUAL = "4"
    ABOVE_OR_EQUAL = "5"
    BELOW_OR_EQUAL = "6"
    OUTSIDE_BOUNDS = "7"


class MatchType(str, Enum):
    """Match types for threshold evaluation."""

    NONE = "0"
    AT_LEAST_ONCE = "1"
    ALL_THE_TIME = "2"
    ON_AVERAGE = "3"
    IN_TOTAL = "4"
    LAST = "5"


@dataclass
class Threshold:
    """Represents a single threshold specification."""

    name: str  # "critical" or "warning"
    target: float
    op: str = "1"  # "1" = above, "2" = below, "3" = equal, "4" = not_equal
    match_type: str = (
        "1"  # "1" = at_least_once, "2" = all_the_time, "3" = on_average, "4" = in_total, "5" = last
    )
    target_unit: str = ""
    channels: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "target": self.target,
            "op": self.op,
            "matchType": self.match_type,
            "targetUnit": self.target_unit,
            "channels": self.channels,
        }


@dataclass
class ThresholdsData:
    """Represents threshold configuration for a rule."""

    kind: str = "basic"
    spec: List[Threshold] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {"kind": self.kind, "spec": [t.to_dict() for t in self.spec]}


@dataclass
class MetricAggregation:
    """Represents a metric aggregation specification."""

    # this is the metric name to aggregate
    metric_name: str
    # this is the time aggregation to apply to the metric
    time_aggregation: str = "avg"  # avg, sum, min, max, count, latest
    # this is the space aggregation to apply to the metric
    space_aggregation: str = "avg"  # avg, sum, min, max, count, p50, p75, p90, p95

    def to_dict(self) -> Dict[str, Any]:
        return {
            "metricName": self.metric_name,
            "timeAggregation": self.time_aggregation,
            "spaceAggregation": self.space_aggregation,
        }


@dataclass
class Filter:
    """Represents a filter expression."""

    expression: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {"expression": self.expression}


@dataclass
class Having:
    """Represents a having clause."""

    expression: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {"expression": self.expression}


@dataclass
class MetricBuilderQuerySpec:
    """Represents a QueryBuilderQuery[MetricAggregation] specification."""

    name: str  # Query name (e.g., "A", "B")
    signal: str = "metrics"
    disabled: bool = False
    filter: Optional[Filter] = None
    aggregations: List[MetricAggregation] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "name": self.name,
            "signal": self.signal,
            "disabled": self.disabled,
            "filter": self.filter.to_dict() if self.filter else {"expression": ""},
            "aggregations": [agg.to_dict() for agg in self.aggregations],
        }
        return result


@dataclass
class QueryEnvelope:
    """
    Represents a query envelope that can contain different query types.
    For now, we only support builder queries for metrics.
    """

    type: str  # "builder_query", "builder_formula", "promql", "clickhouse_sql"
    spec: Union[MetricBuilderQuerySpec]  # The actual query specification

    def to_dict(self) -> Dict[str, Any]:
        return {"type": self.type, "spec": self.spec.to_dict()}


@dataclass
class CompositeQuery:
    """Represents the composite query structure for alert conditions."""

    query_type: str = "builder"  # builder, promql, clickhouse_sql
    panel_type: str = "graph"  # graph, table, list, etc.
    queries: List[QueryEnvelope] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "queryType": self.query_type,
            "panelType": self.panel_type,
            "queries": [q.to_dict() for q in self.queries],
        }
        return result


def default_notificaiton_settings() -> Dict[str, Any]:
    return {
        "groupBy": [],
        "usePolicy": False,
        "renotify": {
            "enabled": False,
            "interval": "30m",
            "alertStates": [],
        },
    }


def default_annotations() -> Dict[str, Any]:
    return {
        "description": "This alert is fired when the defined metric (current value: {{$value}}) crosses the threshold ({{$threshold}})",
        "summary": "This alert is fired when the defined metric (current value: {{$value}}) crosses the threshold ({{$threshold}})",
    }


def default_labels() -> Dict[str, Any]:
    return {
        "env": "test-env",
        "team": "test-team",
    }


@dataclass
class EvaluationSpec:
    """Represents evaluation specification."""

    eval_window: str = "5m0s"
    frequency: str = "1m"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "evalWindow": self.eval_window,
            "frequency": self.frequency,
        }


@dataclass
class Evaluation:
    """Represents evaluation configuration."""

    kind: str = "rolling"  # rolling or cumulative
    spec: EvaluationSpec = field(default_factory=EvaluationSpec)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "kind": self.kind,
            "spec": self.spec.to_dict(),
        }


@dataclass
class RuleCondition:
    """Represents the condition part of an alert rule."""

    composite_query: CompositeQuery
    thresholds: ThresholdsData
    selected_query_name: str = "A"
    alert_on_absent: bool = False
    absent_for: int = 0
    require_min_points: bool = False
    required_num_points: int = 0

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "compositeQuery": self.composite_query.to_dict(),
            "thresholds": self.thresholds.to_dict(),
            "selectedQueryName": self.selected_query_name,
            "alertOnAbsent": self.alert_on_absent,
            "absentFor": self.absent_for,
            "requireMinPoints": self.require_min_points,
            "requiredNumPoints": self.required_num_points,
        }
        return result


@dataclass
class PostableRule:
    """
    Represents a PostableRule that can be sent to the SigNoz API.
    This is a dataclass representation that can be modified and converted to dict.
    """

    # Required fields first (no defaults)
    alert: str
    condition: RuleCondition
    evaluation: Evaluation
    # Optional fields with defaults
    rule_type: str = "threshold_rule"
    alert_type: str = "METRIC_BASED_ALERT"
    labels: Dict[str, str] = field(default_factory=dict)
    annotations: Dict[str, str] = field(default_factory=default_annotations)
    notification_settings: Dict[str, Any] = field(
        default_factory=default_notificaiton_settings
    )
    version: str = "v5"
    schema_version: str = "v2alpha1"
    source: str = "https://localhost:3000"

    def with_threshold(
        self,
        target_value: float,
        compare_op: CompareOp = CompareOp.ABOVE,
        match_type: MatchType = MatchType.AT_LEAST_ONCE,
        severity: str = "critical",
        target_unit: str = "",
    ) -> "PostableRule":
        """
        Replaces the thresholds with a single threshold as provided config.

        Args:
            target_value: Threshold value
            compare_op: Comparison operator from CompareOp enum
            match_type: Match type from MatchType enum
            severity: Severity level (critical, warning)
            target_unit: Unit for threshold

        Returns:
            Self for chaining
        """
        threshold = Threshold(
            name=severity,
            target=target_value,
            op=compare_op.value,
            match_type=match_type.value,
            target_unit=target_unit,
        )

        self.condition.thresholds = ThresholdsData(kind="basic", spec=[threshold])
        return self

    def with_no_data(
        self,
        absent_for_minutes: int = 5,
    ) -> "PostableRule":
        """
        Configure alert to fire when no data is received.

        Args:
            absent_for_minutes: Duration in minutes to wait before alerting on no data

        Returns:
            Self for chaining
        """
        self.condition.alert_on_absent = True
        self.condition.absent_for = absent_for_minutes * 60  # Convert to seconds
        return self

    def with_annotations(self, annotations: Dict[str, str]) -> "PostableRule":
        """
        Replace annotations with the provided dict.

        Args:
            annotations: Dictionary of annotations to set

        Returns:
            Self for chaining
        """
        self.annotations = annotations
        return self

    def with_labels(self, labels: Dict[str, str]) -> "PostableRule":
        """
        Update labels with the provided dict.

        Args:
            labels: Dictionary of labels to add/update

        Returns:
            Self for chaining
        """
        self.labels.update(labels)
        return self

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary suitable for API payload."""
        result = {
            "alert": self.alert,
            "ruleType": self.rule_type,
            "alertType": self.alert_type,
            "condition": self.condition.to_dict(),
            "evaluation": self.evaluation.to_dict(),
            "labels": self.labels,
            "annotations": self.annotations,
            "notificationSettings": self.notification_settings,
            "version": self.version,
            "schemaVersion": self.schema_version,
            "source": self.source,
        }
        return result


def create_default_metric_rule(
    alert_name: str,
    metric_name: str,
    query_name: str = "A",
    time_aggregation: str = "avg",
    space_aggregation: str = "avg",
    eval_window: str = "5m0s",
    frequency: str = "1m",
) -> PostableRule:
    """
    Creates a default PostableRule with a single metric query.
    This is the base rule that can be customized using the fluent API.

    Args:
        alert_name: Name of the alert
        metric_name: Metric to monitor
        query_name: Query identifier (default: 'A')
        time_aggregation: Time aggregation (avg, sum, min, max, count, rate, increase, latest)
        space_aggregation: Space aggregation (avg, sum, min, max, count, p50, p75, p90, p95, p99)
        eval_window: Evaluation window (default: "5m0s")
        frequency: Evaluation frequency (default: "1m")

    Returns:
        PostableRule instance ready to be customized
    """
    # Create MetricAggregation
    metric_agg = MetricAggregation(
        metric_name=metric_name,
        time_aggregation=time_aggregation,
        space_aggregation=space_aggregation,
    )

    # Create MetricBuilderQuerySpec
    query_spec = MetricBuilderQuerySpec(
        name=query_name,
        signal="metrics",
        aggregations=[metric_agg],
    )

    # Create QueryEnvelope
    query_envelope = QueryEnvelope(type="builder_query", spec=query_spec)

    # Create CompositeQuery
    composite_query = CompositeQuery(
        query_type="builder",
        panel_type="graph",
        queries=[query_envelope],
    )

    # Create RuleCondition
    condition = RuleCondition(
        composite_query=composite_query,
        selected_query_name=query_name,
    )

    # Create Evaluation
    evaluation = Evaluation(
        kind="rolling",
        spec=EvaluationSpec(
            eval_window=eval_window,
            frequency=frequency,
        ),
    )

    # Create and return PostableRule (notification_settings will use default from PostableRule)
    return PostableRule(
        alert=alert_name,
        condition=condition,
        evaluation=evaluation,
    )

# Alerts manager test data types
class MetricValues:
    """Represents a list of metric values that our test case will need to ingest for alert evaluation."""
    metric_name: str
    labels: dict[str, str]
    values: list[float | None]
    temporality: str
    interval_sec: int

    def __init__(
        self,
        metric_name: str,
        labels: dict[str, str],
        values: list[float | None],
        temporality: str = "Unspecified",
        interval_sec: int = 60,
    ) -> None:
        self.metric_name = metric_name
        self.labels = labels
        self.values = values
        self.temporality = temporality
        self.interval_sec = interval_sec

    def to_metrics(self, start_time: Optional[datetime] = None):
        """
        Converts MetricValues to a list of Metrics objects suitable for insertion.
        
        Args:
            start_time: Starting timestamp. If None, uses current time minus (len(values) * interval_sec)
        
        Returns:
            List of Metrics objects with timestamps spaced by interval_sec
        """
        # Import here to avoid circular dependency
        from fixtures.metrics import Metrics
        from datetime import timedelta
        
        if start_time is None:
            # Calculate start time to ensure latest data point is "now"
            start_time = datetime.now() - timedelta(
                seconds=len(self.values) * self.interval_sec
            )
        
        metrics_list = []
        for idx, value in enumerate(self.values):
            if value is None:
                # Skip None values (missing data points)
                continue
            
            timestamp = start_time + timedelta(seconds=idx * self.interval_sec)
            
            metrics_list.append(
                Metrics(
                    metric_name=self.metric_name,
                    labels=self.labels,
                    timestamp=timestamp,
                    value=value,
                    temporality=self.temporality,
                    type_="Sum",
                    is_monotonic=False,
                )
            )
        
        return metrics_list

@dataclass
class AlertExpectations:
    """Defines what we expect to happen after the data is ingested."""
    should_fire: bool = False
    num_alerts: int = 0
    # Key-value pairs of labels that MUST be present in the alert payload
    verify_labels: Dict[str, str] = field(default_factory=dict)
    # Key-value pairs of annotations that MUST be present
    verify_annotations: Dict[str, str] = field(default_factory=dict)
    # Max time to wait for the alert (seconds)
    wait_time_sec: int = 120

@dataclass
class AlertTestCase:
    """
    A declarative definition of an Alert Test Scenario.
    """
    name: str
    description: str
    # The Rule Definition (PostableRule dataclass)
    rule: PostableRule
    # Input Data: List of MetricValues
    data: List[MetricValues]
    expectations: AlertExpectations = field(default_factory=AlertExpectations)
