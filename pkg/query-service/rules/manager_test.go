package rules

import (
	"context"
	"encoding/json"
	"math"
	"strconv"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/cache/cachetest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/prometheus/prometheustest"
	"github.com/SigNoz/signoz/pkg/query-service/app/clickhouseReader"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstoretest"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	cmock "github.com/srikanthccv/ClickHouse-go-mock"
)

func TestManager_TestNotification_SendUnmatched_ThresholdRule(t *testing.T) {
	target := 10.0
	recovery := 5.0

	buildRule := func() ruletypes.PostableRule {
		return ruletypes.PostableRule{
			AlertName: "test-alert",
			AlertType: ruletypes.AlertTypeMetric,
			RuleType:  ruletypes.RuleTypeThreshold,
			Evaluation: &ruletypes.EvaluationEnvelope{Kind: ruletypes.RollingEvaluation, Spec: ruletypes.RollingWindow{
				EvalWindow: ruletypes.Duration(5 * time.Minute),
				Frequency:  ruletypes.Duration(1 * time.Minute),
			}},
			Labels: map[string]string{
				"service.name": "frontend",
			},
			Annotations: map[string]string{
				"value": "{{$value}}",
			},
			RuleCondition: &ruletypes.RuleCondition{
				MatchType: ruletypes.AtleastOnce,
				CompareOp: ruletypes.ValueIsAbove,
				Target:    &target,
				CompositeQuery: &v3.CompositeQuery{
					QueryType: v3.QueryTypeBuilder,
					BuilderQueries: map[string]*v3.BuilderQuery{
						"A": {
							QueryName:    "A",
							StepInterval: 60,
							AggregateAttribute: v3.AttributeKey{
								Key: "probe_success",
							},
							AggregateOperator: v3.AggregateOperatorNoOp,
							DataSource:        v3.DataSourceMetrics,
							Expression:        "A",
						},
					},
				},
				Thresholds: &ruletypes.RuleThresholdData{
					Kind: ruletypes.BasicThresholdKind,
					Spec: ruletypes.BasicRuleThresholds{
						{
							Name:           "primary",
							TargetValue:    &target,
							RecoveryTarget: &recovery,
							MatchType:      ruletypes.AtleastOnce,
							CompareOp:      ruletypes.ValueIsAbove,
						},
					},
				},
			},
			NotificationSettings: &ruletypes.NotificationSettings{},
		}
	}

	type testCase struct {
		name         string
		values       [][]interface{}
		expectAlerts int
		expectValue  float64
	}

	cases := []testCase{
		{
			name: "return first valid point in case of test notification",
			values: [][]interface{}{
				{float64(3), "attr", time.Now()},
				{float64(4), "attr", time.Now().Add(1 * time.Minute)},
			},
			expectAlerts: 1,
			expectValue:  3,
		},
		{
			name:         "No data in DB so no alerts fired",
			values:       [][]interface{}{},
			expectAlerts: 0,
		},
		{
			name: "return first valid point in case of test notification skips NaN and Inf",
			values: [][]interface{}{
				{math.NaN(), "attr", time.Now()},
				{math.Inf(1), "attr", time.Now().Add(1 * time.Minute)},
				{float64(7), "attr", time.Now().Add(2 * time.Minute)},
			},
			expectAlerts: 1,
			expectValue:  7,
		},
		{
			name: "If found matching alert with given target value, return the alerting value rather than first valid point",
			values: [][]interface{}{
				{float64(1), "attr", time.Now()},
				{float64(2), "attr", time.Now().Add(1 * time.Minute)},
				{float64(3), "attr", time.Now().Add(2 * time.Minute)},
				{float64(12), "attr", time.Now().Add(3 * time.Minute)},
			},
			expectAlerts: 1,
			expectValue:  12,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rule := buildRule()

			// Marshal rule to JSON as TestNotification expects
			ruleBytes, err := json.Marshal(rule)
			require.NoError(t, err)

			fAlert := alertmanager.NewMockAlertManager()
			cacheObj, err := cachetest.New(cache.Config{
				Provider: "memory",
				Memory: cache.Memory{
					NumCounters: 1000,
					MaxCost:     1 << 20,
				},
			})
			require.NoError(t, err)

			orgID := valuer.GenerateUUID()

			// Create SQLStore mock for SendAlerts function which queries organizations table
			sqlStore := sqlstoretest.New(sqlstore.Config{Provider: "sqlite"}, sqlmock.QueryMatcherRegexp)
			// Mock the organizations query that SendAlerts makes
			// Bun generates: SELECT id FROM organizations LIMIT 1 (or SELECT "id" FROM "organizations" LIMIT 1)
			orgRows := sqlStore.Mock().NewRows([]string{"id"}).AddRow(orgID.StringValue())
			// Match bun's generated query pattern - bun may quote identifiers
			sqlStore.Mock().ExpectQuery("SELECT (.+) FROM (.+)organizations(.+) LIMIT (.+)").WillReturnRows(orgRows)

			telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &queryMatcherAny{})

			// Set up mock data for telemetry store
			cols := make([]cmock.ColumnType, 0)
			cols = append(cols, cmock.ColumnType{Name: "value", Type: "Float64"})
			cols = append(cols, cmock.ColumnType{Name: "attr", Type: "String"})
			cols = append(cols, cmock.ColumnType{Name: "ts", Type: "DateTime"})

			alertDataRows := cmock.NewRows(cols, tc.values)

			// Mock the metadata query for FetchTemporality
			metadataCols := make([]cmock.ColumnType, 0)
			metadataCols = append(metadataCols, cmock.ColumnType{Name: "metric_name", Type: "String"})
			metadataCols = append(metadataCols, cmock.ColumnType{Name: "type", Type: "String"})
			metadataCols = append(metadataCols, cmock.ColumnType{Name: "description", Type: "String"})
			metadataCols = append(metadataCols, cmock.ColumnType{Name: "temporality", Type: "String"})
			metadataCols = append(metadataCols, cmock.ColumnType{Name: "is_monotonic", Type: "Bool"})
			metadataCols = append(metadataCols, cmock.ColumnType{Name: "unit", Type: "String"})

			metadataRows := cmock.NewRows(metadataCols, [][]interface{}{
				{"probe_success", "Gauge", "Probe success metric", "Delta", false, ""},
			})

			mock := telemetryStore.Mock()

			// Mock the metadata query for FetchTemporality
			// This query is made by GetUpdatedMetricsMetadata which FetchTemporality calls
			// The query pattern includes "WHERE metric_name IN ('probe_success')"
			queryString := "*FROM signoz_metrics.distributed_updated_metadata*"

			// Set up expectations - allow flexible ordering by setting up many expectations
			// Metadata queries (GetUpdatedMetricsMetadata may query updated_metrics_metadata and fallback to time_series_v4)
			mock.ExpectQuery(queryString).WillReturnRows(metadataRows) // First metadata query (updated_metrics_metadata)
			// mock.ExpectQuery(queryString).WillReturnRows(metadataRows) // Fallback metadata query (time_series_v4, if first returns empty)

			// Data queries - the querier/reader may make multiple queries
			// Set up enough expectations to handle all possible queries
			mock.ExpectQuery("*FROM signoz_metrics.time_series_v4*").WillReturnRows(alertDataRows)

			// Create reader with mocked telemetry store
			readerCache, err := cachetest.New(cache.Config{
				Provider: "memory",
				Memory: cache.Memory{
					NumCounters: 10 * 1000,
					MaxCost:     1 << 26,
				},
			})
			require.NoError(t, err)

			options := clickhouseReader.NewOptions("", "", "archiveNamespace")
			reader := clickhouseReader.NewReader(
				nil,
				telemetryStore,
				prometheustest.New(context.Background(), instrumentationtest.New().ToProviderSettings(), prometheus.Config{}, telemetryStore),
				"",
				time.Duration(time.Second),
				nil,
				readerCache,
				options,
			)

			mgrOpts := &ManagerOptions{
				Logger:           zap.NewNop(),
				SLogger:          instrumentationtest.New().Logger(),
				Cache:            cacheObj,
				Alertmanager:     fAlert,
				OrgGetter:        organization.NewNoOpOrgGetter(),
				RuleStore:        ruletypes.NewNoOpRuleStore(),
				MaintenanceStore: ruletypes.NewNoOpMaintenanceStore(),
				TelemetryStore:   telemetryStore,
				Reader:           reader,
				SqlStore:         sqlStore, // SQLStore needed for SendAlerts to query organizations
			}

			mgr, err := NewManager(mgrOpts)
			require.NoError(t, err)

			count, apiErr := mgr.TestNotification(context.Background(), orgID, string(ruleBytes))
			if apiErr != nil {
				t.Logf("TestNotification error: %v, type: %s", apiErr.Err, apiErr.Typ)
			}
			require.Nil(t, apiErr)
			assert.Equal(t, tc.expectAlerts, count)

			if tc.expectAlerts > 0 {
				// check if the alert has been triggered
				require.Len(t, fAlert.TriggeredTestAlerts, 1)
				var gotAlerts []*alertmanagertypes.PostableAlert
				for a := range fAlert.TriggeredTestAlerts[0] {
					gotAlerts = append(gotAlerts, a)
				}
				require.Len(t, gotAlerts, tc.expectAlerts)
				// check if the alert has triggered with correct threshold value
				if tc.expectValue != 0 {
					assert.Equal(t, strconv.FormatFloat(tc.expectValue, 'f', -1, 64), gotAlerts[0].Annotations["value"])
				}
			} else {
				// check if no alerts have been triggered
				assert.Empty(t, fAlert.TriggeredTestAlerts)
			}
		})
	}
}
