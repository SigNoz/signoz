package telemetrymetrics

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/require"
)

func buildMetricsFieldKeyMap() map[string][]*telemetrytypes.TelemetryFieldKey {
	return map[string][]*telemetrytypes.TelemetryFieldKey{
		"service.name": {
			{
				Name:          "service.name",
				Signal:        telemetrytypes.SignalMetrics,
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"host.name": {
			{
				Name:          "host.name",
				Signal:        telemetrytypes.SignalMetrics,
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"environment": {
			{
				Name:          "environment",
				Signal:        telemetrytypes.SignalMetrics,
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"region": {
			{
				Name:          "region",
				Signal:        telemetrytypes.SignalMetrics,
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"cluster": {
			{
				Name:          "cluster",
				Signal:        telemetrytypes.SignalMetrics,
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
	}
}

func TestFilterExprEmbeddedVariables(t *testing.T) {
	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm)
	keys := buildMetricsFieldKeyMap()

	testCases := []struct {
		name          string
		query         string
		variables     map[string]qbtypes.VariableItem
		shouldPass    bool
		expectedQuery string
		expectedArgs  []any
	}{
		{
			name:  "variable composed with suffix in quoted string",
			query: "host.name = '$env-server'",
			variables: map[string]qbtypes.VariableItem{
				"env": {
					Type:  qbtypes.DynamicVariableType,
					Value: "prod",
				},
			},
			shouldPass:    true,
			expectedQuery: "WHERE JSONExtractString(labels, 'host.name') = ?",
			expectedArgs:  []any{"prod-server"},
		},
		{
			name:  "variable in LIKE pattern with suffix",
			query: "service.name LIKE '$env%'",
			variables: map[string]qbtypes.VariableItem{
				"env": {
					Type:  qbtypes.DynamicVariableType,
					Value: "prod",
				},
			},
			shouldPass:    true,
			expectedQuery: "WHERE JSONExtractString(labels, 'service.name') LIKE ?",
			expectedArgs:  []any{"prod%"},
		},
		{
			name:  "variable with prefix and suffix",
			query: "cluster = 'prefix-$var-suffix'",
			variables: map[string]qbtypes.VariableItem{
				"var": {
					Type:  qbtypes.DynamicVariableType,
					Value: "middle",
				},
			},
			shouldPass:    true,
			expectedQuery: "WHERE JSONExtractString(labels, 'cluster') = ?",
			expectedArgs:  []any{"prefix-middle-suffix"},
		},
		{
			name:  "multiple variables in one string",
			query: "cluster = '$region-$env-cluster'",
			variables: map[string]qbtypes.VariableItem{
				"region": {
					Type:  qbtypes.DynamicVariableType,
					Value: "us-west",
				},
				"env": {
					Type:  qbtypes.DynamicVariableType,
					Value: "prod",
				},
			},
			shouldPass:    true,
			expectedQuery: "WHERE JSONExtractString(labels, 'cluster') = ?",
			expectedArgs:  []any{"us-west-prod-cluster"},
		},
		{
			name:  "similar variable names - longer matches first",
			query: "cluster = '$env-$environment'",
			variables: map[string]qbtypes.VariableItem{
				"env": {
					Type:  qbtypes.DynamicVariableType,
					Value: "dev",
				},
				"environment": {
					Type:  qbtypes.DynamicVariableType,
					Value: "production",
				},
			},
			shouldPass:    true,
			expectedQuery: "WHERE JSONExtractString(labels, 'cluster') = ?",
			expectedArgs:  []any{"dev-production"},
		},
		{
			name:  "pure variable reference - still works",
			query: "service.name = $service",
			variables: map[string]qbtypes.VariableItem{
				"service": {
					Type:  qbtypes.DynamicVariableType,
					Value: "auth-service",
				},
			},
			shouldPass:    true,
			expectedQuery: "WHERE JSONExtractString(labels, 'service.name') = ?",
			expectedArgs:  []any{"auth-service"},
		},
		{
			name:  "variable with underscore composed with suffix",
			query: "host.name = '$my_var-test'",
			variables: map[string]qbtypes.VariableItem{
				"my_var": {
					Type:  qbtypes.DynamicVariableType,
					Value: "hello",
				},
			},
			shouldPass:    true,
			expectedQuery: "WHERE JSONExtractString(labels, 'host.name') = ?",
			expectedArgs:  []any{"hello-test"},
		},
		{
			name:  "variable in ILIKE pattern",
			query: "environment ILIKE '%$pattern%'",
			variables: map[string]qbtypes.VariableItem{
				"pattern": {
					Type:  qbtypes.DynamicVariableType,
					Value: "staging",
				},
			},
			shouldPass:    true,
			expectedQuery: "WHERE LOWER(JSONExtractString(labels, 'environment')) LIKE LOWER(?)",
			expectedArgs:  []any{"%staging%"},
		},
		{
			name:  "__all__ value skips condition",
			query: "host.name = '$env-server'",
			variables: map[string]qbtypes.VariableItem{
				"env": {
					Type:  qbtypes.DynamicVariableType,
					Value: "__all__",
				},
			},
			shouldPass:    true,
			expectedQuery: "WHERE true",
			expectedArgs:  nil,
		},
		{
			name:  "multi-select takes first value",
			query: "host.name = '$env-server'",
			variables: map[string]qbtypes.VariableItem{
				"env": {
					Type:  qbtypes.DynamicVariableType,
					Value: []any{"prod", "staging", "dev"},
				},
			},
			shouldPass:    true,
			expectedQuery: "WHERE JSONExtractString(labels, 'host.name') = ?",
			expectedArgs:  []any{"prod-server"},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			opts := querybuilder.FilterExprVisitorOpts{
				Logger:           instrumentationtest.New().Logger(),
				FieldMapper:      fm,
				ConditionBuilder: cb,
				FieldKeys:        keys,
				Variables:        tc.variables,
			}

			clause, err := querybuilder.PrepareWhereClause(tc.query, opts, 0, 0)

			if tc.shouldPass {
				require.NoError(t, err)
				require.NotNil(t, clause)
				sql, args := clause.WhereClause.BuildWithFlavor(sqlbuilder.ClickHouse)
				require.Equal(t, tc.expectedQuery, sql)
				require.Equal(t, tc.expectedArgs, args)
			} else {
				require.Error(t, err)
			}
		})
	}
}
