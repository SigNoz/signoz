package telemetrymetadata

import (
	"context"
	"fmt"
	"regexp"
	"testing"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	schemamigrator "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz-otel-collector/constants"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetryschema/logstelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/stretchr/testify/assert"
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
			query, args := buildListJSONIndexesQuery(tc.cluster, logsBodyIndexSource, tc.filters...)

			require.Equal(t, tc.expectedSQL, query)
			require.Equal(t, tc.expectedArgs, args)
		})
	}
}

func TestCreateIndexes(t *testing.T) {
	index := schemamigrator.Index{
		Name:        "`body_promoted.user.name_String_ngrambf_v1`",
		Expression:  "lower(assumeNotNull(dynamicElement(body_promoted.user.name, 'String')))",
		Type:        "ngrambf_v1(4, 1024, 2, 0)",
		Granularity: 1,
	}

	testCases := []struct {
		name    string
		execErr error
		wantErr bool
	}{
		{name: "AddIndex_ExecutedOnSourceTable"},
		{name: "ExecError_Returned", execErr: errors.NewInternalf(errors.CodeInternal, "boom"), wantErr: true},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			ts := telemetrystoretest.New(telemetrystore.Config{}, sqlmock.QueryMatcherRegexp)
			store := &telemetryMetaStore{telemetrystore: ts}

			ts.Mock().ExpectExec("ALTER TABLE (.+)" + logstelemetryschema.LogsV2LocalTableName + "(.+) ADD INDEX IF NOT EXISTS " + regexp.QuoteMeta(index.Name)).
				WillReturnError(testCase.execErr)

			err := store.CreateIndexes(context.Background(), logsBodyIndexSource, []schemamigrator.Index{index})
			if testCase.wantErr {
				assert.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.NoError(t, ts.Mock().ExpectationsWereMet())
		})
	}
}
