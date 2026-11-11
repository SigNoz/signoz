package querybuilder

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func builderQueryBody(signal, filterExpression string) string {
	return `{"compositeQuery":{"queries":[{"type":"builder_query","spec":{"signal":"` + signal + `","filter":{"expression":"` + filterExpression + `"}}}]}}`
}

func TestQueryRangeResources(t *testing.T) {
	testCases := []struct {
		name     string
		body     string
		expected []coretypes.ResourceWithID
	}{
		{
			name: "TopLevelEquality_OneResource",
			body: builderQueryBody("logs", "signoz.workspace.key.id = 'checkout' AND status = 500"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/signoz.workspace.key.id = 'checkout'"},
			},
		},
		{
			name: "ResourcePrefixedKey_KeptInID",
			body: builderQueryBody("traces", "resource.signoz.workspace.key.id = 'checkout'"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceTraces, ID: "builder_query/resource.signoz.workspace.key.id = 'checkout'"},
			},
		},
		{
			name: "SingleList_OneResourcePerValue",
			body: builderQueryBody("logs", "signoz.workspace.key.id IN ('b', 'a')"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/signoz.workspace.key.id = 'a'"},
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/signoz.workspace.key.id = 'b'"},
			},
		},
		{
			name: "SameKeyEqualities_OneResource",
			body: builderQueryBody("logs", "signoz.workspace.key.id = 'b' AND signoz.workspace.key.id = 'a'"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/signoz.workspace.key.id = 'a' AND signoz.workspace.key.id = 'b'"},
			},
		},
		{
			name: "DifferentKeyEqualities_OneResource",
			body: builderQueryBody("logs", "resource.service.name = 'checkout' AND resource.deployment.environment.name = 'prod'"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/resource.deployment.environment.name = 'prod' AND resource.service.name = 'checkout'"},
			},
		},
		{
			name: "SingleListWithEquality_ExpandsPerValue",
			body: builderQueryBody("logs", "resource.service.name IN ('b', 'a') AND signoz.workspace.key.id = 'k'"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/resource.service.name = 'a' AND signoz.workspace.key.id = 'k'"},
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/resource.service.name = 'b' AND signoz.workspace.key.id = 'k'"},
			},
		},
		{
			name: "TwoLists_OneResource",
			body: builderQueryBody("logs", "resource.service.name IN ('a', 'b') AND signoz.workspace.key.id IN ('y', 'z')"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/resource.service.name IN ('a', 'b') AND signoz.workspace.key.id IN ('y', 'z')"},
			},
		},
		{
			name: "SingleValueListBesideList_Pinned",
			body: builderQueryBody("logs", "resource.service.name IN ('a', 'b') AND signoz.workspace.key.id IN ('k')"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/resource.service.name = 'a' AND signoz.workspace.key.id = 'k'"},
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/resource.service.name = 'b' AND signoz.workspace.key.id = 'k'"},
			},
		},
		{
			name: "SingleValueListsOnly_Pinned",
			body: builderQueryBody("logs", "resource.service.name IN ('a') AND signoz.workspace.key.id IN ('k')"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/resource.service.name = 'a' AND signoz.workspace.key.id = 'k'"},
			},
		},
		{
			name: "RepeatedList_ExpandsOnce",
			body: builderQueryBody("logs", "resource.service.name IN ('checkout') AND resource.service.name IN ('checkout')"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/resource.service.name = 'checkout'"},
			},
		},
		{
			name: "TwoListsOneKey_OneResource",
			body: builderQueryBody("logs", "signoz.workspace.key.id IN ('a', 'b') AND resource.signoz.workspace.key.id IN ('b', 'c')"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/resource.signoz.workspace.key.id IN ('b', 'c') AND signoz.workspace.key.id IN ('a', 'b')"},
			},
		},
		{
			name: "OldEnvironmentSpelling_NotAnAtom",
			body: builderQueryBody("traces", "resource.deployment.environment = 'prod'"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceTraces, ID: "builder_query/*"},
			},
		},
		{
			name: "ServiceList_OneResourcePerValue",
			body: builderQueryBody("logs", "resource.service.name IN ('frontend', 'checkout')"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/resource.service.name = 'checkout'"},
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/resource.service.name = 'frontend'"},
			},
		},
		{
			name: "BareCustomerKey_NotAnAtom",
			body: builderQueryBody("logs", "service.name = 'checkout'"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/*"},
			},
		},
		{
			name: "NoFilter_QueryTypeWildcard",
			body: `{"compositeQuery":{"queries":[{"type":"builder_query","spec":{"signal":"logs"}}]}}`,
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/*"},
			},
		},
		{
			name: "TopLevelOr_NoAtoms",
			body: builderQueryBody("logs", "signoz.workspace.key.id = 'a' OR status = 500"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/*"},
			},
		},
		{
			name: "ListUnderOr_NoAtoms",
			body: builderQueryBody("logs", "signoz.workspace.key.id IN ('a', 'b') OR status = 500"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/*"},
			},
		},
		{
			name: "NestedNegationUnion_NoAtoms",
			body: builderQueryBody("logs", "NOT (NOT resource.service.name = 'checkout' AND NOT resource.service.name = 'frontend')"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/*"},
			},
		},
		{
			name: "ValueWithSpacesAndSlashes_Plaintext",
			body: builderQueryBody("logs", "signoz.workspace.key.id = 'check out/2'"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/signoz.workspace.key.id = 'check out/2'"},
			},
		},
		{
			name: "AuditSource_AuditLogsResource",
			body: `{"compositeQuery":{"queries":[{"type":"builder_query","spec":{"signal":"logs","source":"audit","filter":{"expression":"signoz.workspace.key.id = 'a'"}}}]}}`,
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceAuditLogs, ID: "builder_query/signoz.workspace.key.id = 'a'"},
			},
		},
		{
			name: "AIBuilderQuery_TracesResource",
			body: `{"compositeQuery":{"queries":[{"type":"builder_ai_query","spec":{"filter":{"expression":"signoz.workspace.key.id = 'checkout'"}}}]}}`,
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceTraces, ID: "builder_ai_query/signoz.workspace.key.id = 'checkout'"},
			},
		},
		{
			name: "AIBuilderQueryNoFilter_Wildcard",
			body: `{"compositeQuery":{"queries":[{"type":"builder_ai_query","spec":{}}]}}`,
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceTraces, ID: "builder_ai_query/*"},
			},
		},
		{
			name: "PromQL_WildcardOnly",
			body: `{"compositeQuery":{"queries":[{"type":"promql","spec":{"query":"up"}}]}}`,
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceMetrics, ID: "promql/*"},
			},
		},
		{
			name: "ClickHouseSQL_AllSignals",
			body: `{"compositeQuery":{"queries":[{"type":"clickhouse_sql","spec":{"query":"SELECT 1"}}]}}`,
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "clickhouse_sql/*"},
				{Resource: coretypes.ResourceTelemetryResourceTraces, ID: "clickhouse_sql/*"},
				{Resource: coretypes.ResourceTelemetryResourceMetrics, ID: "clickhouse_sql/*"},
				{Resource: coretypes.ResourceTelemetryResourceMeterMetrics, ID: "clickhouse_sql/*"},
			},
		},
		{
			name:     "Formula_NoResources",
			body:     `{"compositeQuery":{"queries":[{"type":"builder_formula","spec":{"expression":"A/B"}}]}}`,
			expected: []coretypes.ResourceWithID{},
		},
		{
			name: "TraceOperator_ReferencedQueries",
			body: `{"compositeQuery":{"queries":[{"type":"builder_query","spec":{"name":"A","signal":"traces","disabled":true,"filter":{"expression":"signoz.workspace.key.id = 'checkout'"}}},{"type":"builder_query","spec":{"name":"B","signal":"traces","disabled":true,"filter":{"expression":"signoz.workspace.key.id = 'checkout' AND has_error = true"}}},{"type":"builder_trace_operator","spec":{"name":"T1","expression":"A => B","returnSpansFrom":"A"}}]}}`,
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceTraces, ID: "builder_query/signoz.workspace.key.id = 'checkout'"},
			},
		},
		{
			name: "VariableSubstitution_Qualifies",
			body: `{"variables":{"key":{"value":"checkout"}},"compositeQuery":{"queries":[{"type":"builder_query","spec":{"signal":"logs","filter":{"expression":"signoz.workspace.key.id = $key"}}}]}}`,
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/signoz.workspace.key.id = 'checkout'"},
			},
		},
		{
			name: "DuplicateQueries_Deduped",
			body: `{"compositeQuery":{"queries":[{"type":"builder_query","spec":{"signal":"logs","filter":{"expression":"signoz.workspace.key.id = 'a'"}}},{"type":"builder_query","spec":{"signal":"logs","filter":{"expression":"signoz.workspace.key.id='a'"}}}]}}`,
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/signoz.workspace.key.id = 'a'"},
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			refs, err := QueryRangeResources(coretypes.ExtractorContext{RequestBody: []byte(testCase.body)})
			require.NoError(t, err)
			assert.Equal(t, testCase.expected, refs)
		})
	}
}

func TestQueryRangeResourcesErrors(t *testing.T) {
	bodies := []string{
		`{"compositeQuery":{"queries":[]}}`,
		`{}`,
		builderQueryBody("logs", "signoz.workspace.key.id = "),
		`{"compositeQuery":{"queries":[{"type":"builder_query","spec":{"signal":"unknown"}}]}}`,
		`{"compositeQuery":{"queries":[{"type":"unknown_type"}]}}`,
	}

	for _, body := range bodies {
		_, err := QueryRangeResources(coretypes.ExtractorContext{RequestBody: []byte(body)})
		assert.Error(t, err, "body %s", body)
	}
}

func TestTelemetrySelector(t *testing.T) {
	orgID := valuer.GenerateUUID()

	selectorValues := func(id string) []string {
		selectors, err := TelemetrySelector(context.Background(), coretypes.ResourceTelemetryResourceLogs, id, orgID)
		require.NoError(t, err)
		values := make([]string, 0, len(selectors))
		for _, selector := range selectors {
			values = append(values, selector.String())
		}
		return values
	}

	assert.Equal(t, []string{"builder_query/signoz.workspace.key.id/a", "builder_query/signoz.workspace.key.id/*", "builder_query/*", "*"}, selectorValues("builder_query/signoz.workspace.key.id = 'a'"))
	assert.Equal(t, []string{"builder_query/signoz.workspace.key.id/a", "builder_query/signoz.workspace.key.id/*", "builder_query/*", "*"}, selectorValues("builder_query/resource.signoz.workspace.key.id = 'a' AND status = 500"))
	assert.Equal(t, []string{
		"builder_query/resource.service.name/x",
		"builder_query/resource.service.name/*",
		"builder_query/signoz.workspace.key.id/z",
		"builder_query/signoz.workspace.key.id/*",
		"builder_query/*",
		"*",
	}, selectorValues("builder_query/resource.service.name = 'x' AND signoz.workspace.key.id = 'z'"))
	assert.Equal(t, []string{"builder_query/signoz.workspace.key.id/*", "builder_query/*", "*"}, selectorValues("builder_query/signoz.workspace.key.id IN ('a', 'b')"))
	assert.Equal(t, []string{"builder_query/signoz.workspace.key.id/a", "builder_query/signoz.workspace.key.id/*", "builder_query/*", "*"}, selectorValues("builder_query/signoz.workspace.key.id IN ('a')"))
	assert.Equal(t, []string{"builder_query/*", "*"}, selectorValues("builder_query/signoz.workspace.key.id = 'a' OR status = 500"))
	assert.Equal(t, []string{"builder_query/*", "*"}, selectorValues("builder_query/service.name = 'x'"))
	assert.Equal(t, []string{"builder_query/signoz.workspace.key.id/a/b", "builder_query/signoz.workspace.key.id/*", "builder_query/*", "*"}, selectorValues("builder_query/signoz.workspace.key.id = 'a/b'"))
	assert.Equal(t, []string{"builder_query/*", "*"}, selectorValues("builder_query/*"))
	assert.Equal(t, []string{"builder_query/*", "*"}, selectorValues("builder_query"))
	assert.Equal(t, []string{"promql/*", "*"}, selectorValues("promql/*"))
	assert.Equal(t, []string{"*"}, selectorValues("*"))

	_, err := TelemetrySelector(context.Background(), coretypes.ResourceTelemetryResourceLogs, "builder_query/signoz.workspace.key.id = ", orgID)
	assert.Error(t, err)
}

func TestBuilderQueryWithFilterExpressionResources(t *testing.T) {
	testCases := []struct {
		name     string
		body     string
		expected []coretypes.ResourceWithID
	}{
		{
			name:     "FilterPresent_ScopedID",
			body:     `{"start":1,"end":2,"filter":{"expression":"signoz.workspace.key.id = 'key-a'"}}`,
			expected: []coretypes.ResourceWithID{{Resource: coretypes.ResourceTelemetryResourceTraces, ID: "builder_query/signoz.workspace.key.id = 'key-a'"}},
		},
		{
			name:     "FilterAbsent_Wildcard",
			body:     `{"start":1,"end":2}`,
			expected: []coretypes.ResourceWithID{{Resource: coretypes.ResourceTelemetryResourceTraces, ID: "builder_query/*"}},
		},
		{
			name:     "EmptyBody_Wildcard",
			body:     ``,
			expected: []coretypes.ResourceWithID{{Resource: coretypes.ResourceTelemetryResourceTraces, ID: "builder_query/*"}},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			refs, err := BuilderQueryWithFilterExpressionResources(coretypes.ResourceTelemetryResourceTraces, "filter.expression")(coretypes.ExtractorContext{RequestBody: []byte(testCase.body)})
			require.NoError(t, err)
			assert.Equal(t, testCase.expected, refs)
		})
	}

	t.Run("InvalidExpression_Error", func(t *testing.T) {
		_, err := BuilderQueryWithFilterExpressionResources(coretypes.ResourceTelemetryResourceTraces, "filter.expression")(coretypes.ExtractorContext{RequestBody: []byte(`{"filter":{"expression":"signoz.workspace.key.id = "}}`)})
		require.Error(t, err)
	})
}

func TestBuilderQueryWildcardResources(t *testing.T) {
	refs, err := BuilderQueryWildcardResources(coretypes.ResourceTelemetryResourceTraces)(coretypes.ExtractorContext{})
	require.NoError(t, err)
	assert.Equal(t, []coretypes.ResourceWithID{{Resource: coretypes.ResourceTelemetryResourceTraces, ID: "builder_query/*"}}, refs)
}
