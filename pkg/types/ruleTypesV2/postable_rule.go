package ruletypesv2

import (
	"encoding/json"
	"fmt"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
)

type PostableRuleV2 struct {
	Kind        string      `json:"kind"`
	ID          string      `json:"id"`
	Name        string      `json:"name"`
	Labels      Labels      `json:"labels"`
	Annotations Annotations `json:"annotations"`
	Spec        RuleSpec    `json:"-"` // Handled by custom marshaling
}

// PostableRuleV2 validation and conversion methods
func (pr *PostableRuleV2) Validate() error {
	if pr.Kind == "" {
		return fmt.Errorf("kind is required")
	}

	if pr.ID == "" {
		return fmt.Errorf("id is required")
	}

	if pr.Name == "" {
		return fmt.Errorf("name is required")
	}

	return pr.Spec.Validate()
}

// ToRuleCondition converts PostableRuleV2 to RuleCondition for backward compatibility
func (pr *PostableRuleV2) ToRuleCondition() *ruletypes.RuleCondition {
	ruleCondition := &ruletypes.RuleCondition{
		Thresholds: pr.Spec.GetRuleConfiguration().GetThresholds(),
	}

	// Extract CompositeQuery based on condition type using type assertion
	switch condition := pr.Spec.GetRuleCondition().(type) {
	case *TimeSeriesRuleCondition:
		ruleCondition.CompositeQuery = condition.CompositeQuery
	default:
		// For other condition types that don't have CompositeQuery, leave it nil
		// This allows for extensibility without forcing all conditions to use CompositeQuery
	}

	return ruleCondition
}

// Custom UnmarshalJSON for PostableRuleV2 to handle RuleSpec interface using registry
func (pr *PostableRuleV2) UnmarshalJSON(data []byte) error {
	var temp struct {
		Kind        string          `json:"kind"`
		ID          string          `json:"id"`
		Name        string          `json:"name"`
		Labels      Labels          `json:"labels"`
		Annotations Annotations     `json:"annotations"`
		Spec        json.RawMessage `json:"spec"`
	}

	if err := json.Unmarshal(data, &temp); err != nil {
		return fmt.Errorf("failed to unmarshal postable rule v2: %w", err)
	}

	pr.Kind = temp.Kind
	pr.ID = temp.ID
	pr.Name = temp.Name
	pr.Labels = temp.Labels
	pr.Annotations = temp.Annotations

	// Convert global registry to compatible function signature
	specRegistry := make(map[string]func(json.RawMessage) (RuleSpec, error))
	for kind, factory := range ruleSpecRegistry {
		specRegistry[kind] = func(spec json.RawMessage) (RuleSpec, error) {
			return factory(spec)
		}
	}

	// Create RuleSpec using registry-based approach
	specWrapper := KindSpec{Kind: temp.Kind, Spec: temp.Spec}
	ruleSpec, err := unmarshalWithRegistry(specWrapper, specRegistry, "", "rule spec")
	if err != nil {
		return fmt.Errorf("failed to create rule spec: %w", err)
	}
	pr.Spec = ruleSpec

	return nil
}

func (pr *PostableRuleV2) MarshalJSON() ([]byte, error) {
	temp := struct {
		Kind        string      `json:"kind"`
		ID          string      `json:"id"`
		Name        string      `json:"name"`
		Labels      Labels      `json:"labels"`
		Annotations Annotations `json:"annotations"`
		Spec        RuleSpec    `json:"spec"`
	}{
		Kind:        pr.Kind,
		ID:          pr.ID,
		Name:        pr.Name,
		Labels:      pr.Labels,
		Annotations: pr.Annotations,
		Spec:        pr.Spec,
	}

	return json.Marshal(temp)
}