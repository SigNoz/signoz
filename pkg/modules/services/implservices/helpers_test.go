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
		{name: "wrong type -> 0", row: []any{"not-number"}, idx: 0, want: 0},
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
		{name: "wrong type -> 0", row: []any{"not-number"}, idx: 0, want: 0},
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

func TestBuildFilterExpression(t *testing.T) {
	tests := []struct {
		name     string
		tags     []servicetypesv1.TagFilterItem
		wantExpr string
		assertV  func(t *testing.T, vars map[string]qbtypes.VariableItem)
	}{
		{
			name:     "no tags -> empty expr",
			tags:     nil,
			wantExpr: "",
			assertV: func(t *testing.T, vars map[string]qbtypes.VariableItem) {
				assert.Equal(t, 0, len(vars))
			},
		},
		{
			name: "not in multiple strings",
			tags: []servicetypesv1.TagFilterItem{
				{Key: "service.name", Operator: "NotIn", StringValues: []string{"svc-a", "svc-b"}},
			},
			wantExpr: "service.name NOT IN $1",
			assertV: func(t *testing.T, vars map[string]qbtypes.VariableItem) {
				arr, ok := vars["1"].Value.([]any)
				assert.True(t, ok)
				assert.ElementsMatch(t, []any{"svc-a", "svc-b"}, arr)
			},
		},
		{
			name: "in single string",
			tags: []servicetypesv1.TagFilterItem{
				{Key: "deployment.environment", Operator: "in", StringValues: []string{"staging"}},
			},
			wantExpr: "deployment.environment IN $1",
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
			wantExpr: "service.name IN $1",
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
			wantExpr: "http.status_code IN $1",
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
			wantExpr: "feature.flag IN $1",
			assertV: func(t *testing.T, vars map[string]qbtypes.VariableItem) {
				arr, ok := vars["1"].Value.([]any)
				assert.True(t, ok)
				assert.ElementsMatch(t, []any{true, false}, arr)
			},
		},
		{
			name: "in and not in both conditions",
			tags: []servicetypesv1.TagFilterItem{
				{Key: "service.name", Operator: "In", StringValues: []string{"svc-a", "svc-b"}},
				{Key: "deployment.environment", Operator: "NotIn", StringValues: []string{"production", "staging"}},
			},
			wantExpr: "service.name IN $1 AND deployment.environment NOT IN $2",
			assertV: func(t *testing.T, vars map[string]qbtypes.VariableItem) {
				arr, ok := vars["1"].Value.([]any)
				assert.True(t, ok)
				assert.ElementsMatch(t, []any{"svc-a", "svc-b"}, arr)
				arr, ok = vars["2"].Value.([]any)
				assert.True(t, ok)
				assert.ElementsMatch(t, []any{"production", "staging"}, arr)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			expr, vars := buildFilterExpression(tt.tags)
			assert.Equal(t, tt.wantExpr, expr)
			if tt.assertV != nil {
				tt := tt
				tt.assertV(t, vars)
			}
		})
	}
}

func TestValidateTagFilterItems(t *testing.T) {
	tests := []struct {
		name    string
		tags    []servicetypesv1.TagFilterItem
		wantErr string
	}{
		{
			name:    "empty tags -> ok",
			tags:    nil,
			wantErr: "",
		},
		{
			name:    "missing key -> error",
			tags:    []servicetypesv1.TagFilterItem{{Key: "", Operator: "in", StringValues: []string{"a"}}},
			wantErr: "key is required",
		},
		{
			name: "valid in and notin",
			tags: []servicetypesv1.TagFilterItem{
				{Key: "service.name", Operator: "in", StringValues: []string{"svc-a", "svc-b"}},
				{Key: "deployment.environment", Operator: "notin", StringValues: []string{"prod"}},
			},
			wantErr: "",
		},
		{
			name:    "invalid operator -> error",
			tags:    []servicetypesv1.TagFilterItem{{Key: "service.name", Operator: "equals", StringValues: []string{"a"}}},
			wantErr: "only in and notin operators are supported",
		},
		{
			name:    "in with no values -> error",
			tags:    []servicetypesv1.TagFilterItem{{Key: "env", Operator: "in"}},
			wantErr: "at least one of stringValues, boolValues, or numberValues must be populated",
		},
		{
			name:    "notin with no values -> error",
			tags:    []servicetypesv1.TagFilterItem{{Key: "env", Operator: "notin"}},
			wantErr: "at least one of stringValues, boolValues, or numberValues must be populated",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateTagFilterItems(tt.tags)
			if tt.wantErr == "" {
				assert.NoError(t, err)
			} else {
				if assert.Error(t, err) {
					assert.Contains(t, err.Error(), tt.wantErr)
				}
			}
		})
	}
}
