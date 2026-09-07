package ruletypes

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

type StorableRule struct {
	// The alias matches the `rule.<col>` references the list filter compiler
	// emits (bun's default alias would be storable_rule).
	bun.BaseModel `bun:"table:rule,alias:rule"`
	types.Identifiable
	types.TimeAuditable
	types.UserAuditable
	Deleted int    `bun:"deleted,notnull,default:0"`
	Data    string `bun:"data,type:text,notnull"`
	OrgID   string `bun:"org_id,type:text"`
}

func NewStatsFromRules(rules []*StorableRule) map[string]any {
	stats := make(map[string]any)
	for _, rule := range rules {
		gettableRule := &GettableRule{}
		if err := json.Unmarshal([]byte(rule.Data), gettableRule); err != nil {
			continue
		}

		key := "rule.type." + strings.TrimSuffix(strings.ToLower(gettableRule.RuleType.StringValue()), "_rule") + ".count"
		if _, ok := stats[key]; !ok {
			stats[key] = int64(1)
		} else {
			stats[key] = stats[key].(int64) + 1
		}

		key = "alert.type." + strings.TrimSuffix(strings.ToLower(string(gettableRule.AlertType)), "_based_alert") + ".count"
		if _, ok := stats[key]; !ok {
			stats[key] = int64(1)
		} else {
			stats[key] = stats[key].(int64) + 1
		}
	}

	stats["rule.count"] = int64(len(rules))
	return stats
}

// RuleAlert represents an alert associated with a rule, used when filtering by metric name.
type RuleAlert struct {
	AlertName string
	AlertID   string
}

type RuleStore interface {
	CreateRule(context.Context, *StorableRule, func(context.Context, valuer.UUID) error) (valuer.UUID, error)
	EditRule(context.Context, *StorableRule, func(context.Context) error) error
	DeleteRule(context.Context, valuer.UUID, valuer.UUID, func(context.Context) error) error
	GetStoredRules(context.Context, string) ([]*StorableRule, error)
	// GetStoredRulesMatching returns the org's rules matching a list filter
	// DSL query; an empty query matches every rule.
	GetStoredRulesMatching(context.Context, string, string) ([]*StorableRule, error)
	// GetStoredRuleLabels returns each rule's labels object as raw JSON text
	// (empty string for rules without labels).
	GetStoredRuleLabels(context.Context, string) ([]string, error)
	GetStoredRule(context.Context, valuer.UUID, valuer.UUID) (*StorableRule, error)
	GetStoredRulesByMetricName(context.Context, string, string) ([]RuleAlert, error)
}
