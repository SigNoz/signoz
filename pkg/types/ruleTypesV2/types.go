package ruletypesv2

import (
	"encoding/json"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
)

type Labels map[string]interface{}

type Annotations map[string]interface{}

// RuleSpec interface for extensible rule specifications based on PostableRuleV2.Kind
type RuleSpec interface {
	Kind() string
	Validate() error
	GetRuleCondition() RuleConditionSpec
	GetRuleConfiguration() RuleConfiguration
	GetRuleNotification() RuleNotification
	json.Marshaler
}

type RuleConditionSpec interface {
	Kind() string
	Validate() error
	json.Marshaler
}

type RuleConfiguration interface {
	Kind() string
	Validate() error
	GetEvaluation() Evaluation
	GetThresholds() []ruletypes.RuleThreshold
	json.Marshaler
}

// Type aliases for compatibility
type RuleThreshold = ruletypes.RuleThreshold
type RuleThresholdData = ruletypes.RuleThresholdData
type BasicRuleThresholdJSON = ruletypes.BasicRuleThresholdJSON

type RuleNotification interface {
	Kind() string
	Validate() error
	json.Marshaler
}

// Registry-driven JSON unmarshaling helper
type KindSpec struct {
	Kind string          `json:"kind"`
	Spec json.RawMessage `json:"spec"`
}

// Use existing RuleThresholdData from ruletypes package instead of duplicating

// Helper function to create NewBasicRuleThreshold
func NewBasicRuleThreshold(name string, target *float64, recoveryTarget *float64, matchType ruletypes.MatchType, op ruletypes.CompareOp, selectedQuery string, targetUnit string, ruleUnit string) ruletypes.RuleThreshold {
	return ruletypes.NewBasicRuleThreshold(name, target, recoveryTarget, matchType, op, selectedQuery, targetUnit, ruleUnit)
}