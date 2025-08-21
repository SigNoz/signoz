package ruletypesv2

import (
	"encoding/json"
	"fmt"
)

// Factory functions for extensibility
func NewRuleConfiguration(kind string, spec json.RawMessage) (RuleConfiguration, error) {
	switch kind {
	case "THRESHOLD":
		var thresholdSpec ThresholdRuleConfiguration
		if err := json.Unmarshal(spec, &thresholdSpec); err != nil {
			return nil, fmt.Errorf("failed to unmarshal threshold spec: %w", err)
		}
		return &thresholdSpec, nil
	default:
		return nil, fmt.Errorf("unsupported rule configuration kind: %s", kind)
	}
}

func NewRuleNotification(kind string, spec json.RawMessage) (RuleNotification, error) {
	switch kind {
	case "ROUTING_POLICY":
		var routingPolicy RoutingPolicyRuleNotification
		if err := json.Unmarshal(spec, &routingPolicy); err != nil {
			return nil, fmt.Errorf("failed to unmarshal routing policy: %w", err)
		}
		return &routingPolicy, nil
	default:
		return nil, fmt.Errorf("unsupported rule notification kind: %s", kind)
	}
}

// Factory pattern for RuleConditionSpec
func NewRuleConditionSpec(kind string, spec json.RawMessage) (RuleConditionSpec, error) {
	switch kind {
	case "COMPOSITE_QUERY":
		var tsCondition TimeSeriesRuleCondition
		if err := json.Unmarshal(spec, &tsCondition); err != nil {
			return nil, fmt.Errorf("failed to unmarshal time series rule condition: %w", err)
		}
		return &tsCondition, nil
	default:
		return nil, fmt.Errorf("unsupported rule condition kind: %s", kind)
	}
}

// Factory pattern for RuleSpec
func NewRuleSpec(kind string, spec json.RawMessage) (RuleSpec, error) {
	switch kind {
	case "METRIC_BASED_ALERT":
		var metricBasedSpec TimeSeriesBasedRulesSpec
		if err := json.Unmarshal(spec, &metricBasedSpec); err != nil {
			return nil, fmt.Errorf("failed to unmarshal metric based rule spec: %w", err)
		}
		return &metricBasedSpec, nil
	default:
		return nil, fmt.Errorf("unsupported rule spec kind: %s", kind)
	}
}
