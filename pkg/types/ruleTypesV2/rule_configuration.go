package ruletypesv2

import (
	"encoding/json"
	"fmt"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
)

// ThresholdRuleConfiguration implements RuleConfiguration for threshold-based rules
type ThresholdRuleConfiguration struct {
	Evaluation Evaluation                `json:"evaluation"`
	Thresholds []ruletypes.RuleThreshold `json:"thresholds"`
}

func (trc *ThresholdRuleConfiguration) Kind() string {
	return "THRESHOLD"
}

func (trc *ThresholdRuleConfiguration) Validate() error {
	if trc.Evaluation == nil {
		return fmt.Errorf("evaluation is required")
	}
	if len(trc.Thresholds) == 0 {
		return fmt.Errorf("at least one threshold is required")
	}
	return nil
}

func (trc *ThresholdRuleConfiguration) GetEvaluation() Evaluation {
	return trc.Evaluation
}

func (trc *ThresholdRuleConfiguration) GetThresholds() []ruletypes.RuleThreshold {
	return trc.Thresholds
}

func (trc *ThresholdRuleConfiguration) MarshalJSON() ([]byte, error) {
	wrapper := struct {
		Kind string      `json:"kind"`
		Spec interface{} `json:"spec"`
	}{
		Kind: trc.Kind(),
		Spec: *trc,
	}
	return json.Marshal(wrapper)
}

// Custom UnmarshalJSON for ThresholdRuleConfiguration to handle RuleThreshold interface using registry
func (trc *ThresholdRuleConfiguration) UnmarshalJSON(data []byte) error {
	// First unmarshal into a temporary struct
	var temp struct {
		Evaluation json.RawMessage                `json:"evaluation"`
		Thresholds []ruletypes.RuleThresholdData `json:"thresholds"`
	}

	if err := json.Unmarshal(data, &temp); err != nil {
		return fmt.Errorf("failed to unmarshal threshold rule configuration: %w", err)
	}

	// Unmarshal evaluation using registry-based approach
	evaluation, err := UnmarshalEvaluationFromRegistry(temp.Evaluation)
	if err != nil {
		return fmt.Errorf("failed to unmarshal evaluation: %w", err)
	}
	trc.Evaluation = evaluation

	// Unmarshal thresholds using registry-based approach
	trc.Thresholds = make([]ruletypes.RuleThreshold, 0, len(temp.Thresholds))
	for _, thresholdData := range temp.Thresholds {
		threshold, err := UnmarshalRuleThresholdFromRegistry(thresholdData)
		if err != nil {
			return fmt.Errorf("failed to unmarshal threshold: %w", err)
		}
		trc.Thresholds = append(trc.Thresholds, threshold)
	}

	return nil
}