package ruletypes

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

// cloneCopySuffixRegex matches a " - Copy" or " - Copy (n)" suffix on an alert name.
var cloneCopySuffixRegex = regexp.MustCompile(`^(.*) - Copy(?: \((\d+)\))?$`)

type StorableRule struct {
	// The alias must stay rule: the list filter compiler emits rule.<col> refs.
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

func (rule *StorableRule) ToPostableRuleForCloning() (*PostableRule, error) {
	postable := &PostableRule{}
	if err := json.Unmarshal([]byte(rule.Data), postable); err != nil {
		return nil, err
	}
	postable.AlertName = nextCloneAlertName(postable.AlertName)
	return postable, nil
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
	// GetStoredRulesMatching returns the org's rules matching a compiled filter clause; an empty clause matches all.
	GetStoredRulesMatching(context.Context, string, string, []any) ([]*StorableRule, error)
	// GetStoredRuleLabels returns each rule's labels as raw JSON text, empty string when absent.
	GetStoredRuleLabels(context.Context, string) ([]string, error)
	GetStoredRule(context.Context, valuer.UUID, valuer.UUID) (*StorableRule, error)
	GetStoredRulesByMetricName(context.Context, string, string) ([]RuleAlert, error)

	CreateRuleView(context.Context, *RuleView) error
	GetRuleView(context.Context, valuer.UUID, valuer.UUID) (*RuleView, error)
	ListRuleViews(context.Context, valuer.UUID) ([]*RuleView, error)
	UpdateRuleView(context.Context, *RuleView) error
	DeleteRuleView(context.Context, valuer.UUID, valuer.UUID) error
}

// nextCloneAlertName appends " - Copy" to a clone's name, bumping an existing " - Copy (n)" counter.
func nextCloneAlertName(name string) string {
	base, count := name, 0
	if m := cloneCopySuffixRegex.FindStringSubmatch(name); m != nil {
		base = m[1]
		count = 1
		if m[2] != "" {
			count, _ = strconv.Atoi(m[2])
		}
	}

	if count++; count > 1 {
		return fmt.Sprintf("%s - Copy (%d)", base, count)
	}
	return base + " - Copy"
}
