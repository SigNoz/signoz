package querier

import (
	"log/slog"
	"testing"

	qbv5 "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/stretchr/testify/assert"
)

func TestIsAllValue(t *testing.T) {
	tests := []struct {
		name     string
		value    any
		expected bool
	}{
		{
			name:     "string __all__",
			value:    "__all__",
			expected: true,
		},
		{
			name:     "[]any with single __all__ element",
			value:    []any{"__all__"},
			expected: true,
		},
		{
			name:     "[]string with single __all__ element",
			value:    []string{"__all__"},
			expected: true,
		},
		{
			name:     "regular string value",
			value:    "host1",
			expected: false,
		},
		{
			name:     "[]any with multiple elements including __all__",
			value:    []any{"__all__", "host1"},
			expected: false,
		},
		{
			name:     "[]any with single non-__all__ element",
			value:    []any{"host1"},
			expected: false,
		},
		{
			name:     "empty []any",
			value:    []any{},
			expected: false,
		},
		{
			name:     "nil value",
			value:    nil,
			expected: false,
		},
		{
			name:     "integer value",
			value:    123,
			expected: false,
		},
		{
			name:     "[]any with non-string element",
			value:    []any{123},
			expected: false,
		},
		{
			name:     "similar but not exact __all__ string",
			value:    "__ALL__",
			expected: false,
		},
		{
			name:     "[]string with multiple elements",
			value:    []string{"__all__", "host1"},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isAllValue(tt.value)
			assert.Equal(t, tt.expected, result, "isAllValue(%v)", tt.value)
		})
	}
}

func TestRemoveAllVarMatchers(t *testing.T) {
	logger := slog.Default()
	q := &promqlQuery{logger: logger}

	tests := []struct {
		name      string
		query     string
		vars      map[string]qbv5.VariableItem
		expected  string
		expectErr bool
	}{
		{
			name:  "remove $var pattern with __all__",
			query: `sum(rate({__name__="system.cpu.time", "host.name"=~"$host.name"}[5m]))`,
			vars: map[string]qbv5.VariableItem{
				"host.name": {
					Type:  qbv5.DynamicVariableType,
					Value: "__all__",
				},
			},
			expected:  `sum(rate({__name__="system.cpu.time"}[5m]))`,
			expectErr: false,
		},
		{
			name:  "remove {{var}} pattern with __all__",
			query: `sum(rate({__name__="system.cpu.time", "host.name"=~"{{host.name}}"}[5m]))`,
			vars: map[string]qbv5.VariableItem{
				"host.name": {
					Type:  qbv5.DynamicVariableType,
					Value: "__all__",
				},
			},
			expected:  `sum(rate({__name__="system.cpu.time"}[5m]))`,
			expectErr: false,
		},
		{
			name:  "remove [[var]] pattern with __all__",
			query: `sum(rate({__name__="system.cpu.time", "host.name"=~"[[host.name]]"}[5m]))`,
			vars: map[string]qbv5.VariableItem{
				"host.name": {
					Type:  qbv5.DynamicVariableType,
					Value: "__all__",
				},
			},
			expected:  `sum(rate({__name__="system.cpu.time"}[5m]))`,
			expectErr: false,
		},
		{
			name:  "multiple variables, one with __all__",
			query: `sum(rate({__name__="system.cpu.time", "host.name"=~"$host.name", "env"="$env"}[5m]))`,
			vars: map[string]qbv5.VariableItem{
				"host.name": {
					Type:  qbv5.DynamicVariableType,
					Value: "__all__",
				},
				"env": {
					Type:  qbv5.DynamicVariableType,
					Value: "production",
				},
			},
			expected:  `sum(rate({__name__="system.cpu.time",env="$env"}[5m]))`,
			expectErr: false,
		},
		{
			name:  "no __all__ variables, query unchanged",
			query: `sum(rate({__name__="system.cpu.time", "host.name"=~"$host.name"}[5m]))`,
			vars: map[string]qbv5.VariableItem{
				"host.name": {
					Type:  qbv5.DynamicVariableType,
					Value: "host1",
				},
			},
			expected:  `sum(rate({__name__="system.cpu.time", "host.name"=~"$host.name"}[5m]))`,
			expectErr: false,
		},
		{
			name:  "non-dynamic variable type, not removed",
			query: `sum(rate({__name__="system.cpu.time", "host.name"=~"$host.name"}[5m]))`,
			vars: map[string]qbv5.VariableItem{
				"host.name": {
					Type:  qbv5.QueryVariableType,
					Value: "__all__",
				},
			},
			expected:  `sum(rate({__name__="system.cpu.time", "host.name"=~"$host.name"}[5m]))`,
			expectErr: false,
		},
		{
			name:  "invalid PromQL query",
			query: `invalid promql query syntax {`,
			vars: map[string]qbv5.VariableItem{
				"host.name": {
					Type:  qbv5.DynamicVariableType,
					Value: "__all__",
				},
			},
			expected:  "",
			expectErr: true,
		},
		{
			name:  "invalid PromQL query with mismatched brackets",
			query: `sum(rate({__name__="system.cpu.time", "host.name"=~"$host.name"}[5m]`,
			vars: map[string]qbv5.VariableItem{
				"host.name": {
					Type:  qbv5.DynamicVariableType,
					Value: "__all__",
				},
			},
			expected:  "",
			expectErr: true,
		},
		{
			name:      "empty vars map",
			query:     `sum(rate({__name__="system.cpu.time", "host.name"=~"$host.name"}[5m]))`,
			vars:      map[string]qbv5.VariableItem{},
			expected:  `sum(rate({__name__="system.cpu.time", "host.name"=~"$host.name"}[5m]))`,
			expectErr: false,
		},
		{
			name:  "multiple matchers with __all__ variable",
			query: `sum(rate({__name__="system.cpu.time", "host.name"=~"$host.name", "env"="$env", "region"=~"$region"}[5m]))`,
			vars: map[string]qbv5.VariableItem{
				"host.name": {
					Type:  qbv5.DynamicVariableType,
					Value: "__all__",
				},
				"env": {
					Type:  qbv5.DynamicVariableType,
					Value: "__all__",
				},
				"region": {
					Type:  qbv5.DynamicVariableType,
					Value: "us-east",
				},
			},
			expected:  `sum(rate({__name__="system.cpu.time",region=~"$region"}[5m]))`,
			expectErr: false,
		},
		{
			name:  "__all__ value not string type",
			query: `sum(rate({__name__="system.cpu.time", "host.name"=~"$host.name"}[5m]))`,
			vars: map[string]qbv5.VariableItem{
				"host.name": {
					Type:  qbv5.DynamicVariableType,
					Value: 123, // Not a string
				},
			},
			expected:  `sum(rate({__name__="system.cpu.time", "host.name"=~"$host.name"}[5m]))`,
			expectErr: false,
		},
		{
			name:  "__all__ value as []any with single element",
			query: `sum(rate({__name__="system.cpu.time", "host.name"=~"$host.name"}[5m]))`,
			vars: map[string]qbv5.VariableItem{
				"host.name": {
					Type:  qbv5.DynamicVariableType,
					Value: []any{"__all__"},
				},
			},
			expected:  `sum(rate({__name__="system.cpu.time"}[5m]))`,
			expectErr: false,
		},
		{
			name:  "__all__ value as []string with single element",
			query: `sum(rate({__name__="system.cpu.time", "host.name"=~"$host.name"}[5m]))`,
			vars: map[string]qbv5.VariableItem{
				"host.name": {
					Type:  qbv5.DynamicVariableType,
					Value: []string{"__all__"},
				},
			},
			expected:  `sum(rate({__name__="system.cpu.time"}[5m]))`,
			expectErr: false,
		},
		{
			name:  "__all__ value as []any with multiple elements should not match",
			query: `sum(rate({__name__="system.cpu.time", "host.name"=~"$host.name"}[5m]))`,
			vars: map[string]qbv5.VariableItem{
				"host.name": {
					Type:  qbv5.DynamicVariableType,
					Value: []any{"__all__", "host1"},
				},
			},
			expected:  `sum(rate({__name__="system.cpu.time", "host.name"=~"$host.name"}[5m]))`,
			expectErr: false,
		},
		{
			name:  "regular value as []any should not match",
			query: `sum(rate({__name__="system.cpu.time", "host.name"=~"$host.name"}[5m]))`,
			vars: map[string]qbv5.VariableItem{
				"host.name": {
					Type:  qbv5.DynamicVariableType,
					Value: []any{"host1"},
				},
			},
			expected:  `sum(rate({__name__="system.cpu.time", "host.name"=~"$host.name"}[5m]))`,
			expectErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := q.removeAllVarMatchers(tt.query, tt.vars)
			if tt.expectErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expected, result, "removeAllVarMatchers(%q) with vars=%v", tt.query, tt.vars)
			}
		})
	}
}
