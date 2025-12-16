package rules

import (
	"context"
	"encoding/json"
	"math"
	"strconv"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/cache/cachetest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/prometheus/prometheustest"
	"github.com/SigNoz/signoz/pkg/query-service/app/clickhouseReader"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstoretest"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	amConfig "github.com/prometheus/alertmanager/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	cmock "github.com/srikanthccv/ClickHouse-go-mock"
)

type mockAlertManager struct {
	setConfigs []struct {
		orgID  valuer.UUID
		ruleID string
		cfg    *alertmanagertypes.NotificationConfig
	}
	testAlerts []map[*alertmanagertypes.PostableAlert][]string
}

func (f *mockAlertManager) GetAlerts(context.Context, string, alertmanagertypes.GettableAlertsParams) (alertmanagertypes.DeprecatedGettableAlerts, error) {
	return alertmanagertypes.DeprecatedGettableAlerts{}, nil
}
func (f *mockAlertManager) PutAlerts(context.Context, string, alertmanagertypes.PostableAlerts) error {
	return nil
}
func (f *mockAlertManager) TestReceiver(context.Context, string, alertmanagertypes.Receiver) error {
	return nil
}
func (f *mockAlertManager) TestAlert(ctx context.Context, orgID string, ruleID string, receiverMap map[*alertmanagertypes.PostableAlert][]string) error {
	f.testAlerts = append(f.testAlerts, receiverMap)
	return nil
}
func (f *mockAlertManager) ListChannels(context.Context, string) ([]*alertmanagertypes.Channel, error) {
	return nil, nil
}
func (f *mockAlertManager) ListAllChannels(context.Context) ([]*alertmanagertypes.Channel, error) {
	return nil, nil
}
func (f *mockAlertManager) GetChannelByID(context.Context, string, valuer.UUID) (*alertmanagertypes.Channel, error) {
	return nil, nil
}
func (f *mockAlertManager) UpdateChannelByReceiverAndID(context.Context, string, alertmanagertypes.Receiver, valuer.UUID) error {
	return nil
}
func (f *mockAlertManager) CreateChannel(context.Context, string, alertmanagertypes.Receiver) error {
	return nil
}
func (f *mockAlertManager) DeleteChannelByID(context.Context, string, valuer.UUID) error { return nil }
func (f *mockAlertManager) SetConfig(context.Context, *alertmanagertypes.Config) error   { return nil }
func (f *mockAlertManager) GetConfig(context.Context, string) (*alertmanagertypes.Config, error) {
	return nil, nil
}
func (f *mockAlertManager) SetDefaultConfig(context.Context, string) error { return nil }
func (f *mockAlertManager) SetNotificationConfig(ctx context.Context, orgID valuer.UUID, ruleId string, cfg *alertmanagertypes.NotificationConfig) error {
	f.setConfigs = append(f.setConfigs, struct {
		orgID  valuer.UUID
		ruleID string
		cfg    *alertmanagertypes.NotificationConfig
	}{orgID: orgID, ruleID: ruleId, cfg: cfg})
	return nil
}
func (f *mockAlertManager) DeleteNotificationConfig(context.Context, valuer.UUID, string) error {
	return nil
}
func (f *mockAlertManager) CreateRoutePolicy(context.Context, *alertmanagertypes.PostableRoutePolicy) (*alertmanagertypes.GettableRoutePolicy, error) {
	return nil, nil
}
func (f *mockAlertManager) CreateRoutePolicies(context.Context, []*alertmanagertypes.PostableRoutePolicy) ([]*alertmanagertypes.GettableRoutePolicy, error) {
	return nil, nil
}
func (f *mockAlertManager) GetRoutePolicyByID(context.Context, string) (*alertmanagertypes.GettableRoutePolicy, error) {
	return nil, nil
}
func (f *mockAlertManager) GetAllRoutePolicies(context.Context) ([]*alertmanagertypes.GettableRoutePolicy, error) {
	return nil, nil
}
func (f *mockAlertManager) UpdateRoutePolicyByID(context.Context, string, *alertmanagertypes.PostableRoutePolicy) (*alertmanagertypes.GettableRoutePolicy, error) {
	return nil, nil
}
func (f *mockAlertManager) DeleteRoutePolicyByID(context.Context, string) error { return nil }
func (f *mockAlertManager) DeleteAllRoutePoliciesByRuleId(context.Context, string) error {
	return nil
}
func (f *mockAlertManager) UpdateAllRoutePoliciesByRuleId(context.Context, string, []*alertmanagertypes.PostableRoutePolicy) error {
	return nil
}
func (f *mockAlertManager) CreateInhibitRules(context.Context, valuer.UUID, []amConfig.InhibitRule) error {
	return nil
}
func (f *mockAlertManager) DeleteAllInhibitRulesByRuleId(context.Context, valuer.UUID, string) error {
	return nil
}
func (f *mockAlertManager) Shutdown(context.Context) error { return nil }
func (f *mockAlertManager) Stats() map[string]interface{}  { return map[string]interface{}{} }
func (f *mockAlertManager) CreateRoute(context.Context, valuer.UUID, *alertmanagertypes.PostableRoutePolicy) error {
	return nil
}
func (f *mockAlertManager) DeleteRoute(context.Context, valuer.UUID, string) error { return nil }

type noopRuleStore struct{}

func (noopRuleStore) CreateRule(context.Context, *ruletypes.Rule, func(context.Context, valuer.UUID) error) (valuer.UUID, error) {
	return valuer.GenerateUUID(), nil
}
func (noopRuleStore) EditRule(context.Context, *ruletypes.Rule, func(context.Context) error) error {
	return nil
}
func (noopRuleStore) DeleteRule(context.Context, valuer.UUID, func(context.Context) error) error {
	return nil
}
func (noopRuleStore) GetStoredRules(context.Context, string) ([]*ruletypes.Rule, error) {
	return nil, nil
}
func (noopRuleStore) GetStoredRule(context.Context, valuer.UUID) (*ruletypes.Rule, error) {
	return nil, nil
}

func (f *mockAlertManager) Collect(context.Context, valuer.UUID) (map[string]any, error) {
	return nil, nil
}

func (f *mockAlertManager) Start(context.Context) error {
	return nil
}
func (f *mockAlertManager) Stop(context.Context) error {
	return nil
}

type noopMaintenanceStore struct{}

func (noopMaintenanceStore) CreatePlannedMaintenance(context.Context, ruletypes.GettablePlannedMaintenance) (valuer.UUID, error) {
	return valuer.GenerateUUID(), nil
}
func (noopMaintenanceStore) DeletePlannedMaintenance(context.Context, valuer.UUID) error { return nil }
func (noopMaintenanceStore) GetPlannedMaintenanceByID(context.Context, valuer.UUID) (*ruletypes.GettablePlannedMaintenance, error) {
	return nil, nil
}
func (noopMaintenanceStore) EditPlannedMaintenance(context.Context, ruletypes.GettablePlannedMaintenance, valuer.UUID) error {
	return nil
}
func (noopMaintenanceStore) GetAllPlannedMaintenance(context.Context, string) ([]*ruletypes.GettablePlannedMaintenance, error) {
	return nil, nil
}

type noopOrgGetter struct{}

func (noopOrgGetter) Get(context.Context, valuer.UUID) (*types.Organization, error) { return nil, nil }
func (noopOrgGetter) ListByOwnedKeyRange(context.Context) ([]*types.Organization, error) {
	return nil, nil
}

func TestManager_TestNotification_SendUnmatchedAndRecovery(t *testing.T) {
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
			name: "If found matching alert with given target value, return the alert",
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

			fAlert := &mockAlertManager{}
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

			rows := cmock.NewRows(cols, tc.values)

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
			mock.ExpectQuery("*FROM signoz_metrics.time_series_v4*").WillReturnRows(rows)

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
				OrgGetter:        noopOrgGetter{},
				RuleStore:        noopRuleStore{},
				MaintenanceStore: noopMaintenanceStore{},
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
				require.Len(t, fAlert.testAlerts, 1)
				var gotAlerts []*alertmanagertypes.PostableAlert
				for a := range fAlert.testAlerts[0] {
					gotAlerts = append(gotAlerts, a)
				}
				require.Len(t, gotAlerts, tc.expectAlerts)
				if tc.expectValue != 0 {
					assert.Equal(t, strconv.FormatFloat(tc.expectValue, 'f', -1, 64), gotAlerts[0].Annotations["value"])
				}
			} else {
				assert.Empty(t, fAlert.testAlerts)
			}
		})
	}
}
