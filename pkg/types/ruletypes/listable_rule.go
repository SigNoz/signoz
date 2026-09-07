package ruletypes

import (
	"github.com/SigNoz/signoz/pkg/types"
)

// ListableRule is the slim per-row shape of the rule list endpoint: only the
// fields the list page renders. The full rule (condition, annotations,
// notification settings, ...) stays behind the get-by-id endpoint.
type ListableRule struct {
	Id          string            `json:"id" required:"true"`
	State       AlertState        `json:"state" required:"true"`
	AlertName   string            `json:"alert" required:"true"`
	Description string            `json:"description,omitempty"`
	AlertType   AlertType         `json:"alertType" required:"true"`
	RuleType    RuleType          `json:"ruleType" required:"true"`
	Disabled    bool              `json:"disabled"`
	Labels      map[string]string `json:"labels,omitempty"`
	types.TimeAuditable
	types.UserAuditable
}

func NewListableRule(rule *GettableRule) *ListableRule {
	listable := &ListableRule{
		Id:          rule.Id,
		State:       rule.State,
		AlertName:   rule.AlertName,
		Description: rule.Description,
		AlertType:   rule.AlertType,
		RuleType:    rule.RuleType,
		Disabled:    rule.Disabled,
		Labels:      rule.Labels,
		TimeAuditable: types.TimeAuditable{
			CreatedAt: rule.CreatedAt,
			UpdatedAt: rule.UpdatedAt,
		},
	}
	if rule.CreatedBy != nil {
		listable.CreatedBy = *rule.CreatedBy
	}
	if rule.UpdatedBy != nil {
		listable.UpdatedBy = *rule.UpdatedBy
	}
	return listable
}

// LabelPair is one distinct label key/value observed on the org's rules,
// surfaced for filter autocomplete.
type LabelPair struct {
	Key   string `json:"key" required:"true"`
	Value string `json:"value" required:"true"`
}

type ListableRules struct {
	Rules            []*ListableRule `json:"rules" required:"true" nullable:"false"`
	Total            int64           `json:"total" required:"true"`
	Labels           []LabelPair     `json:"labels" required:"true" nullable:"false"`
	ReservedKeywords []DSLKey        `json:"reservedKeywords" required:"true" nullable:"false"`
}

func NewListableRules(rules []*ListableRule, total int64, labels []LabelPair) *ListableRules {
	return &ListableRules{
		Rules:            rules,
		Total:            total,
		Labels:           labels,
		ReservedKeywords: ReservedFilterKeys(),
	}
}
