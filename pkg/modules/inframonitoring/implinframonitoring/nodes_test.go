package implinframonitoring

import (
	"reflect"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
)

func TestNodeReadinessFilterClause(t *testing.T) {
	tests := []struct {
		name       string
		readiness  inframonitoringtypes.NodeCondition
		wantClause string
		wantArgs   []any
	}{
		{
			name:       "empty readiness yields no clause",
			readiness:  inframonitoringtypes.NodeCondition{},
			wantClause: "",
			wantArgs:   nil,
		},
		{
			name:       "ready maps to 1",
			readiness:  inframonitoringtypes.NodeConditionReady,
			wantClause: " WHERE condition_value = ? ",
			wantArgs:   []any{inframonitoringtypes.NodeConditionNumReady},
		},
		{
			name:       "not_ready maps to 0",
			readiness:  inframonitoringtypes.NodeConditionNotReady,
			wantClause: " WHERE condition_value = ? ",
			wantArgs:   []any{inframonitoringtypes.NodeConditionNumNotReady},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotClause, gotArgs := nodeReadinessFilterClause(tt.readiness)
			if gotClause != tt.wantClause {
				t.Errorf("nodeReadinessFilterClause(%v) clause = %q, want %q", tt.readiness, gotClause, tt.wantClause)
			}
			if !reflect.DeepEqual(gotArgs, tt.wantArgs) {
				t.Errorf("nodeReadinessFilterClause(%v) args = %v, want %v", tt.readiness, gotArgs, tt.wantArgs)
			}
		})
	}
}
