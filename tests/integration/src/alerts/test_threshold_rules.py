"""
Example test cases for Alert Threshold Rules using the AlertFramework.

This file demonstrates how to write declarative alert test cases using the framework.
"""


from fixtures.alerts import AlertFramework
from fixtures.types import AlertExpectations, AlertTestCase, MetricValues, create_default_metric_rule

# uv run pytest --basetemp=./tmp/ -vv --reuse src/alerts/test_threshold_rules.py::test_threshold_above_at_least_once

def test_threshold_above_at_least_once(alert_framework: AlertFramework):
    """
    Test: Threshold - Above - At Least Once
    
    Description: Alert should fire if ANY data point exceeds threshold at least once.
    Scenario: Send values [50, 50, 50, 90, 90, 50] with threshold of 80.
    Expected: Alert should fire because 90 > 80.
    """
    # Define the data series
    data_series = MetricValues(
        metric_name="test_cpu_usage",
        labels={"host": "worker-1", "env": "prod"},
        values=[50.0, 50.0, 50.0, 90.0, 90.0, 50.0],
        temporality="Unspecified",
        interval_sec=60,
    )
    
    # Create the rule using default factory and customize it
    rule = create_default_metric_rule(
        alert_name="CPU Usage High - At Least Once",
        metric_name="test_cpu_usage",
    ).with_threshold(
        target_value=80.0,
        compare_op="above",
        match_type="at_least_once",
    ).with_description(
        "Alert when CPU usage exceeds 80% at least once"
    )
    
    # Define expectations
    expectations = AlertExpectations(
        should_fire=True,
        num_alerts=1,
        verify_labels={"severity": "critical"},
    )
    
    # Create test case
    test_case = AlertTestCase(
        name="Threshold - Above - At Least Once",
        description="Alert fires when any value exceeds threshold",
        rule=rule,
        data=[data_series],
        expectations=expectations,
    )
    
    # Run the test
    alert_framework.run_test(test_case)


def test_threshold_above_all_the_time(alert_framework: AlertFramework):
    """
    Test: Threshold - Above - All the Time
    
    Description: Alert should fire only if ALL data points exceed threshold.
    Scenario: Send values [90, 90, 90, 50, 90, 90] with threshold of 80.
    Expected: Alert should NOT fire because not all values are > 80.
    """
    data_series = MetricValues(
        metric_name="test_memory_usage",
        labels={"host": "worker-2"},
        values=[90.0, 90.0, 90.0, 50.0, 90.0, 90.0],
        temporality="Unspecified",
        interval_sec=60,
    )
    
    rule = create_default_metric_rule(
        alert_name="Memory Usage High - All Time",
        metric_name="test_memory_usage",
    ).with_threshold(
        target_value=80.0,
        compare_op="above",
        match_type="all_the_time",
    )
    
    expectations = AlertExpectations(
        should_fire=False,
        num_alerts=0,
    )
    
    test_case = AlertTestCase(
        name="Threshold - Above - All Time (Negative)",
        description="Alert does NOT fire when not all values exceed threshold",
        rule=rule,
        data=[data_series],
        expectations=expectations,
    )
    
    alert_framework.run_test(test_case)


def test_threshold_below_on_average(alert_framework: AlertFramework):
    """
    Test: Threshold - Below - On Average
    
    Description: Alert when average of values is below threshold.
    Scenario: Send values [10, 20, 30, 40, 50] (avg=30) with threshold of 40.
    Expected: Alert should fire because avg(30) < 40.
    """
    data_series = MetricValues(
        metric_name="test_request_rate",
        labels={"service": "api"},
        values=[10.0, 20.0, 30.0, 40.0, 50.0],
        temporality="Unspecified",
        interval_sec=60,
    )
    
    rule = create_default_metric_rule(
        alert_name="Low Request Rate",
        metric_name="test_request_rate",
    ).with_threshold(
        target_value=40.0,
        compare_op="below",
        match_type="on_average",
    ).with_eval_window("5m").with_frequency("1m")
    
    expectations = AlertExpectations(
        should_fire=True,
        num_alerts=1,
        verify_labels={"severity": "critical"},
    )
    
    test_case = AlertTestCase(
        name="Threshold - Below - On Average",
        description="Alert fires when average is below threshold",
        rule=rule,
        data=[data_series],
        expectations=expectations,
    )
    
    alert_framework.run_test(test_case)


def test_multi_threshold_warning_and_critical(alert_framework: AlertFramework):
    """
    Test: Multi-Threshold - Warning and Critical
    
    Description: Define both warning (70) and critical (90) thresholds.
    Scenario: Send values that cross warning but not critical.
    Expected: Alert fires with "warning" severity.
    """
    data_series = MetricValues(
        metric_name="test_disk_usage",
        labels={"mount": "/data"},
        values=[75.0, 76.0, 77.0, 78.0, 79.0, 80.0],
        temporality="Unspecified",
        interval_sec=60,
    )
    
    rule = create_default_metric_rule(
        alert_name="Disk Usage High",
        metric_name="test_disk_usage",
    ).with_multi_threshold(
        critical_value=90.0,
        warning_value=70.0,
        compare_op="above",
        match_type="at_least_once",
    )
    
    expectations = AlertExpectations(
        should_fire=True,
        num_alerts=1,
        verify_labels={"severity": "warning"},
    )
    
    test_case = AlertTestCase(
        name="Multi-Threshold - Warning Level",
        description="Alert fires with warning severity when crossing warning threshold",
        rule=rule,
        data=[data_series],
        expectations=expectations,
    )
    
    alert_framework.run_test(test_case)


def test_threshold_equal_to_last(alert_framework: AlertFramework):
    """
    Test: Threshold - Equal To - Last
    
    Description: Alert when the last data point equals threshold.
    Scenario: Send values [10, 20, 30, 40, 50] with threshold of 50.
    Expected: Alert should fire because last value == 50.
    """
    data_series = MetricValues(
        metric_name="test_status_code",
        labels={"endpoint": "/health"},
        values=[10.0, 20.0, 30.0, 40.0, 50.0],
        temporality="Unspecified",
        interval_sec=60,
    )
    
    rule = create_default_metric_rule(
        alert_name="Status Code Check",
        metric_name="test_status_code",
    ).with_threshold(
        target_value=50.0,
        compare_op="equal_to",
        match_type="last",
    )
    
    expectations = AlertExpectations(
        should_fire=True,
        num_alerts=1,
    )
    
    test_case = AlertTestCase(
        name="Threshold - Equal To - Last",
        description="Alert fires when last value equals threshold",
        rule=rule,
        data=[data_series],
        expectations=expectations,
    )
    
    alert_framework.run_test(test_case)


def test_threshold_in_total(alert_framework: AlertFramework):
    """
    Test: Threshold - Above - In Total
    
    Description: Alert when sum of values exceeds threshold.
    Scenario: Send values [10, 20, 30, 40, 50] (sum=150) with threshold of 100.
    Expected: Alert should fire because sum(150) > 100.
    """
    data_series = MetricValues(
        metric_name="test_error_count",
        labels={"service": "backend"},
        values=[10.0, 20.0, 30.0, 40.0, 50.0],
        temporality="Unspecified",
        interval_sec=60,
    )
    
    rule = create_default_metric_rule(
        alert_name="High Error Count",
        metric_name="test_error_count",
        aggregate_operator="sum",
    ).with_threshold(
        target_value=100.0,
        compare_op="above",
        match_type="in_total",
    )
    
    expectations = AlertExpectations(
        should_fire=True,
        num_alerts=1,
    )
    
    test_case = AlertTestCase(
        name="Threshold - Above - In Total",
        description="Alert fires when sum of values exceeds threshold",
        rule=rule,
        data=[data_series],
        expectations=expectations,
    )
    
    alert_framework.run_test(test_case)


# Run specific tests:
# poetry run pytest --basetemp=./tmp/ -vv --reuse src/alerts/test_threshold_rules.py::test_threshold_above_at_least_once
# 
# Run all alert tests:
# poetry run pytest --basetemp=./tmp/ -vv --reuse src/alerts/test_threshold_rules.py
