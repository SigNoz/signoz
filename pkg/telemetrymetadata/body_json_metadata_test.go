package telemetrymetadata

import (
	"fmt"
	"strings"
	"testing"

	"github.com/SigNoz/signoz-otel-collector/constants"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetryschema/logstelemetryschema"
	"github.com/SigNoz/signoz/pkg/types/promotetypes"
	"github.com/stretchr/testify/require"
)

func TestBuildListLogsJSONIndexesQuery(t *testing.T) {
	testCases := []struct {
		name         string
		cluster      string
		filters      []string
		expectedSQL  string
		expectedArgs []any
	}{
		{
			name:    "No filters",
			cluster: "test-cluster",
			filters: nil,
			expectedSQL: "SELECT name, type_full, expr, granularity FROM clusterAllReplicas('test-cluster', system.data_skipping_indices) " +
				"WHERE database = ? AND table = ? AND (LOWER(expr) LIKE LOWER(?) OR LOWER(expr) LIKE LOWER(?))",
			expectedArgs: []any{
				logstelemetryschema.DBName,
				logstelemetryschema.LogsV2LocalTableName,
				fmt.Sprintf("%%%s%%", querybuilder.FormatValueForContains(constants.BodyV2ColumnPrefix)),
				fmt.Sprintf("%%%s%%", querybuilder.FormatValueForContains(constants.BodyPromotedColumnPrefix)),
			},
		},
		{
			name:    "With filters",
			cluster: "test-cluster",
			filters: []string{"foo", "bar"},
			expectedSQL: "SELECT name, type_full, expr, granularity FROM clusterAllReplicas('test-cluster', system.data_skipping_indices) " +
				"WHERE database = ? AND table = ? AND (LOWER(expr) LIKE LOWER(?) OR LOWER(expr) LIKE LOWER(?)) AND (LOWER(replaceAll(expr, '`', '')) LIKE LOWER(?) OR LOWER(replaceAll(expr, '`', '')) LIKE LOWER(?))",
			expectedArgs: []any{
				logstelemetryschema.DBName,
				logstelemetryschema.LogsV2LocalTableName,
				fmt.Sprintf("%%%s%%", querybuilder.FormatValueForContains(constants.BodyV2ColumnPrefix)),
				fmt.Sprintf("%%%s%%", querybuilder.FormatValueForContains(constants.BodyPromotedColumnPrefix)),
				fmt.Sprintf("%%%s%%", querybuilder.FormatValueForContains("foo")),
				fmt.Sprintf("%%%s%%", querybuilder.FormatValueForContains("bar")),
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			query, args := buildListJSONIndexesQuery(tc.cluster, logsBodyIndexLookup, tc.filters...)

			require.Equal(t, tc.expectedSQL, query)
			require.Equal(t, tc.expectedArgs, args)
		})
	}
}

func TestUnfoldJSONSubColumnIndexExpr(t *testing.T) {
	testCases := []struct {
		name       string
		expr       string
		wantColumn string
		wantType   string
		wantErr    bool
	}{
		{
			name:       "LogsFoldedLower",
			expr:       "lower(assumeNotNull(dynamicElement(body_v2.user.name, 'String')))",
			wantColumn: "body_v2.user.name",
			wantType:   "String",
		},
		{
			name:       "LogsAssumeNotNullOnly",
			expr:       "assumeNotNull(dynamicElement(body_v2.request.duration, 'Float64'))",
			wantColumn: "body_v2.request.duration",
			wantType:   "Float64",
		},
		{
			name:       "TracesCastDottedKey",
			expr:       "CAST(attributes.`http.method`, 'String')",
			wantColumn: "attributes.`http.method`",
			wantType:   "String",
		},
		{
			name:       "TracesCastPlainKey",
			expr:       "CAST(attributes_promoted.status, 'Int64')",
			wantColumn: "attributes_promoted.status",
			wantType:   "Int64",
		},
		{
			name:    "UnrecognizedForm",
			expr:    "toString(attributes.status)",
			wantErr: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			columnExpr, columnType, err := unfoldJSONSubColumnIndexExpr(tc.expr)
			if tc.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			require.Equal(t, tc.wantColumn, columnExpr)
			require.Equal(t, tc.wantType, columnType)
		})
	}
}

// ClickHouse stores a generated col.`path`::Type trace index expression as
// CAST(col.`path`, 'Type'); the listing must parse that stored form back.
func TestUnfoldJSONSubColumnIndexExprTracesRoundTrip(t *testing.T) {
	target := promotetypes.NewTracesAttributesTarget()
	expr := target.IndexExpression("attributes", "http.method", "String")
	stored := fmt.Sprintf("CAST(%s, 'String')", strings.TrimSuffix(expr, "::String"))

	columnExpr, columnType, err := unfoldJSONSubColumnIndexExpr(stored)
	require.NoError(t, err)
	require.Equal(t, "attributes.`http.method`", columnExpr)
	require.Equal(t, "String", columnType)
}
