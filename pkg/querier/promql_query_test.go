package querier

import (
	"log/slog"
	"testing"

	qbv5 "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/stretchr/testify/assert"
)

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
