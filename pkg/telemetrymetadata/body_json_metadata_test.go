package telemetrymetadata

import (
	"fmt"
	"testing"

	"github.com/SigNoz/signoz-otel-collector/constants"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/require"
)

func TestBuildGetBodyJSONPathsQuery(t *testing.T) {
	testCases := []struct {
		name              string
		fieldKeySelectors []*telemetrytypes.FieldKeySelector
		expectedSQL       string
		expectedArgs      []any
		expectedLimit     int
	}{

		{
			name: "Single search text with EQUAL operator",
			fieldKeySelectors: []*telemetrytypes.FieldKeySelector{
				{
					Name:              "user.name",
					SelectorMatchType: telemetrytypes.FieldSelectorMatchTypeExact,
				},
			},
			expectedSQL:   "SELECT path, groupArray(DISTINCT type) AS types, max(last_seen) AS last_seen FROM signoz_metadata.distributed_json_path_types WHERE (path = ?) GROUP BY path ORDER BY last_seen DESC LIMIT ?",
			expectedArgs:  []any{"user.name", defaultPathLimit},
			expectedLimit: defaultPathLimit,
		},
		{
			name: "Single search text with LIKE operator",
			fieldKeySelectors: []*telemetrytypes.FieldKeySelector{
				{
					Name:              "user",
					SelectorMatchType: telemetrytypes.FieldSelectorMatchTypeFuzzy,
				},
			},
			expectedSQL:   "SELECT path, groupArray(DISTINCT type) AS types, max(last_seen) AS last_seen FROM signoz_metadata.distributed_json_path_types WHERE (LOWER(path) LIKE LOWER(?)) GROUP BY path ORDER BY last_seen DESC LIMIT ?",
			expectedArgs:  []any{"%user%", 100},
			expectedLimit: 100,
		},
		{
			name: "Multiple search texts with EQUAL operator",
			fieldKeySelectors: []*telemetrytypes.FieldKeySelector{
				{
					Name:              "user.name",
					SelectorMatchType: telemetrytypes.FieldSelectorMatchTypeExact,
				},
				{
					Name:              "user.age",
					SelectorMatchType: telemetrytypes.FieldSelectorMatchTypeExact,
				},
			},
			expectedSQL:   "SELECT path, groupArray(DISTINCT type) AS types, max(last_seen) AS last_seen FROM signoz_metadata.distributed_json_path_types WHERE (path = ? OR path = ?) GROUP BY path ORDER BY last_seen DESC LIMIT ?",
			expectedArgs:  []any{"user.name", "user.age", defaultPathLimit},
			expectedLimit: defaultPathLimit,
		},
		{
			name: "Multiple search texts with LIKE operator",
			fieldKeySelectors: []*telemetrytypes.FieldKeySelector{
				{
					Name:              "user",
					SelectorMatchType: telemetrytypes.FieldSelectorMatchTypeFuzzy,
				},
				{
					Name:              "admin",
					SelectorMatchType: telemetrytypes.FieldSelectorMatchTypeFuzzy,
				},
			},
			expectedSQL:   "SELECT path, groupArray(DISTINCT type) AS types, max(last_seen) AS last_seen FROM signoz_metadata.distributed_json_path_types WHERE (LOWER(path) LIKE LOWER(?) OR LOWER(path) LIKE LOWER(?)) GROUP BY path ORDER BY last_seen DESC LIMIT ?",
			expectedArgs:  []any{"%user%", "%admin%", defaultPathLimit},
			expectedLimit: defaultPathLimit,
		},
		{
			name: "Search with Contains operator (should default to LIKE)",
			fieldKeySelectors: []*telemetrytypes.FieldKeySelector{
				{
					Name:              "test",
					SelectorMatchType: telemetrytypes.FieldSelectorMatchTypeFuzzy,
				},
			},
			expectedSQL:   "SELECT path, groupArray(DISTINCT type) AS types, max(last_seen) AS last_seen FROM signoz_metadata.distributed_json_path_types WHERE (LOWER(path) LIKE LOWER(?)) GROUP BY path ORDER BY last_seen DESC LIMIT ?",
			expectedArgs:  []any{"%test%", defaultPathLimit},
			expectedLimit: defaultPathLimit,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			query, args, limit := buildGetBodyJSONPathsQuery(tc.fieldKeySelectors)
			require.Equal(t, tc.expectedSQL, query)
			require.Equal(t, tc.expectedArgs, args)
			require.Equal(t, tc.expectedLimit, limit)
		})
	}
}

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
				telemetrylogs.DBName,
				telemetrylogs.LogsV2LocalTableName,
				fmt.Sprintf("%%%s%%", querybuilder.FormatValueForContains(constants.BodyJSONColumnPrefix)),
				fmt.Sprintf("%%%s%%", querybuilder.FormatValueForContains(constants.BodyPromotedColumnPrefix)),
			},
		},
		{
			name:    "With filters",
			cluster: "test-cluster",
			filters: []string{"foo", "bar"},
			expectedSQL: "SELECT name, type_full, expr, granularity FROM clusterAllReplicas('test-cluster', system.data_skipping_indices) " +
				"WHERE database = ? AND table = ? AND (LOWER(expr) LIKE LOWER(?) OR LOWER(expr) LIKE LOWER(?)) AND (LOWER(expr) LIKE LOWER(?) OR LOWER(expr) LIKE LOWER(?))",
			expectedArgs: []any{
				telemetrylogs.DBName,
				telemetrylogs.LogsV2LocalTableName,
				fmt.Sprintf("%%%s%%", querybuilder.FormatValueForContains(constants.BodyJSONColumnPrefix)),
				fmt.Sprintf("%%%s%%", querybuilder.FormatValueForContains(constants.BodyPromotedColumnPrefix)),
				fmt.Sprintf("%%%s%%", querybuilder.FormatValueForContains("foo")),
				fmt.Sprintf("%%%s%%", querybuilder.FormatValueForContains("bar")),
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			query, args := buildListLogsJSONIndexesQuery(tc.cluster, tc.filters...)

			require.Equal(t, tc.expectedSQL, query)
			require.Equal(t, tc.expectedArgs, args)
		})
	}
}
