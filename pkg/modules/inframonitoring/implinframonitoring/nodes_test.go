package implinframonitoring

import (
	"reflect"
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	"github.com/huandu/go-sqlbuilder"
)

func TestApplyNodeReadinessFilter(t *testing.T) {
	tests := []struct {
		name      string
		readiness []inframonitoringtypes.NodeCondition
		wantWhere bool
		wantArgs  []any
	}{
		{
			name:      "empty set yields no clause",
			readiness: nil,
			wantWhere: false,
			wantArgs:  nil,
		},
		{
			name:      "ready maps to 1 via IN",
			readiness: []inframonitoringtypes.NodeCondition{inframonitoringtypes.NodeConditionReady},
			wantWhere: true,
			wantArgs:  []any{inframonitoringtypes.NodeConditionNumReady},
		},
		{
			name:      "not_ready maps to 0 via IN",
			readiness: []inframonitoringtypes.NodeCondition{inframonitoringtypes.NodeConditionNotReady},
			wantWhere: true,
			wantArgs:  []any{inframonitoringtypes.NodeConditionNumNotReady},
		},
		{
			name: "multiple conditions map to their ints via IN",
			readiness: []inframonitoringtypes.NodeCondition{
				inframonitoringtypes.NodeConditionReady,
				inframonitoringtypes.NodeConditionNotReady,
			},
			wantWhere: true,
			wantArgs:  []any{inframonitoringtypes.NodeConditionNumReady, inframonitoringtypes.NodeConditionNumNotReady},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cb := sqlbuilder.NewSelectBuilder()
			cb.Select("node_name")
			cb.From("latest_condition_per_node")
			applyNodeReadinessFilter(cb, tt.readiness)
			sql, args := cb.BuildWithFlavor(sqlbuilder.ClickHouse)

			hasWhere := strings.Contains(sql, "condition_value IN (")
			if hasWhere != tt.wantWhere {
				t.Errorf("applyNodeReadinessFilter(%v) sql = %q, wantWhere = %v", tt.readiness, sql, tt.wantWhere)
			}
			if len(tt.wantArgs) == 0 {
				if len(args) != 0 {
					t.Errorf("applyNodeReadinessFilter(%v) args = %v, want none", tt.readiness, args)
				}
			} else if !reflect.DeepEqual(args, tt.wantArgs) {
				t.Errorf("applyNodeReadinessFilter(%v) args = %v, want %v", tt.readiness, args, tt.wantArgs)
			}
		})
	}
}
