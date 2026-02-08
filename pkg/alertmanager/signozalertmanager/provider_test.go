package signozalertmanager

import (
	"log/slog"
	"testing"

	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/assert"
)

func TestMaintenanceExprMuter(t *testing.T) {
	logger := slog.New(slog.DiscardHandler)

	tests := []struct {
		name   string
		exprs  []activeMaintenanceExpr
		labels model.LabelSet
		want   bool
	}{
		// --- no maintenance ---
		{
			name:   "no expressions - not muted",
			exprs:  nil,
			labels: model.LabelSet{"env": "prod"},
			want:   false,
		},
		// --- expression only (ruleIDs empty = all rules) ---
		{
			name: "expression only - matching",
			exprs: []activeMaintenanceExpr{
				{expression: `env == "prod"`},
			},
			labels: model.LabelSet{"env": "prod"},
			want:   true,
		},
		{
			name: "expression only - non-matching",
			exprs: []activeMaintenanceExpr{
				{expression: `env == "prod"`},
			},
			labels: model.LabelSet{"env": "staging"},
			want:   false,
		},
		{
			name: "expression only - matches regardless of ruleId label",
			exprs: []activeMaintenanceExpr{
				{expression: `env == "prod"`},
			},
			labels: model.LabelSet{"env": "prod", "ruleId": "any-rule"},
			want:   true,
		},
		// --- ruleIDs only (expression empty = all labels) ---
		{
			name: "ruleIDs only - matching rule",
			exprs: []activeMaintenanceExpr{
				{ruleIDs: []string{"rule-1", "rule-2"}},
			},
			labels: model.LabelSet{"ruleId": "rule-1", "env": "prod"},
			want:   true,
		},
		{
			name: "ruleIDs only - non-matching rule",
			exprs: []activeMaintenanceExpr{
				{ruleIDs: []string{"rule-1", "rule-2"}},
			},
			labels: model.LabelSet{"ruleId": "rule-3", "env": "prod"},
			want:   false,
		},
		{
			name: "ruleIDs only - no ruleId label on alert",
			exprs: []activeMaintenanceExpr{
				{ruleIDs: []string{"rule-1"}},
			},
			labels: model.LabelSet{"env": "prod"},
			want:   false,
		},
		// --- ruleIDs AND expression ---
		{
			name: "ruleIDs AND expression - both match",
			exprs: []activeMaintenanceExpr{
				{ruleIDs: []string{"rule-1"}, expression: `severity == "critical"`},
			},
			labels: model.LabelSet{"ruleId": "rule-1", "severity": "critical"},
			want:   true,
		},
		{
			name: "ruleIDs AND expression - rule matches, expression does not",
			exprs: []activeMaintenanceExpr{
				{ruleIDs: []string{"rule-1"}, expression: `severity == "critical"`},
			},
			labels: model.LabelSet{"ruleId": "rule-1", "severity": "warning"},
			want:   false,
		},
		{
			name: "ruleIDs AND expression - expression matches, rule does not",
			exprs: []activeMaintenanceExpr{
				{ruleIDs: []string{"rule-1"}, expression: `severity == "critical"`},
			},
			labels: model.LabelSet{"ruleId": "rule-999", "severity": "critical"},
			want:   false,
		},
		{
			name: "ruleIDs AND expression - neither matches",
			exprs: []activeMaintenanceExpr{
				{ruleIDs: []string{"rule-1"}, expression: `severity == "critical"`},
			},
			labels: model.LabelSet{"ruleId": "rule-999", "severity": "warning"},
			want:   false,
		},
		// --- catch-all (both empty) ---
		{
			name: "catch-all - empty ruleIDs and empty expression mutes everything",
			exprs: []activeMaintenanceExpr{
				{},
			},
			labels: model.LabelSet{"ruleId": "any-rule", "env": "anything"},
			want:   true,
		},
		// --- multiple expressions ---
		{
			name: "multiple entries - first matches",
			exprs: []activeMaintenanceExpr{
				{expression: `env == "prod"`},
				{expression: `env == "staging"`},
			},
			labels: model.LabelSet{"env": "prod"},
			want:   true,
		},
		{
			name: "multiple entries - second matches",
			exprs: []activeMaintenanceExpr{
				{expression: `env == "staging"`},
				{expression: `env == "prod"`},
			},
			labels: model.LabelSet{"env": "prod"},
			want:   true,
		},
		{
			name: "multiple entries - none match",
			exprs: []activeMaintenanceExpr{
				{expression: `env == "staging"`},
				{expression: `env == "dev"`},
			},
			labels: model.LabelSet{"env": "prod"},
			want:   false,
		},
		{
			name: "multiple entries - ruleIDs entry matches, expression entry does not",
			exprs: []activeMaintenanceExpr{
				{ruleIDs: []string{"rule-1"}},
				{expression: `env == "staging"`},
			},
			labels: model.LabelSet{"ruleId": "rule-1", "env": "prod"},
			want:   true,
		},
		// --- complex expressions ---
		{
			name: "complex expression with AND",
			exprs: []activeMaintenanceExpr{
				{expression: `severity == "critical" && env == "prod"`},
			},
			labels: model.LabelSet{"severity": "critical", "env": "prod"},
			want:   true,
		},
		{
			name: "complex expression with AND - partial match",
			exprs: []activeMaintenanceExpr{
				{expression: `severity == "critical" && env == "prod"`},
			},
			labels: model.LabelSet{"severity": "warning", "env": "prod"},
			want:   false,
		},
		{
			name: "expression with OR logic",
			exprs: []activeMaintenanceExpr{
				{expression: `env == "prod" || env == "staging"`},
			},
			labels: model.LabelSet{"env": "staging"},
			want:   true,
		},
		{
			name: "expression with nested label (dotted key)",
			exprs: []activeMaintenanceExpr{
				{expression: `labels.env == "prod"`},
			},
			labels: model.LabelSet{"labels.env": "prod"},
			want:   true,
		},
		// --- ruleId as expression (user can also match ruleId via expression) ---
		{
			name: "expression matching specific ruleId label",
			exprs: []activeMaintenanceExpr{
				{expression: `ruleId == "rule-1"`},
			},
			labels: model.LabelSet{"ruleId": "rule-1", "env": "prod"},
			want:   true,
		},
		{
			name: "expression matching specific ruleId label - non-matching",
			exprs: []activeMaintenanceExpr{
				{expression: `ruleId == "rule-1"`},
			},
			labels: model.LabelSet{"ruleId": "rule-3", "env": "prod"},
			want:   false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			muter := NewMaintenanceExprMuter(logger)
			muter.SetActiveExpressions(tc.exprs)
			got := muter.Mutes(tc.labels)
			assert.Equal(t, tc.want, got)
		})
	}
}
