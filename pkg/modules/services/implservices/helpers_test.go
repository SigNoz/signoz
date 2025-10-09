package implservices

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/servicetypes/servicetypesv1"
	"github.com/stretchr/testify/assert"
)

// func TestBuildFilterExpression(t *testing.T) {
// 	tests := []struct {
// 		name string
// 		in   []servicetypesv1.TagFilterItem
// 		want string
// 	}{
// 		{
// 			name: "empty tags -> empty expr",
// 			in:   nil,
// 			want: "",
// 		},
// 		{
// 			name: "IN with two values",
// 			in: []servicetypesv1.TagFilterItem{
// 				{Key: "service.name", Operator: "In", StringValues: []string{"frontend", "backend"}},
// 			},
// 			want: "service.name IN ['frontend','backend']",
// 		},
// 		{
// 			name: "Equal operator",
// 			in: []servicetypesv1.TagFilterItem{
// 				{Key: "deployment.environment", Operator: "=", StringValues: []string{"prod"}},
// 			},
// 			want: "deployment.environment = 'prod'",
// 		},
// 		{
// 			name: "Combine IN and = with AND",
// 			in: []servicetypesv1.TagFilterItem{
// 				{Key: "service.name", Operator: "in", StringValues: []string{"svc-a", "svc-b"}},
// 				{Key: "env", Operator: "Equal", StringValues: []string{"staging"}},
// 			},
// 			want: "service.name IN ['svc-a','svc-b'] AND env = 'staging'",
// 		},
// 		{
// 			name: "Escape single quotes",
// 			in: []servicetypesv1.TagFilterItem{
// 				{Key: "owner", Operator: "=", StringValues: []string{"O'Reilly"}},
// 			},
// 			want: "owner = 'O\\'Reilly'",
// 		},
// 	}

// 	for _, tt := range tests {
// 		t.Run(tt.name, func(t *testing.T) {
// 			got := buildFilterExpression(tt.in)
// 			assert.Equal(t, tt.want, got)
// 		})
// 	}
// }

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
