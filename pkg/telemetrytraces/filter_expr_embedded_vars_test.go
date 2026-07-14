package telemetrytraces

import (
	"context"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/require"
)

// TestFilterExprEmbeddedVariables covers variables composed inside values
// (GitHub issue #10008), e.g. '$env-suffix' or LIKE '$env%'.
func TestFilterExprEmbeddedVariables(t *testing.T) {
	releaseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)
	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm)
	keys := buildCompleteFieldKeyMap(releaseTime)

	testCases := []struct {
		name          string
		query         string
		variables     map[string]qbtypes.VariableItem
		shouldPass    bool
		expectSkipped bool
		expectedQuery string
		expectedArgs  []any
	}{
		{
			name:  "variable composed with suffix in quoted string",
			query: "http.method = '$method-request'",
			variables: map[string]qbtypes.VariableItem{
				"method": {
					Type:  qbtypes.DynamicVariableType,
					Value: "GET",
				},
			},
			shouldPass:    true,
			expectedQuery: "WHERE (attributes_string['http.method'] = ? AND mapContains(attributes_string, 'http.method') = ?)",
			expectedArgs:  []any{"GET-request", true},
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
			query: "user.id = 'user-$var-id'",
			variables: map[string]qbtypes.VariableItem{
				"var": {
					Type:  qbtypes.DynamicVariableType,
					Value: "123",
				},
			},
			shouldPass:    true,
			expectedQuery: "WHERE (attributes_string['user.id'] = ? AND mapContains(attributes_string, 'user.id') = ?)",
			expectedArgs:  []any{"user-123-id", true},
		},
		{
			name:  "multiple variables in one string",
			query: "user.id = '$region-$env-user'",
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
			expectedQuery: "WHERE (attributes_string['user.id'] = ? AND mapContains(attributes_string, 'user.id') = ?)",
			expectedArgs:  []any{"us-west-prod-user", true},
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
			name:  "__all__ value skips condition",
			query: "http.method = '$method-request'",
			variables: map[string]qbtypes.VariableItem{
				"method": {
					Type:  qbtypes.DynamicVariableType,
					Value: qbtypes.AllVariableValue,
				},
			},
			shouldPass:    true,
			expectSkipped: true,
		},
		{
			name:  "multi-select takes first value",
			query: "http.method = '$method-request'",
			variables: map[string]qbtypes.VariableItem{
				"method": {
					Type:  qbtypes.DynamicVariableType,
					Value: []any{"GET", "POST", "PUT"},
				},
			},
			shouldPass:    true,
			expectedQuery: "WHERE (attributes_string['http.method'] = ? AND mapContains(attributes_string, 'http.method') = ?)",
			expectedArgs:  []any{"GET-request", true},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			opts := querybuilder.FilterExprVisitorOpts{
				Context:          context.Background(),
				Logger:           instrumentationtest.New().Logger(),
				FieldMapper:      fm,
				ConditionBuilder: cb,
				FieldKeys:        keys,
				Variables:        tc.variables,
				StartNs:          uint64(releaseTime.Add(-5 * time.Minute).UnixNano()),
				EndNs:            uint64(releaseTime.Add(5 * time.Minute).UnixNano()),
			}

			clause, err := querybuilder.PrepareWhereClause(tc.query, opts)

			if !tc.shouldPass {
				require.Error(t, err)
				return
			}

			require.NoError(t, err)
			if tc.expectSkipped {
				require.True(t, clause.IsEmpty(), "expected the condition to be skipped")
				return
			}
			require.False(t, clause.IsEmpty())
			sql, args := clause.WhereClause.BuildWithFlavor(sqlbuilder.ClickHouse)
			require.Equal(t, tc.expectedQuery, sql)
			require.Equal(t, tc.expectedArgs, args)
		})
	}
}
