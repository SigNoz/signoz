package ruletypesv2

import (
	"encoding/json"
	"fmt"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
)

// TimeSeriesBasedRulesSpec implements RuleSpec for METRIC_BASED_ALERT kind
type TimeSeriesBasedRulesSpec struct {
	RuleCondition     RuleConditionSpec `json:"alertCondition"`
	RuleConfiguration RuleConfiguration `json:"alertConfiguration"`
	RuleNotification  RuleNotification  `json:"alertNotification"`
}

func (mbrs *TimeSeriesBasedRulesSpec) Kind() string {
	return "METRIC_BASED_ALERT"
}

func (mbrs *TimeSeriesBasedRulesSpec) Validate() error {
	if err := mbrs.RuleCondition.Validate(); err != nil {
		return fmt.Errorf("rule condition validation failed: %w", err)
	}

	if err := mbrs.RuleConfiguration.Validate(); err != nil {
		return fmt.Errorf("rule configuration validation failed: %w", err)
	}

	if err := mbrs.RuleNotification.Validate(); err != nil {
		return fmt.Errorf("rule notification validation failed: %w", err)
	}

	return nil
}

func (mbrs *TimeSeriesBasedRulesSpec) GetRuleCondition() RuleConditionSpec {
	return mbrs.RuleCondition
}

func (mbrs *TimeSeriesBasedRulesSpec) GetRuleConfiguration() RuleConfiguration {
	return mbrs.RuleConfiguration
}

func (mbrs *TimeSeriesBasedRulesSpec) GetRuleNotification() RuleNotification {
	return mbrs.RuleNotification
}

func (mbrs *TimeSeriesBasedRulesSpec) MarshalJSON() ([]byte, error) {
	wrapper := struct {
		Kind string      `json:"kind"`
		Spec interface{} `json:"spec"`
	}{
		Kind: mbrs.Kind(),
		Spec: *mbrs,
	}
	return json.Marshal(wrapper)
}

// Custom UnmarshalJSON for TimeSeriesBasedRulesSpec using registry-based approach
func (mbrs *TimeSeriesBasedRulesSpec) UnmarshalJSON(data []byte) error {
	var temp struct {
		RuleCondition     KindSpec `json:"alertCondition"`
		RuleConfiguration KindSpec `json:"alertConfiguration"`
		RuleNotification  KindSpec `json:"alertNotification"`
	}

	if err := json.Unmarshal(data, &temp); err != nil {
		return fmt.Errorf("failed to unmarshal time series based rule spec: %w", err)
	}

	// Use global registries instead of local ones for consistency
	temp.RuleCondition = KindSpec(temp.RuleCondition)
	// Unmarshal using global registries - convert to compatible function signature
	conditionRegistry := make(map[string]func(json.RawMessage) (RuleConditionSpec, error))
	for kind, factory := range ruleConditionSpecRegistry {
		conditionRegistry[kind] = func(spec json.RawMessage) (RuleConditionSpec, error) {
			return factory(spec)
		}
	}

	configRegistry := make(map[string]func(json.RawMessage) (RuleConfiguration, error))
	for kind, factory := range ruleConfigurationRegistry {
		configRegistry[kind] = func(spec json.RawMessage) (RuleConfiguration, error) {
			return factory(spec)
		}
	}

	notifRegistry := make(map[string]func(json.RawMessage) (RuleNotification, error))
	for kind, factory := range ruleNotificationRegistry {
		notifRegistry[kind] = func(spec json.RawMessage) (RuleNotification, error) {
			return factory(spec)
		}
	}

	ruleCondition, err := unmarshalWithRegistry(temp.RuleCondition, conditionRegistry, "METRIC_BASED_ALERT", "rule condition")
	if err != nil {
		return err
	}
	mbrs.RuleCondition = ruleCondition

	ruleConfig, err := unmarshalWithRegistry(temp.RuleConfiguration, configRegistry, "", "rule configuration")
	if err != nil {
		return err
	}
	mbrs.RuleConfiguration = ruleConfig

	ruleNotification, err := unmarshalWithRegistry(temp.RuleNotification, notifRegistry, "", "rule notification")
	if err != nil {
		return err
	}
	mbrs.RuleNotification = ruleNotification

	return nil
}

// TimeSeriesRuleCondition implements RuleConditionSpec for time series based rules
type TimeSeriesRuleCondition struct {
	CompositeQuery *v3.CompositeQuery `json:"compositeQuery"`
}

func (tsrc *TimeSeriesRuleCondition) Kind() string {
	return "METRIC_BASED_ALERT"
}

func (tsrc *TimeSeriesRuleCondition) Validate() error {
	if tsrc.CompositeQuery == nil {
		return fmt.Errorf("composite query is required")
	}
	return tsrc.CompositeQuery.Validate()
}

func (tsrc *TimeSeriesRuleCondition) GetCompositeQuery() *v3.CompositeQuery {
	return tsrc.CompositeQuery
}

func (tsrc *TimeSeriesRuleCondition) MarshalJSON() ([]byte, error) {
	wrapper := struct {
		Kind string      `json:"kind"`
		Spec interface{} `json:"spec"`
	}{
		Kind: tsrc.Kind(),
		Spec: *tsrc,
	}
	return json.Marshal(wrapper)
}
