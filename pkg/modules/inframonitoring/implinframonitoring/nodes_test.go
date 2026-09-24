package implinframonitoring

import (
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/assert"
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
			assert.Equal(t, tt.wantWhere, hasWhere)
			if len(tt.wantArgs) == 0 {
				assert.Empty(t, args)
			} else {
				assert.Equal(t, tt.wantArgs, args)
			}
		})
	}
}
