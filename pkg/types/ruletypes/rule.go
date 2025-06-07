package ruletypes

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

type Rule struct {
	bun.BaseModel `bun:"table:rule"`
	types.Identifiable
	types.TimeAuditable
	types.UserAuditable
	Deleted int    `bun:"deleted,notnull,default:0"`
	Data    string `bun:"data,type:text,notnull"`
	OrgID   string `bun:"org_id,type:text"`
}

func NewStatsFromRules(rules []*Rule) map[string]any {
	stats := make(map[string]any)
	for _, rule := range rules {
		gettableRule := &GettableRule{}
		if err := json.Unmarshal([]byte(rule.Data), gettableRule); err != nil {
			continue
		}

		key := "rule.type." + strings.TrimSuffix(strings.ToLower(string(gettableRule.RuleType)), "_rule") + ".count"
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

type RuleStore interface {
	CreateRule(context.Context, *Rule, func(context.Context, valuer.UUID) error) (valuer.UUID, error)
	EditRule(context.Context, *Rule, func(context.Context) error) error
	DeleteRule(context.Context, valuer.UUID, func(context.Context) error) error
	GetStoredRules(context.Context, string) ([]*Rule, error)
	GetStoredRule(context.Context, valuer.UUID) (*Rule, error)
}
