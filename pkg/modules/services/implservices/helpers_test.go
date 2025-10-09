package implservices

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/servicetypes"
	"github.com/stretchr/testify/assert"
)

func TestBuildFilterExpression(t *testing.T) {
	tests := []struct {
		name string
		in   []servicetypes.TagFilterItem
		want string
	}{
		{
			name: "empty tags -> empty expr",
			in:   nil,
			want: "",
		},
		{
			name: "IN with two values",
			in: []servicetypes.TagFilterItem{
				{Key: "service.name", Operator: "In", StringValues: []string{"frontend", "backend"}},
			},
			want: "service.name IN ['frontend','backend']",
		},
		{
			name: "Equal operator",
			in: []servicetypes.TagFilterItem{
				{Key: "deployment.environment", Operator: "=", StringValues: []string{"prod"}},
			},
			want: "deployment.environment = 'prod'",
		},
		{
			name: "Combine IN and = with AND",
			in: []servicetypes.TagFilterItem{
				{Key: "service.name", Operator: "in", StringValues: []string{"svc-a", "svc-b"}},
				{Key: "env", Operator: "Equal", StringValues: []string{"staging"}},
			},
			want: "service.name IN ['svc-a','svc-b'] AND env = 'staging'",
		},
		{
			name: "Escape single quotes",
			in: []servicetypes.TagFilterItem{
				{Key: "owner", Operator: "=", StringValues: []string{"O'Reilly"}},
			},
			want: "owner = 'O\\'Reilly'",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := buildFilterExpression(tt.in)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestEscapeSingleQuotes(t *testing.T) {
	tests := []struct {
		in   string
		want string
	}{
		{in: "", want: ""},
		{in: "abc", want: "abc"},
		{in: "O'Reilly", want: "O\\'Reilly"},
		{in: "a'b'c", want: "a\\'b\\'c"},
	}
	for _, tt := range tests {
		got := escapeSingleQuotes(tt.in)
		assert.Equal(t, tt.want, got)
	}
}

func TestToFloat(t *testing.T) {
	tests := []struct {
		name string
		row  []any
		idx  int
		want float64
	}{
		{name: "float64", row: []any{1.5}, idx: 0, want: 1.5},
		{name: "float32", row: []any{float32(2.25)}, idx: 0, want: 2.25},
		{name: "int64", row: []any{int64(3)}, idx: 0, want: 3},
		{name: "int", row: []any{-4}, idx: 0, want: -4},
		{name: "uint64", row: []any{uint64(5)}, idx: 0, want: 5},
		{name: "nil", row: []any{nil}, idx: 0, want: 0},
		{name: "oob", row: []any{1}, idx: 1, want: 0},
		{name: "unsupported type", row: []any{"x"}, idx: 0, want: 0},
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
		{name: "int64 positive", row: []any{int64(6)}, idx: 0, want: 6},
		{name: "int negative -> 0", row: []any{-1}, idx: 0, want: 0},
		{name: "float64 positive", row: []any{7.9}, idx: 0, want: 7},
		{name: "nil -> 0", row: []any{nil}, idx: 0, want: 0},
		{name: "oob -> 0", row: []any{1}, idx: 2, want: 0},
		{name: "unsupported type -> 0", row: []any{"x"}, idx: 0, want: 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := toUint64(tt.row, tt.idx)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestApplyTopLevelOpsToItems(t *testing.T) {
	tests := []struct {
		name  string
		items []*servicetypes.ResponseItem
		ops   map[string][]string
		want  [][]string
	}{
		{
			name: "maps ops to matching services",
			items: []*servicetypes.ResponseItem{
				{ServiceName: "svc-a", DataWarning: servicetypes.DataWarning{TopLevelOps: []string{}}},
				{ServiceName: "svc-b", DataWarning: servicetypes.DataWarning{TopLevelOps: []string{}}},
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
			items: []*servicetypes.ResponseItem{
				{ServiceName: "svc-a", DataWarning: servicetypes.DataWarning{TopLevelOps: []string{}}},
				{ServiceName: "svc-b", DataWarning: servicetypes.DataWarning{TopLevelOps: []string{}}},
			},
			ops:  nil,
			want: [][]string{{}, {}},
		},
		{
			name:  "empty items slice is no-op",
			items: []*servicetypes.ResponseItem{},
			ops:   map[string][]string{"svc-a": {"op1"}},
			want:  [][]string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			applyTopLevelOpsToItems(tt.items, tt.ops)
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
