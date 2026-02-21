package telemetrylogs

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/require"
)

func TestFilterExprEmbeddedVariables(t *testing.T) {
	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm, nil)
	keys := buildCompleteFieldKeyMap()

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
			query: "version = '$env-xyz'",
			variables: map[string]qbtypes.VariableItem{
				"env": {
					Type:  qbtypes.DynamicVariableType,
					Value: "prod",
				},
			},
			shouldPass:    true,
			expectedQuery: "WHERE (attributes_string['version'] = ? AND mapContains(attributes_string, 'version') = ?)",
			expectedArgs:  []any{"prod-xyz", true},
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
			expectedQuery: "WHERE (multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) LIKE ? AND multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL)",
			expectedArgs:  []any{"prod%"},
		},
		{
			name:  "variable with prefix and suffix",
			query: "path = 'prefix-$var-suffix'",
			variables: map[string]qbtypes.VariableItem{
				"var": {
					Type:  qbtypes.DynamicVariableType,
					Value: "middle",
				},
			},
			shouldPass:    true,
			expectedQuery: "WHERE (attributes_string['path'] = ? AND mapContains(attributes_string, 'path') = ?)",
			expectedArgs:  []any{"prefix-middle-suffix", true},
		},
		{
			name:  "multiple variables in one string",
			query: "path = '$region-$env-cluster'",
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
			expectedQuery: "WHERE (attributes_string['path'] = ? AND mapContains(attributes_string, 'path') = ?)",
			expectedArgs:  []any{"us-west-prod-cluster", true},
		},
		{
			name:  "similar variable names - longer matches first",
			query: "path = '$env-$environment'",
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
			expectedQuery: "WHERE (attributes_string['path'] = ? AND mapContains(attributes_string, 'path') = ?)",
			expectedArgs:  []any{"dev-production", true},
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
			expectedQuery: "WHERE (multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) = ? AND multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL)",
			expectedArgs:  []any{"auth-service"},
		},
		{
			name:  "variable with underscore composed with suffix",
			query: "version = '$my_var-test'",
			variables: map[string]qbtypes.VariableItem{
				"my_var": {
					Type:  qbtypes.DynamicVariableType,
					Value: "hello",
				},
			},
			shouldPass:    true,
			expectedQuery: "WHERE (attributes_string['version'] = ? AND mapContains(attributes_string, 'version') = ?)",
			expectedArgs:  []any{"hello-test", true},
		},
		{
			name:  "variable in ILIKE pattern",
			query: "message ILIKE '%$pattern%'",
			variables: map[string]qbtypes.VariableItem{
				"pattern": {
					Type:  qbtypes.DynamicVariableType,
					Value: "error",
				},
			},
			shouldPass:    true,
			expectedQuery: "WHERE (LOWER(attributes_string['message']) LIKE LOWER(?) AND mapContains(attributes_string, 'message') = ?)",
			expectedArgs:  []any{"%error%", true},
		},
		{
			name:  "__all__ value skips condition",
			query: "version = '$env-xyz'",
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
			query: "version = '$env-xyz'",
			variables: map[string]qbtypes.VariableItem{
				"env": {
					Type:  qbtypes.DynamicVariableType,
					Value: []any{"prod", "staging", "dev"},
				},
			},
			shouldPass:    true,
			expectedQuery: "WHERE (attributes_string['version'] = ? AND mapContains(attributes_string, 'version') = ?)",
			expectedArgs:  []any{"prod-xyz", true},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			opts := querybuilder.FilterExprVisitorOpts{
				Logger:           instrumentationtest.New().Logger(),
				FieldMapper:      fm,
				ConditionBuilder: cb,
				FieldKeys:        keys,
				FullTextColumn:   DefaultFullTextColumn,
				JsonKeyToKey:     GetBodyJSONKey,
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
