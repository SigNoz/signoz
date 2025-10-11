package implservices

import (
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/servicetypes/servicetypesv1"
	"github.com/stretchr/testify/assert"
)

func TestToFloat(t *testing.T) {
	tests := []struct {
		name string
		row  []any
		idx  int
		want float64
	}{
		{name: "float64", row: []any{1.5}, idx: 0, want: 1.5},
		{name: "nil", row: []any{nil}, idx: 0, want: 0},
		{name: "oob", row: []any{1}, idx: 1, want: 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := toFloat(tt.row, tt.idx)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestToUint64(t *testing.T) {
	tests := []struct {
		name string
		row  []any
		idx  int
		want uint64
	}{
		{name: "uint64", row: []any{uint64(5)}, idx: 0, want: 5},
		{name: "nil -> 0", row: []any{nil}, idx: 0, want: 0},
		{name: "oob -> 0", row: []any{1}, idx: 2, want: 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := toUint64(tt.row, tt.idx)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestApplyOpsToItems(t *testing.T) {
	tests := []struct {
		name  string
		items []*servicetypesv1.ResponseItem
		ops   map[string][]string
		want  [][]string
	}{
		{
			name: "maps ops to matching services",
			items: []*servicetypesv1.ResponseItem{
				{ServiceName: "svc-a", DataWarning: servicetypesv1.DataWarning{TopLevelOps: []string{}}},
				{ServiceName: "svc-b", DataWarning: servicetypesv1.DataWarning{TopLevelOps: []string{}}},
			},
			ops: map[string][]string{
				"svc-a": {"op1", "op2"},
				"svc-c": {"opx"},
			},
			want: [][]string{
				{"op1", "op2"},
				{},
			},
		},
		{
			name: "nil ops map is no-op",
			items: []*servicetypesv1.ResponseItem{
				{ServiceName: "svc-a", DataWarning: servicetypesv1.DataWarning{TopLevelOps: []string{}}},
				{ServiceName: "svc-b", DataWarning: servicetypesv1.DataWarning{TopLevelOps: []string{}}},
			},
			ops:  nil,
			want: [][]string{{}, {}},
		},
		{
			name:  "empty items slice is no-op",
			items: []*servicetypesv1.ResponseItem{},
			ops:   map[string][]string{"svc-a": {"op1"}},
			want:  [][]string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			applyOpsToItems(tt.items, tt.ops)
			if len(tt.items) != len(tt.want) {
				assert.Equal(t, len(tt.want), len(tt.items))
				return
			}
			for i := range tt.items {
				if tt.items[i] == nil {
					continue
				}
				assert.Equal(t, tt.want[i], tt.items[i].DataWarning.TopLevelOps)
			}
		})
	}
}

func TestBuildFilterAndScopeExpression(t *testing.T) {
	tests := []struct {
		name     string
		tags     []servicetypesv1.TagFilterItem
		wantExpr string
		assertV  func(t *testing.T, vars map[string]qbtypes.VariableItem)
	}{
		{
			name:     "no tags -> scope only",
			tags:     nil,
			wantExpr: "isRoot = $1 OR isEntryPoint = $2",
			assertV: func(t *testing.T, vars map[string]qbtypes.VariableItem) {
				v1, ok1 := vars["1"]
				v2, ok2 := vars["2"]
				assert.True(t, ok1)
				assert.True(t, ok2)
				assert.Equal(t, true, v1.Value)
				assert.Equal(t, true, v2.Value)
			},
		},
		{
			name: "equal string",
			tags: []servicetypesv1.TagFilterItem{
				{Key: "deployment.environment", Operator: "equal", StringValues: []string{"prod"}},
			},
			wantExpr: "(deployment.environment = $1) AND (isRoot = $2 OR isEntryPoint = $3)",
			assertV: func(t *testing.T, vars map[string]qbtypes.VariableItem) {
				assert.Equal(t, "prod", vars["1"].Value)
				assert.Equal(t, true, vars["2"].Value)
				assert.Equal(t, true, vars["3"].Value)
			},
		},
		{
			name: "in single string",
			tags: []servicetypesv1.TagFilterItem{
				{Key: "deployment.environment", Operator: "in", StringValues: []string{"staging"}},
			},
			wantExpr: "(deployment.environment IN $1) AND (isRoot = $2 OR isEntryPoint = $3)",
			assertV: func(t *testing.T, vars map[string]qbtypes.VariableItem) {
				arr, ok := vars["1"].Value.([]any)
				assert.True(t, ok)
				assert.Len(t, arr, 1)
				assert.Equal(t, "staging", arr[0])
			},
		},
		{
			name: "in multiple strings",
			tags: []servicetypesv1.TagFilterItem{
				{Key: "service.name", Operator: "IN", StringValues: []string{"svc-a", "svc-b"}},
			},
			wantExpr: "(service.name IN $1) AND (isRoot = $2 OR isEntryPoint = $3)",
			assertV: func(t *testing.T, vars map[string]qbtypes.VariableItem) {
				arr, ok := vars["1"].Value.([]any)
				assert.True(t, ok)
				assert.ElementsMatch(t, []any{"svc-a", "svc-b"}, arr)
			},
		},
		{
			name: "in multiple numbers",
			tags: []servicetypesv1.TagFilterItem{
				{Key: "http.status_code", Operator: "in", NumberValues: []float64{200, 500}},
			},
			wantExpr: "(http.status_code IN $1) AND (isRoot = $2 OR isEntryPoint = $3)",
			assertV: func(t *testing.T, vars map[string]qbtypes.VariableItem) {
				arr, ok := vars["1"].Value.([]any)
				assert.True(t, ok)
				assert.ElementsMatch(t, []any{200.0, 500.0}, arr)
			},
		},
		{
			name: "in multiple bools",
			tags: []servicetypesv1.TagFilterItem{
				{Key: "feature.flag", Operator: "IN", BoolValues: []bool{true, false}},
			},
			wantExpr: "(feature.flag IN $1) AND (isRoot = $2 OR isEntryPoint = $3)",
			assertV: func(t *testing.T, vars map[string]qbtypes.VariableItem) {
				arr, ok := vars["1"].Value.([]any)
				assert.True(t, ok)
				assert.ElementsMatch(t, []any{true, false}, arr)
			},
		},
		{
			name: "equal bool and number",
			tags: []servicetypesv1.TagFilterItem{
				{Key: "feature.flag", Operator: "Equal", BoolValues: []bool{true}},
				{Key: "http.status_code", Operator: "=", NumberValues: []float64{200}},
			},
			wantExpr: "(feature.flag = $1 AND http.status_code = $2) AND (isRoot = $3 OR isEntryPoint = $4)",
			assertV: func(t *testing.T, vars map[string]qbtypes.VariableItem) {
				assert.Equal(t, true, vars["1"].Value)
				assert.Equal(t, 200.0, vars["2"].Value)
				assert.Equal(t, true, vars["3"].Value)
				assert.Equal(t, true, vars["4"].Value)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			expr, vars := buildFilterAndScopeExpression(tt.tags)
			assert.Equal(t, tt.wantExpr, expr)
			if tt.assertV != nil {
				tt := tt
				tt.assertV(t, vars)
			}
		})
	}
}
