package ruletypesv2

import (
	"encoding/json"
	"fmt"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
)

func unmarshalWithRegistry[T any](
	data KindSpec,
	registry map[string]func(json.RawMessage) (T, error),
	defaultKind string,
	errorContext string,
) (T, error) {
	var zero T

	kind := data.Kind
	if kind == "" && defaultKind != "" {
		kind = defaultKind
	}

	factory, exists := registry[kind]
	if !exists {
		return zero, fmt.Errorf("unsupported %s kind: %s", errorContext, kind)
	}

	result, err := factory(data.Spec)
	if err != nil {
		return zero, fmt.Errorf("failed to create %s: %w", errorContext, err)
	}

	return result, nil
}

// Registry functions to add new types (for future extensibility)
type RuleConditionSpecFactory func(spec json.RawMessage) (RuleConditionSpec, error)
type RuleSpecFactory func(spec json.RawMessage) (RuleSpec, error)
type RuleConfigurationFactory func(spec json.RawMessage) (RuleConfiguration, error)
type RuleNotificationFactory func(spec json.RawMessage) (RuleNotification, error)
type EvaluationFactory func(spec json.RawMessage) (Evaluation, error)
type RuleThresholdFactory func(spec json.RawMessage) (ruletypes.RuleThreshold, error)

var (
	ruleConditionSpecRegistry = map[string]RuleConditionSpecFactory{
		"COMPOSITE_QUERY": func(spec json.RawMessage) (RuleConditionSpec, error) {
			return NewRuleConditionSpec("COMPOSITE_QUERY", spec)
		},
	}

	ruleSpecRegistry = map[string]RuleSpecFactory{
		"METRIC_BASED_ALERT": func(spec json.RawMessage) (RuleSpec, error) {
			return NewRuleSpec("METRIC_BASED_ALERT", spec)
		},
	}

	ruleConfigurationRegistry = map[string]RuleConfigurationFactory{
		"THRESHOLD": func(spec json.RawMessage) (RuleConfiguration, error) {
			return NewRuleConfiguration("THRESHOLD", spec)
		},
	}

	ruleNotificationRegistry = map[string]RuleNotificationFactory{
		"ROUTING_POLICY": func(spec json.RawMessage) (RuleNotification, error) {
			return NewRuleNotification("ROUTING_POLICY", spec)
		},
	}

	evaluationRegistry = map[string]EvaluationFactory{
		"ROLLING": func(spec json.RawMessage) (Evaluation, error) {
			var rolling RollingWindow
			if err := json.Unmarshal(spec, &rolling); err != nil {
				return nil, err
			}
			return &rolling, nil
		},
		"CUMULATIVE": func(spec json.RawMessage) (Evaluation, error) {
			var cumulative CumulativeWindow
			if err := json.Unmarshal(spec, &cumulative); err != nil {
				return nil, err
			}
			return &cumulative, nil
		},
	}

	ruleThresholdRegistry = map[string]RuleThresholdFactory{
		"basic": func(spec json.RawMessage) (ruletypes.RuleThreshold, error) {
			var basicThreshold ruletypes.BasicRuleThresholdJSON
			if err := json.Unmarshal(spec, &basicThreshold); err != nil {
				return nil, err
			}
			return NewBasicRuleThreshold(
				basicThreshold.Name,
				basicThreshold.Target,
				basicThreshold.RecoveryTarget,
				basicThreshold.MatchType,
				basicThreshold.CompareOp,
				basicThreshold.SelectedQuery,
				basicThreshold.TargetUnit,
				basicThreshold.RuleUnit,
			), nil
		},
		"BASIC": func(spec json.RawMessage) (ruletypes.RuleThreshold, error) {
			var basicThreshold ruletypes.BasicRuleThresholdJSON
			if err := json.Unmarshal(spec, &basicThreshold); err != nil {
				return nil, err
			}
			return NewBasicRuleThreshold(
				basicThreshold.Name,
				basicThreshold.Target,
				basicThreshold.RecoveryTarget,
				basicThreshold.MatchType,
				basicThreshold.CompareOp,
				basicThreshold.SelectedQuery,
				basicThreshold.TargetUnit,
				basicThreshold.RuleUnit,
			), nil
		},
	}
)

// Registry-based helper functions for external use
func UnmarshalEvaluationFromRegistry(data []byte) (Evaluation, error) {
	evalRegistry := make(map[string]func(json.RawMessage) (Evaluation, error))
	for kind, factory := range evaluationRegistry {
		evalRegistry[kind] = func(spec json.RawMessage) (Evaluation, error) {
			return factory(spec)
		}
	}

	var evalWrapper KindSpec
	if err := json.Unmarshal(data, &evalWrapper); err != nil {
		return nil, fmt.Errorf("failed to unmarshal evaluation wrapper: %w", err)
	}

	return unmarshalWithRegistry(evalWrapper, evalRegistry, "rolling", "evaluation")
}

func UnmarshalRuleThresholdFromRegistry(wrapper ruletypes.RuleThresholdData) (ruletypes.RuleThreshold, error) {
	thresholdRegistry := make(map[string]func(json.RawMessage) (ruletypes.RuleThreshold, error))
	for kind, factory := range ruleThresholdRegistry {
		thresholdRegistry[kind] = func(spec json.RawMessage) (ruletypes.RuleThreshold, error) {
			return factory(spec)
		}
	}

	thresholdKindSpec := KindSpec{Kind: wrapper.Kind, Spec: wrapper.Spec}
	return unmarshalWithRegistry(thresholdKindSpec, thresholdRegistry, "basic", "threshold")
}

// Registry management functions for external extensibility
func RegisterEvaluationType(kind string, factory EvaluationFactory) {
	evaluationRegistry[kind] = factory
}

func RegisterRuleThresholdType(kind string, factory RuleThresholdFactory) {
	ruleThresholdRegistry[kind] = factory
}

func RegisterRuleConditionSpecType(kind string, factory RuleConditionSpecFactory) {
	ruleConditionSpecRegistry[kind] = factory
}

func RegisterRuleSpecType(kind string, factory RuleSpecFactory) {
	ruleSpecRegistry[kind] = factory
}

func RegisterRuleConfigurationType(kind string, factory RuleConfigurationFactory) {
	ruleConfigurationRegistry[kind] = factory
}

func RegisterRuleNotificationType(kind string, factory RuleNotificationFactory) {
	ruleNotificationRegistry[kind] = factory
}
