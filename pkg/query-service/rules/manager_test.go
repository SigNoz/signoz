package rules

import (
	"context"
	"encoding/json"
	"math"
	"strconv"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	alertmanagermock "github.com/SigNoz/signoz/pkg/alertmanager/mocks"
	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/cache/cachetest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/prometheus/prometheustest"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/querier/signozquerier"
	"github.com/SigNoz/signoz/pkg/query-service/app/clickhouseReader"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstoretest"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
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
			Version: "v5",
			RuleCondition: &ruletypes.RuleCondition{
				MatchType: ruletypes.AtleastOnce,
				CompareOp: ruletypes.ValueIsAbove,
				Target:    &target,
				CompositeQuery: &v3.CompositeQuery{
					QueryType: v3.QueryTypeBuilder,
					Queries: []qbtypes.QueryEnvelope{
						{
							Type: qbtypes.QueryTypeBuilder,
							Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
								Name:         "A",
								StepInterval: qbtypes.Step{Duration: 60 * time.Second},
								Signal:       telemetrytypes.SignalMetrics,

								Aggregations: []qbtypes.MetricAggregation{
									{
										MetricName:       "probe_success",
										TimeAggregation:  metrictypes.TimeAggregationAvg,
										SpaceAggregation: metrictypes.SpaceAggregationAvg,
									},
								},
							},
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

			// mocking the alertmanager + capturing the triggered test alerts
			fAlert := alertmanagermock.NewMockAlertmanager(t)
			// mock set notification config
			fAlert.On("SetNotificationConfig", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
			// for saving temp alerts that are triggered via TestNotification
			triggeredTestAlerts := []map[*alertmanagertypes.PostableAlert][]string{}
			if tc.expectAlerts > 0 {
				fAlert.On("TestAlert", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Run(func(args mock.Arguments) {
					triggeredTestAlerts = append(triggeredTestAlerts, args.Get(3).(map[*alertmanagertypes.PostableAlert][]string))
				}).Return(nil).Times(tc.expectAlerts)
			}

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

			mock := telemetryStore.Mock()

			// Generate query arguments for the metric query
			evalTime := time.Now().UTC()
			evalWindow := 5 * time.Minute
			evalDelay := time.Duration(0)
			queryArgs := GenerateMetricQueryCHArgs(
				evalTime,
				evalWindow,
				evalDelay,
				"probe_success",
				metrictypes.Unspecified,
			)

			mock.ExpectQuery("*WITH __temporal_aggregation_cte*").
				WithArgs(queryArgs...).
				WillReturnRows(alertDataRows)

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
			providerSettings := instrumentationtest.New().ToProviderSettings()
			prometheus := prometheustest.New(context.Background(), providerSettings, prometheus.Config{}, telemetryStore)
			reader := clickhouseReader.NewReader(
				nil,
				telemetryStore,
				prometheus,
				"",
				time.Duration(time.Second),
				nil,
				readerCache,
				options,
			)

			// Create mock querierV5 with test values
			providerFactory := signozquerier.NewFactory(telemetryStore, prometheus, readerCache)
			mockQuerier, err := providerFactory.New(context.Background(), providerSettings, querier.Config{})
			require.NoError(t, err)

			mgrOpts := &ManagerOptions{
				Logger:         zap.NewNop(),
				SLogger:        instrumentationtest.New().Logger(),
				Cache:          cacheObj,
				Alertmanager:   fAlert,
				Querier:        mockQuerier,
				TelemetryStore: telemetryStore,
				Reader:         reader,
				SqlStore:       sqlStore, // SQLStore needed for SendAlerts to query organizations
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
				require.Len(t, triggeredTestAlerts, 1)
				var gotAlerts []*alertmanagertypes.PostableAlert
				for a := range triggeredTestAlerts[0] {
					gotAlerts = append(gotAlerts, a)
				}
				require.Len(t, gotAlerts, tc.expectAlerts)
				// check if the alert has triggered with correct threshold value
				if tc.expectValue != 0 {
					assert.Equal(t, strconv.FormatFloat(tc.expectValue, 'f', -1, 64), gotAlerts[0].Annotations["value"])
				}
			} else {
				// check if no alerts have been triggered
				assert.Empty(t, triggeredTestAlerts)
			}
		})
	}
}

func TestManager_TestNotification_SendUnmatched_PromRule(t *testing.T) {
	target := 10.0

	buildRule := func() ruletypes.PostableRule {
		return ruletypes.PostableRule{
			AlertName: "test-prom-alert",
			AlertType: ruletypes.AlertTypeMetric,
			RuleType:  ruletypes.RuleTypeProm,
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
			Version: "v5",
			RuleCondition: &ruletypes.RuleCondition{
				MatchType:     ruletypes.AtleastOnce,
				SelectedQuery: "A",
				CompareOp:     ruletypes.ValueIsAbove,
				Target:        &target,
				CompositeQuery: &v3.CompositeQuery{
					QueryType: v3.QueryTypePromQL,
					PanelType: v3.PanelTypeGraph,
					Queries: []qbtypes.QueryEnvelope{
						{
							Type: qbtypes.QueryTypePromQL,
							Spec: qbtypes.PromQuery{
								Name:     "A",
								Query:    "{\"test_metric\"}",
								Disabled: false,
								Stats:    false,
							},
						},
					},
				},
				Thresholds: &ruletypes.RuleThresholdData{
					Kind: ruletypes.BasicThresholdKind,
					Spec: ruletypes.BasicRuleThresholds{
						{
							Name:        "primary",
							TargetValue: &target,
							MatchType:   ruletypes.AtleastOnce,
							CompareOp:   ruletypes.ValueIsAbove,
							Channels:    []string{"slack"},
						},
					},
				},
			},
			NotificationSettings: &ruletypes.NotificationSettings{},
		}
	}

	type testCase struct {
		name   string
		values []struct {
			offset time.Duration // offset from baseTime (negative = in the past)
			value  float64
		}
		expectAlerts int
		expectValue  float64
	}

	cases := []testCase{
		{
			name: "return first valid point in case of test notification",
			values: []struct {
				offset time.Duration
				value  float64
			}{
				{-4 * time.Minute, 3},
				{-3 * time.Minute, 4},
			},
			expectAlerts: 1,
			expectValue:  3,
		},
		{
			name: "No data in DB so no alerts fired",
			values: []struct {
				offset time.Duration
				value  float64
			}{},
			expectAlerts: 0,
		},
		{
			name: "return first valid point in case of test notification skips NaN and Inf",
			values: []struct {
				offset time.Duration
				value  float64
			}{
				{-4 * time.Minute, math.NaN()},
				{-3 * time.Minute, math.Inf(1)},
				{-2 * time.Minute, 7},
			},
			expectAlerts: 1,
			expectValue:  7,
		},
		{
			name: "If found matching alert with given target value, return the alerting value rather than first valid point",
			values: []struct {
				offset time.Duration
				value  float64
			}{
				{-4 * time.Minute, 1},
				{-3 * time.Minute, 2},
				{-2 * time.Minute, 3},
				{-1 * time.Minute, 12},
			},
			expectAlerts: 1,
			expectValue:  12,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			// Capture base time once per test case to ensure consistent timestamps
			baseTime := time.Now().UTC()

			rule := buildRule()

			// Marshal rule to JSON as TestNotification expects
			ruleBytes, err := json.Marshal(rule)
			require.NoError(t, err)

			// mocking the alertmanager + capturing the triggered test alerts
			fAlert := alertmanagermock.NewMockAlertmanager(t)
			// mock set notification config
			fAlert.On("SetNotificationConfig", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
			// for saving temp alerts that are triggered via TestNotification
			triggeredTestAlerts := []map[*alertmanagertypes.PostableAlert][]string{}
			if tc.expectAlerts > 0 {
				fAlert.On("TestAlert", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Run(func(args mock.Arguments) {
					triggeredTestAlerts = append(triggeredTestAlerts, args.Get(3).(map[*alertmanagertypes.PostableAlert][]string))
				}).Return(nil).Times(tc.expectAlerts)
			}

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
			orgRows := sqlStore.Mock().NewRows([]string{"id"}).AddRow(orgID.StringValue())
			sqlStore.Mock().ExpectQuery("SELECT (.+) FROM (.+)organizations(.+) LIMIT (.+)").WillReturnRows(orgRows)

			telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &queryMatcherAny{})

			// Set up Prometheus-specific mock data
			// Fingerprint columns for Prometheus queries
			fingerprintCols := []cmock.ColumnType{
				{Name: "fingerprint", Type: "UInt64"},
				{Name: "any(labels)", Type: "String"},
			}

			// Samples columns for Prometheus queries
			samplesCols := []cmock.ColumnType{
				{Name: "metric_name", Type: "String"},
				{Name: "fingerprint", Type: "UInt64"},
				{Name: "unix_milli", Type: "Int64"},
				{Name: "value", Type: "Float64"},
				{Name: "flags", Type: "UInt32"},
			}

			// Calculate query time range similar to Prometheus rule tests
			// TestNotification uses time.Now().UTC() for evaluation
			// We calculate the query window based on current time to match what the actual evaluation will use
			evalTime := baseTime
			evalWindowMs := int64(5 * 60 * 1000) // 5 minutes in ms
			evalTimeMs := evalTime.UnixMilli()
			queryStart := ((evalTimeMs-2*evalWindowMs)/60000)*60000 + 1 // truncate to minute + 1ms
			queryEnd := (evalTimeMs / 60000) * 60000                    // truncate to minute

			// Create fingerprint data
			fingerprint := uint64(12345)
			labelsJSON := `{"__name__":"test_metric"}`
			fingerprintData := [][]interface{}{
				{fingerprint, labelsJSON},
			}
			fingerprintRows := cmock.NewRows(fingerprintCols, fingerprintData)

			// Create samples data from test case values, calculating timestamps relative to baseTime
			validSamplesData := make([][]interface{}, 0)
			for _, v := range tc.values {
				// Skip NaN and Inf values in the samples data
				if math.IsNaN(v.value) || math.IsInf(v.value, 0) {
					continue
				}
				// Calculate timestamp relative to baseTime
				sampleTimestamp := baseTime.Add(v.offset).UnixMilli()
				validSamplesData = append(validSamplesData, []interface{}{
					"test_metric",
					fingerprint,
					sampleTimestamp,
					v.value,
					uint32(0), // flags - 0 means normal value
				})
			}
			samplesRows := cmock.NewRows(samplesCols, validSamplesData)

			mock := telemetryStore.Mock()

			// Mock the fingerprint query (for Prometheus label matching)
			mock.ExpectQuery("SELECT fingerprint, any").
				WithArgs("test_metric", "__name__", "test_metric").
				WillReturnRows(fingerprintRows)

			// Mock the samples query (for Prometheus metric data)
			mock.ExpectQuery("SELECT metric_name, fingerprint, unix_milli").
				WithArgs(
					"test_metric",
					"test_metric",
					"__name__",
					"test_metric",
					queryStart,
					queryEnd,
				).
				WillReturnRows(samplesRows)

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
			promProvider := prometheustest.New(context.Background(), instrumentationtest.New().ToProviderSettings(), prometheus.Config{}, telemetryStore)
			reader := clickhouseReader.NewReader(
				nil,
				telemetryStore,
				promProvider,
				"",
				time.Duration(time.Second),
				nil,
				readerCache,
				options,
			)

			mgrOpts := &ManagerOptions{
				Logger:         zap.NewNop(),
				SLogger:        instrumentationtest.New().Logger(),
				Cache:          cacheObj,
				Alertmanager:   fAlert,
				TelemetryStore: telemetryStore,
				Reader:         reader,
				SqlStore:       sqlStore, // SQLStore needed for SendAlerts to query organizations
				Prometheus:     promProvider,
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
				require.Len(t, triggeredTestAlerts, 1)
				var gotAlerts []*alertmanagertypes.PostableAlert
				for a := range triggeredTestAlerts[0] {
					gotAlerts = append(gotAlerts, a)
				}
				require.Len(t, gotAlerts, tc.expectAlerts)
				// check if the alert has triggered with correct threshold value
				if tc.expectValue != 0 && !math.IsNaN(tc.expectValue) && !math.IsInf(tc.expectValue, 0) {
					assert.Equal(t, strconv.FormatFloat(tc.expectValue, 'f', -1, 64), gotAlerts[0].Annotations["value"])
				}
			} else {
				// check if no alerts have been triggered
				assert.Empty(t, triggeredTestAlerts)
			}

			promProvider.Close()
		})
	}
}
