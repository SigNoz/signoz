package rules

import (
	"context"
	"encoding/json"
	"math"
	"strconv"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	alertmanagermock "github.com/SigNoz/signoz/pkg/alertmanager/mocks"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/prometheus/prometheustest"
	"github.com/SigNoz/signoz/pkg/query-service/rules"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstoretest"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	cmock "github.com/srikanthccv/ClickHouse-go-mock"
)

func TestManager_TestNotification_SendUnmatched_ThresholdRule(t *testing.T) {
	target := 10.0
	recovery := 5.0

	for _, tc := range rules.TcTestNotiSendUnmatchedThresholdRule {
		t.Run(tc.Name, func(t *testing.T) {
			rule := rules.ThresholdRuleAtLeastOnceValueAbove(target, &recovery)

			// Marshal rule to JSON as TestNotification expects
			ruleBytes, err := json.Marshal(rule)
			require.NoError(t, err)

			orgID := valuer.GenerateUUID()

			// for saving temp alerts that are triggered via TestNotification
			triggeredTestAlerts := []map[*alertmanagertypes.PostableAlert][]string{}

			// Create manager using test factory with hooks
			mgr := rules.NewTestManager(t, &rules.TestManagerOptions{
				AlertmanagerHook: func(am alertmanager.Alertmanager) {
					fAlert := am.(*alertmanagermock.MockAlertmanager)
					// mock set notification config
					fAlert.On("SetNotificationConfig", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
					// for saving temp alerts that are triggered via TestNotification
					if tc.ExpectAlerts > 0 {
						fAlert.On("TestAlert", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Run(func(args mock.Arguments) {
							triggeredTestAlerts = append(triggeredTestAlerts, args.Get(3).(map[*alertmanagertypes.PostableAlert][]string))
						}).Return(nil).Times(tc.ExpectAlerts)
					}
				},
				ManagerOptionsHook: func(opts *rules.ManagerOptions) {
					opts.PrepareTestRuleFunc = TestNotification
				},
				SqlStoreHook: func(store sqlstore.SQLStore) {
					mockStore := store.(*sqlstoretest.Provider)
					// Mock the organizations query that SendAlerts makes
					// Bun generates: SELECT id FROM organizations LIMIT 1 (or SELECT "id" FROM "organizations" LIMIT 1)
					orgRows := mockStore.Mock().NewRows([]string{"id"}).AddRow(orgID.StringValue())
					// Match bun's generated query pattern - bun may quote identifiers
					mockStore.Mock().ExpectQuery("SELECT (.+) FROM (.+)organizations(.+) LIMIT (.+)").WillReturnRows(orgRows)
				},
				TelemetryStoreHook: func(store telemetrystore.TelemetryStore) {
					telemetryStore := store.(*telemetrystoretest.Provider)
					// Set up mock data for telemetry store
					cols := make([]cmock.ColumnType, 0)
					cols = append(cols, cmock.ColumnType{Name: "value", Type: "Float64"})
					cols = append(cols, cmock.ColumnType{Name: "attr", Type: "String"})
					cols = append(cols, cmock.ColumnType{Name: "ts", Type: "DateTime"})

					alertDataRows := cmock.NewRows(cols, tc.Values)

					mock := telemetryStore.Mock()

					// Generate query arguments for the metric query
					evalTime := time.Now().UTC()
					evalWindow := 5 * time.Minute
					evalDelay := time.Duration(0)
					queryArgs := rules.GenerateMetricQueryCHArgs(
						evalTime,
						evalWindow,
						evalDelay,
						"probe_success",
						metrictypes.Unspecified,
					)

					mock.ExpectQuery("*WITH __temporal_aggregation_cte*").
						WithArgs(queryArgs...).
						WillReturnRows(alertDataRows)
				},
			})

			count, apiErr := mgr.TestNotification(context.Background(), orgID, string(ruleBytes))
			if apiErr != nil {
				t.Logf("TestNotification error: %v, type: %s", apiErr.Err, apiErr.Typ)
			}
			require.Nil(t, apiErr)
			assert.Equal(t, tc.ExpectAlerts, count)

			if tc.ExpectAlerts > 0 {
				// check if the alert has been triggered
				require.Len(t, triggeredTestAlerts, 1)
				var gotAlerts []*alertmanagertypes.PostableAlert
				for a := range triggeredTestAlerts[0] {
					gotAlerts = append(gotAlerts, a)
				}
				require.Len(t, gotAlerts, tc.ExpectAlerts)
				// check if the alert has triggered with correct threshold value
				if tc.ExpectValue != 0 {
					assert.Equal(t, strconv.FormatFloat(tc.ExpectValue, 'f', -1, 64), gotAlerts[0].Annotations["value"])
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

	for _, tc := range rules.TcTestNotificationSendUnmatchedPromRule {
		t.Run(tc.Name, func(t *testing.T) {
			// Capture base time once per test case to ensure consistent timestamps
			baseTime := time.Now().UTC()

			rule := rules.BuildPromAtLeastOnceValueAbove(target, nil)

			// Marshal rule to JSON as TestNotification expects
			ruleBytes, err := json.Marshal(rule)
			require.NoError(t, err)

			orgID := valuer.GenerateUUID()

			// for saving temp alerts that are triggered via TestNotification
			triggeredTestAlerts := []map[*alertmanagertypes.PostableAlert][]string{}

			// Variable to store promProvider for cleanup
			var promProvider *prometheustest.Provider

			// Create manager using test factory with hooks
			mgr := rules.NewTestManager(t, &rules.TestManagerOptions{
				AlertmanagerHook: func(am alertmanager.Alertmanager) {
					mockAM := am.(*alertmanagermock.MockAlertmanager)
					// mock set notification config
					mockAM.On("SetNotificationConfig", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
					// for saving temp alerts that are triggered via TestNotification
					if tc.ExpectAlerts > 0 {
						mockAM.On("TestAlert", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Run(func(args mock.Arguments) {
							triggeredTestAlerts = append(triggeredTestAlerts, args.Get(3).(map[*alertmanagertypes.PostableAlert][]string))
						}).Return(nil).Times(tc.ExpectAlerts)
					}
				},
				SqlStoreHook: func(store sqlstore.SQLStore) {
					mockStore := store.(*sqlstoretest.Provider)
					// Mock the organizations query that SendAlerts makes
					orgRows := mockStore.Mock().NewRows([]string{"id"}).AddRow(orgID.StringValue())
					mockStore.Mock().ExpectQuery("SELECT (.+) FROM (.+)organizations(.+) LIMIT (.+)").WillReturnRows(orgRows)
				},
				TelemetryStoreHook: func(store telemetrystore.TelemetryStore) {
					mockStore := store.(*telemetrystoretest.Provider)

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
					for _, v := range tc.Values {
						// Skip NaN and Inf values in the samples data
						if math.IsNaN(v.Value) || math.IsInf(v.Value, 0) {
							continue
						}
						// Calculate timestamp relative to baseTime
						sampleTimestamp := baseTime.Add(v.Offset).UnixMilli()
						validSamplesData = append(validSamplesData, []interface{}{
							"test_metric",
							fingerprint,
							sampleTimestamp,
							v.Value,
							uint32(0), // flags - 0 means normal value
						})
					}
					samplesRows := cmock.NewRows(samplesCols, validSamplesData)

					mock := mockStore.Mock()

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

					// Create Prometheus provider for this test
					promProvider = prometheustest.New(context.Background(), instrumentationtest.New().ToProviderSettings(), prometheus.Config{}, store)
				},
				ManagerOptionsHook: func(opts *rules.ManagerOptions) {
					// Set Prometheus provider for PromQL queries
					if promProvider != nil {
						opts.Prometheus = promProvider
					}
					opts.PrepareTestRuleFunc = TestNotification
				},
			})

			count, apiErr := mgr.TestNotification(context.Background(), orgID, string(ruleBytes))
			if apiErr != nil {
				t.Logf("TestNotification error: %v, type: %s", apiErr.Err, apiErr.Typ)
			}
			require.Nil(t, apiErr)
			assert.Equal(t, tc.ExpectAlerts, count)

			if tc.ExpectAlerts > 0 {
				// check if the alert has been triggered
				require.Len(t, triggeredTestAlerts, 1)
				var gotAlerts []*alertmanagertypes.PostableAlert
				for a := range triggeredTestAlerts[0] {
					gotAlerts = append(gotAlerts, a)
				}
				require.Len(t, gotAlerts, tc.ExpectAlerts)
				// check if the alert has triggered with correct threshold value
				if tc.ExpectValue != 0 && !math.IsNaN(tc.ExpectValue) && !math.IsInf(tc.ExpectValue, 0) {
					assert.Equal(t, strconv.FormatFloat(tc.ExpectValue, 'f', -1, 64), gotAlerts[0].Annotations["value"])
				}
			} else {
				// check if no alerts have been triggered
				assert.Empty(t, triggeredTestAlerts)
			}

			promProvider.Close()
		})
	}
}
