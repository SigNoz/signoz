# **Alert Framework Implementation Guide**

This guide details the architecture, design decisions, and implementation status for the SigNoz Alert Integration Testing Framework. It is designed to help developers understand *how* to write new tests and *why* specific design choices were made.

## **1. Context: E2E Testing Strategy**

The primary goal of this framework is to enable **End-to-End (E2E) Testing** of the Alerting Pipeline (specifically the Rule Manager logic) without the boilerplate overhead associated with integration tests.

In a typical E2E test, you have to:

1. **setup**: Create a rule with valid JSON payload
2. **trigger**: Ingest data series with specific timestamps
3. **validate**: Poll an external system (WireMock webhook) to verify the alert fired

### **The Problem**

Doing this manually for 50+ alert scenarios leads to massive duplication:

- **Repetitive Config**: PostableRule JSON is ~50 lines with complex nested structures
- **Complex Data**: Calculating timestamps for 100 data points relative to `now()` is error-prone
- **Flaky Validation**: Polling logic requires retries and timeout handling
- **Type Safety**: Raw JSON/dict structures are error-prone (typos, missing fields)

### **The Solution: Dataclass-Based Framework**

We define test cases as **Python Dataclasses** (`AlertTestCase`). The framework handles the infrastructure:

- **Type Safety**: Uses Python dataclasses that match the SigNoz API structure exactly
- **Enums**: CompareOp and MatchType enums for threshold configuration
- **Data Generation**: `MetricValues` class with automatic timestamp calculation
- **Validation**: `AlertExpectations` with retry logic and webhook verification
- **Orchestration**: `AlertFramework` handles setup, execution, and cleanup

## **2. Implementation Status**

### **Completed Components**

#### **2.1 Core Dataclasses** (`tests/integration/types/alerts.py`)

All dataclasses match the SigNoz API v5 structure exactly:

- ✅ **PostableRule** - Main rule definition with fluent API methods
- ✅ **RuleCondition** - Condition logic with composite query and thresholds
- ✅ **CompositeQuery** - Query structure supporting multiple query types
- ✅ **QueryEnvelope** - Wrapper for different query types (builder_query, promql, etc.)
- ✅ **MetricBuilderQuerySpec** - Builder query specification for metrics
- ✅ **MetricAggregation** - Time and space aggregation configuration
- ✅ **Threshold** - Threshold specification with severity, target, op, matchType
- ✅ **ThresholdsData** - Container for threshold specifications
- ✅ **Evaluation** - Evaluation window and frequency configuration
- ✅ **Filter** - Filter expression wrapper
- ✅ **Having** - Having clause wrapper

#### **2.2 Enums** (`tests/integration/types/alerts.py`)

```python
class CompareOp(str, Enum):
    """Comparison operators for threshold conditions."""
    NONE = "0"
    ABOVE = "1"              # Value > threshold
    BELOW = "2"              # Value < threshold
    EQUAL = "3"              # Value == threshold
    NOT_EQUAL = "4"          # Value != threshold
    ABOVE_OR_EQUAL = "5"     # Value >= threshold
    BELOW_OR_EQUAL = "6"     # Value <= threshold
    OUTSIDE_BOUNDS = "7"     # Value outside range

class MatchType(str, Enum):
    """Match types for threshold evaluation."""
    NONE = "0"
    AT_LEAST_ONCE = "1"      # Any point matches
    ALL_THE_TIME = "2"       # All points match
    ON_AVERAGE = "3"         # Average matches
    IN_TOTAL = "4"           # Sum matches
    LAST = "5"               # Last point matches
```

#### **2.3 PostableRule Fluent API**

The following methods are implemented for rule customization:

1. **`with_threshold(target_value, compare_op, match_type, severity, target_unit)`**
   - Replaces thresholds with a single threshold
   - Uses CompareOp and MatchType enums
   - Returns self for chaining

2. **`with_no_data(absent_for_minutes)`**
   - Configures alert to fire when no data is received
   - Sets `alertOnAbsent=True` and `absentFor` duration
   - Returns self for chaining

3. **`with_annotations(annotations)`**
   - Replaces annotations dict completely
   - Returns self for chaining

4. **`with_labels(labels)`**
   - Updates labels dict (merges with existing)
   - Returns self for chaining

#### **2.4 Data Generation** (`tests/integration/src/alerts/framework.py`)

```python
class MetricValues:
    """Represents time-series data to inject"""
    metric_name: str
    labels: dict[str, str]
    values: list[float | None]  # None = missing data point
    temporality: str = "Unspecified"
    interval_sec: int = 60
    
    def to_metrics(self, start_time=None) -> List[Metrics]:
        """Converts to Metrics objects with automatic timestamp calculation"""
```

**Features:**
- Automatic timestamp calculation relative to `now()`
- Supports missing data points (None values)
- Configurable interval between points
- Generates both time_series_v4 and samples_v4 entries

#### **2.5 Test Definition**

```python
@dataclass
class AlertTestCase:
    name: str
    description: str
    rule: PostableRule            # Type-safe rule definition
    data: List[MetricValues]      # Data to inject
    expectations: AlertExpectations

@dataclass
class AlertExpectations:
    should_fire: bool = False
    num_alerts: int = 0
    verify_labels: Dict[str, str] = field(default_factory=dict)
    verify_annotations: Dict[str, str] = field(default_factory=dict)
    wait_time_sec: int = 120
```

#### **2.6 Orchestration** (`AlertFramework`)

- ✅ `setup_test_channel()` - Creates WireMock webhook channel (reusable)
- ✅ `create_rule()` - POSTs rule to `/api/v1/rules`
- ✅ `inject_data()` - Inserts into ClickHouse via fixtures
- ✅ `verify_alert_fired()` - Polls WireMock with retry logic
- ✅ `run_test()` - End-to-end orchestration
- ✅ `cleanup()` - Deletes rules and resets WireMock

## **3. Usage Example**

### **Basic Threshold Alert Test**

```python
from types.alerts import PostableRule, CompareOp, MatchType
from src.alerts.framework import (
    AlertFramework,
    AlertTestCase,
    AlertExpectations,
    MetricValues,
    create_default_metric_rule,
)

def test_cpu_alert(alert_framework: AlertFramework):
    # 1. Create the rule
    rule = create_default_metric_rule(
        alert_name="High CPU Alert",
        metric_name="cpu_usage_percent",
        time_aggregation="avg",
        space_aggregation="avg",
    )
    
    # 2. Configure threshold using enums
    rule.with_threshold(
        target_value=80.0,
        compare_op=CompareOp.ABOVE,
        match_type=MatchType.AT_LEAST_ONCE,
        severity="critical",
    )
    
    # 3. Add labels
    rule.with_labels({"team": "platform", "service": "backend"})
    
    # 4. Define test data
    data = MetricValues(
        metric_name="cpu_usage_percent",
        labels={"host": "server-1"},
        values=[50.0, 60.0, 70.0, 85.0, 90.0],  # Spike to 85-90
        interval_sec=60,
    )
    
    # 5. Define expectations
    expectations = AlertExpectations(
        should_fire=True,
        num_alerts=1,
        verify_labels={"severity": "critical"},
    )
    
    # 6. Create and run test case
    test_case = AlertTestCase(
        name="CPU Alert Test",
        description="Alert fires when CPU > 80%",
        rule=rule,
        data=[data],
        expectations=expectations,
    )
    
    alert_framework.run_test(test_case)
```

### **No Data Alert Test**

```python
def test_no_data_alert(alert_framework: AlertFramework):
    rule = create_default_metric_rule(
        alert_name="Service Heartbeat Missing",
        metric_name="heartbeat_count",
    ).with_threshold(
        target_value=1.0,
        compare_op=CompareOp.BELOW,
        match_type=MatchType.LAST,
    ).with_no_data(
        absent_for_minutes=5,  # Alert after 5 minutes of no data
    )
    
    # Test with missing data
    data = MetricValues(
        metric_name="heartbeat_count",
        labels={"service": "worker"},
        values=[1.0, 1.0, None, None, None],  # Data stops
    )
    
    expectations = AlertExpectations(should_fire=True, num_alerts=1)
    
    test_case = AlertTestCase(
        name="No Data Alert",
        description="Alert fires when data is absent",
        rule=rule,
        data=[data],
        expectations=expectations,
    )
    
    alert_framework.run_test(test_case)
```

### **Custom Annotations Test**

```python
def test_custom_annotations(alert_framework: AlertFramework):
    rule = create_default_metric_rule(
        alert_name="Error Rate High",
        metric_name="error_rate",
    ).with_threshold(
        target_value=0.05,
        compare_op=CompareOp.ABOVE,
        match_type=MatchType.ON_AVERAGE,
    ).with_annotations({
        "summary": "Error rate exceeded 5%",
        "description": "The error rate is {{$value | humanizePercentage}}, threshold is {{$threshold}}",
        "runbook_url": "https://wiki.example.com/runbooks/high-error-rate",
    })
    
    data = MetricValues(
        metric_name="error_rate",
        labels={"service": "api"},
        values=[0.03, 0.04, 0.06, 0.07, 0.08],
    )
    
    expectations = AlertExpectations(
        should_fire=True,
        num_alerts=1,
        verify_annotations={"runbook_url": "https://wiki.example.com/runbooks/high-error-rate"},
    )
    
    test_case = AlertTestCase(
        name="Custom Annotations Test",
        description="Verify custom annotations are included",
        rule=rule,
        data=[data],
        expectations=expectations,
    )
    
    alert_framework.run_test(test_case)
```

### **Why Dataclasses over YAML/JSON?**

1. **Type Safety**: IDE autocomplete, compile-time checks
2. **Dynamic Data**: Can use Python expressions like `[50]*10 + [90]*5`
3. **Enums**: `CompareOp.ABOVE` vs error-prone `"1"` or `"above"`
4. **Fluent API**: Chain methods for readable configuration
5. **Validation**: Dataclass validation at construction time

## **4. Helper Functions**

### **`create_default_metric_rule()`**

Factory function that creates a PostableRule with a single metric query:

```python
def create_default_metric_rule(
    alert_name: str,
    metric_name: str,
    query_name: str = "A",
    time_aggregation: str = "avg",
    space_aggregation: str = "avg",
    eval_window: str = "5m0s",
    frequency: str = "1m",
) -> PostableRule
```

**Returns:** A fully configured PostableRule ready for customization via fluent API.

**Internally creates:**
- MetricAggregation with specified aggregations
- MetricBuilderQuerySpec with the metric query
- QueryEnvelope wrapping the query
- CompositeQuery with the query envelope
- RuleCondition with the composite query
- Evaluation with rolling window configuration
- PostableRule with all components assembled

## **5. Test Case Inventory**

### **5.1 Rule Threshold Combinations (P0)**

*Combinations of Match Type (5) and Compare Operator (7)*

| **Test Case Name** | **Enum Values** | **Description** | **Status** |
| --- | --- | --- | --- |
| **Threshold - Above - At Least Once** | `CompareOp.ABOVE`, `MatchType.AT_LEAST_ONCE` | Trigger if *any* data point > threshold | Framework Ready |
| **Threshold - Above - All the Time** | `CompareOp.ABOVE`, `MatchType.ALL_THE_TIME` | Trigger if *all* points > threshold | Framework Ready |
| **Threshold - Above - In Total** | `CompareOp.ABOVE`, `MatchType.IN_TOTAL` | Trigger if *sum* > threshold | Framework Ready |
| **Threshold - Above - Average** | `CompareOp.ABOVE`, `MatchType.ON_AVERAGE` | Trigger if *average* > threshold | Framework Ready |
| **Threshold - Above - Last** | `CompareOp.ABOVE`, `MatchType.LAST` | Trigger if *last* point > threshold | Framework Ready |
| **Threshold - Below - At Least Once** | `CompareOp.BELOW`, `MatchType.AT_LEAST_ONCE` | Trigger if *any* point < threshold | Framework Ready |
| **Threshold - Below - All the Time** | `CompareOp.BELOW`, `MatchType.ALL_THE_TIME` | Trigger if *all* points < threshold | Framework Ready |
| **Threshold - Below - In Total** | `CompareOp.BELOW`, `MatchType.IN_TOTAL` | Trigger if *sum* < threshold | Framework Ready |
| **Threshold - Below - Average** | `CompareOp.BELOW`, `MatchType.ON_AVERAGE` | Trigger if *average* < threshold | Framework Ready |
| **Threshold - Below - Last** | `CompareOp.BELOW`, `MatchType.LAST` | Trigger if *last* point < threshold | Framework Ready |
| **Threshold - Equal - At Least Once** | `CompareOp.EQUAL`, `MatchType.AT_LEAST_ONCE` | Trigger if *any* point == threshold | Framework Ready |
| **Threshold - Equal - All the Time** | `CompareOp.EQUAL`, `MatchType.ALL_THE_TIME` | Trigger if *all* points == threshold | Framework Ready |
| **Threshold - Equal - Average** | `CompareOp.EQUAL`, `MatchType.ON_AVERAGE` | Trigger if *average* == threshold | Framework Ready |
| **Threshold - Equal - Last** | `CompareOp.EQUAL`, `MatchType.LAST` | Trigger if *last* point == threshold | Framework Ready |
| **Threshold - NotEqual - At Least Once** | `CompareOp.NOT_EQUAL`, `MatchType.AT_LEAST_ONCE` | Trigger if *any* point != threshold | Framework Ready |
| **Threshold - Above or Equal** | `CompareOp.ABOVE_OR_EQUAL`, `MatchType.AT_LEAST_ONCE` | Trigger if *any* point >= threshold | Framework Ready |
| **Threshold - Below or Equal** | `CompareOp.BELOW_OR_EQUAL`, `MatchType.AT_LEAST_ONCE` | Trigger if *any* point <= threshold | Framework Ready |
| **Threshold - Outside Bounds** | `CompareOp.OUTSIDE_BOUNDS`, `MatchType.AT_LEAST_ONCE` | Trigger if value outside range | Framework Ready |

### **5.2 Special Conditions (P0-P1)**

| **Test Case Name** | **Method** | **Description** | **Status** |
| --- | --- | --- | --- |
| **No Data Alert** | `.with_no_data(absent_for_minutes=5)` | Alert fires when no data for N minutes | Framework Ready |
| **Multi-Threshold (Critical + Warning)** | Multiple thresholds in spec | Different severity based on value | Needs Implementation |
| **Custom Annotations** | `.with_annotations({...})` | Verify custom annotations in alert | Framework Ready |
| **Custom Labels** | `.with_labels({...})` | Verify custom labels in alert | Framework Ready |

### **5.3 Planned Tests (P1-P2)**

| **Test Case Name** | **Description** | **Status** |
| --- | --- | --- |
| **Unit Conversion - Bytes** | Verify threshold handles unit normalization (1GB vs 1024MB) | Pending |
| **Unit Conversion - Time** | Verify threshold handles time units (1m vs 60s) | Pending |
| **Eval Window - Rolling** | Verify rolling window evaluation | Pending |
| **Required Min Points** | Alert doesn't fire if insufficient data points | Pending |
| **Alert History Recording** | Verify firing/resolved events in history | Pending |

## **6. Key Design Decisions**

### **6.1 Dataclasses Over Dicts**
- **Rationale**: Type safety, IDE autocomplete, validation at construction
- **Benefit**: Catches typos and missing fields at development time

### **6.2 Enums for Operators**
- **Rationale**: API uses numeric codes ("1", "2", etc.) which are error-prone
- **Benefit**: `CompareOp.ABOVE` is self-documenting vs `"1"`

### **6.3 Fluent API**
- **Rationale**: Allows progressive refinement of default rules
- **Benefit**: Chain methods for readable configuration

### **6.4 Separate Types Module**
- **Location**: `tests/integration/types/alerts.py`
- **Rationale**: Reusable across multiple test files
- **Benefit**: Single source of truth for API structure

## **7. File Structure**

```
tests/integration/
├── types/
│   └── alerts.py              # Core dataclasses, enums, PostableRule
├── src/alerts/
│   ├── framework.py           # AlertFramework, MetricValues, test orchestration
│   ├── test_threshold_rules.py   # Example tests (to be implemented)
│   ├── example_usage.py       # Usage examples
│   └── README.md              # User documentation
└── fixtures/
    ├── metrics.py             # Metrics insertion fixture
    ├── logs.py                # Logs insertion fixture
    └── types.py               # SigNoz container types
```

## **8. Running Tests**

```bash
# Run all alert tests
poetry run pytest --basetemp=./tmp/ -vv --reuse src/alerts/

# Run specific test
poetry run pytest --basetemp=./tmp/ -vv --reuse \
    src/alerts/test_threshold_rules.py::test_threshold_above_at_least_once

# With verbose logging
poetry run pytest --basetemp=./tmp/ -vv --reuse \
    --log-cli-level=INFO src/alerts/
```

## **9. Next Steps**

### **Immediate (P0)**
1. ✅ Complete dataclass definitions
2. ✅ Implement enums for CompareOp and MatchType
3. ✅ Implement fluent API methods (with_threshold, with_no_data, with_annotations, with_labels)
4. ✅ Implement create_default_metric_rule() helper
5. ✅ Update AlertFramework to use dataclasses
6. 🔲 Write first test case for threshold_above_at_least_once
7. 🔲 Validate end-to-end flow with WireMock

### **Short Term (P1)**
1. 🔲 Implement remaining threshold combination tests
2. 🔲 Add multi-threshold support
3. 🔲 Add unit conversion tests
4. 🔲 Document test patterns

### **Future (P2)**
1. 🔲 Add support for PromQL queries
2. 🔲 Add support for ClickHouse queries
3. 🔲 Add support for logs-based alerts
4. 🔲 Add support for traces-based alerts
5. 🔲 Parameterized test generation