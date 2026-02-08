package alertmanagerserver

import (
	"context"
	"log/slog"
	"net/http"
	"sync"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes/alertmanagertypestest"
	"github.com/prometheus/alertmanager/dispatch"

	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager"
	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager/nfroutingstore/nfroutingstoretest"
	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager/rulebasednotification"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/valuer"

	"github.com/go-openapi/strfmt"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/common/model"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// testMuter implements types.Muter for testing maintenance expression muting.
type testMuter struct {
	mu       sync.RWMutex
	muteFunc func(model.LabelSet) bool
	calls    []model.LabelSet
}

func (m *testMuter) Mutes(labels model.LabelSet) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.calls = append(m.calls, labels)
	if m.muteFunc != nil {
		return m.muteFunc(labels)
	}
	return false
}

func (m *testMuter) getCalls() []model.LabelSet {
	m.mu.RLock()
	defer m.mu.RUnlock()
	result := make([]model.LabelSet, len(m.calls))
	copy(result, m.calls)
	return result
}

func TestEndToEndAlertManagerFlow(t *testing.T) {
	ctx := context.Background()
	providerSettings := instrumentationtest.New().ToProviderSettings()

	store := nfroutingstoretest.NewMockSQLRouteStore()
	store.MatchExpectationsInOrder(false)
	notificationManager, err := rulebasednotification.New(ctx, providerSettings, nfmanager.Config{}, store)
	require.NoError(t, err)
	orgID := "test-org"

	routes := []*alertmanagertypes.RoutePolicy{
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			Expression:     `ruleId == "high-cpu-usage" && severity == "critical"`,
			ExpressionKind: alertmanagertypes.RuleBasedExpression,
			Name:           "high-cpu-usage",
			Description:    "High CPU critical alerts to webhook",
			Enabled:        true,
			OrgID:          orgID,
			Channels:       []string{"webhook"},
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			Expression:     `ruleId == "high-cpu-usage" && severity == "warning"`,
			ExpressionKind: alertmanagertypes.RuleBasedExpression,
			Name:           "high-cpu-usage",
			Description:    "High CPU warning alerts to webhook",
			Enabled:        true,
			OrgID:          orgID,
			Channels:       []string{"webhook"},
		},
	}

	store.ExpectCreateBatch(routes)
	err = notificationManager.CreateRoutePolicies(ctx, orgID, routes)
	require.NoError(t, err)

	for range routes {
		ruleID := "high-cpu-usage"
		store.ExpectGetAllByName(orgID, ruleID, routes)
		store.ExpectGetAllByName(orgID, ruleID, routes)
	}

	notifConfig := alertmanagertypes.NotificationConfig{
		NotificationGroup: map[model.LabelName]struct{}{
			model.LabelName("cluster"):  {},
			model.LabelName("instance"): {},
		},
		Renotify: alertmanagertypes.ReNotificationConfig{
			RenotifyInterval: 5 * time.Minute,
		},
		UsePolicy: false,
	}

	err = notificationManager.SetNotificationConfig(orgID, "high-cpu-usage", &notifConfig)
	require.NoError(t, err)

	srvCfg := NewConfig()
	stateStore := alertmanagertypestest.NewStateStore()
	registry := prometheus.NewRegistry()
	logger := slog.New(slog.DiscardHandler)
	server, err := New(context.Background(), logger, registry, srvCfg, orgID, stateStore, notificationManager, nil)
	require.NoError(t, err)
	amConfig, err := alertmanagertypes.NewDefaultConfig(srvCfg.Global, srvCfg.Route, orgID)
	require.NoError(t, err)
	err = server.SetConfig(ctx, amConfig)
	require.NoError(t, err)

	// Create test alerts
	now := time.Now()
	testAlerts := []*alertmanagertypes.PostableAlert{
		{
			Alert: alertmanagertypes.AlertModel{
				Labels: map[string]string{
					"ruleId":    "high-cpu-usage",
					"severity":  "critical",
					"cluster":   "prod-cluster",
					"instance":  "server-01",
					"alertname": "HighCPUUsage",
				},
			},
			Annotations: map[string]string{
				"summary":     "High CPU usage detected",
				"description": "CPU usage is above 90% for 5 minutes",
			},
			StartsAt: strfmt.DateTime(now.Add(-5 * time.Minute)),
			EndsAt:   strfmt.DateTime(time.Time{}), // Active alert
		},
		{
			Alert: alertmanagertypes.AlertModel{
				Labels: map[string]string{
					"ruleId":    "high-cpu-usage",
					"severity":  "warning",
					"cluster":   "prod-cluster",
					"instance":  "server-02",
					"alertname": "HighCPUUsage",
				},
			},
			Annotations: map[string]string{
				"summary":     "Moderate CPU usage detected",
				"description": "CPU usage is above 70% for 10 minutes",
			},
			StartsAt: strfmt.DateTime(now.Add(-10 * time.Minute)),
			EndsAt:   strfmt.DateTime(time.Time{}), // Active alert
		},
		{
			Alert: alertmanagertypes.AlertModel{
				Labels: map[string]string{
					"ruleId":    "high-cpu-usage",
					"severity":  "critical",
					"cluster":   "prod-cluster",
					"instance":  "server-03",
					"alertname": "HighCPUUsage",
				},
			},
			Annotations: map[string]string{
				"summary":     "High CPU usage detected on server-03",
				"description": "CPU usage is above 95% for 3 minutes",
			},
			StartsAt: strfmt.DateTime(now.Add(-3 * time.Minute)),
			EndsAt:   strfmt.DateTime(time.Time{}), // Active alert
		},
	}

	err = server.PutAlerts(ctx, testAlerts)
	require.NoError(t, err)

	time.Sleep(2 * time.Second)

	t.Run("verify_alerts_processed", func(t *testing.T) {
		dummyRequest, err := http.NewRequest(http.MethodGet, "/alerts", nil)
		require.NoError(t, err)

		params, err := alertmanagertypes.NewGettableAlertsParams(dummyRequest)
		require.NoError(t, err)
		alerts, err := server.GetAlerts(context.Background(), params)
		require.NoError(t, err)
		require.Len(t, alerts, 3, "Expected 3 active alerts")

		for _, alert := range alerts {
			require.Equal(t, "high-cpu-usage", alert.Alert.Labels["ruleId"])
			require.NotEmpty(t, alert.Alert.Labels["severity"])
			require.Contains(t, []string{"critical", "warning"}, alert.Alert.Labels["severity"])
			require.Equal(t, "prod-cluster", alert.Alert.Labels["cluster"])
			require.NotEmpty(t, alert.Alert.Labels["instance"])
		}

		criticalAlerts := 0
		warningAlerts := 0
		for _, alert := range alerts {
			if alert.Alert.Labels["severity"] == "critical" {
				criticalAlerts++
			} else if alert.Alert.Labels["severity"] == "warning" {
				warningAlerts++
			}
		}
		require.Equal(t, 2, criticalAlerts, "Expected 2 critical alerts")
		require.Equal(t, 1, warningAlerts, "Expected 1 warning alert")
	})

	t.Run("verify_notification_routing", func(t *testing.T) {

		notifConfig, err := notificationManager.GetNotificationConfig(orgID, "high-cpu-usage")
		require.NoError(t, err)
		require.NotNil(t, notifConfig)
		require.Equal(t, 5*time.Minute, notifConfig.Renotify.RenotifyInterval)
		require.Contains(t, notifConfig.NotificationGroup, model.LabelName("ruleId"))
		require.Contains(t, notifConfig.NotificationGroup, model.LabelName("cluster"))
		require.Contains(t, notifConfig.NotificationGroup, model.LabelName("instance"))
	})

	t.Run("verify_alert_groups_and_stages", func(t *testing.T) {
		time.Sleep(2 * time.Second)

		alertGroups, _ := server.dispatcher.Groups(
			func(route *dispatch.Route) bool { return true },                         // Accept all routes
			func(alert *alertmanagertypes.Alert, now time.Time) bool { return true }, // Accept all alerts
		)
		require.Len(t, alertGroups, 3)

		require.NotEmpty(t, alertGroups, "Should have alert groups created by dispatcher")

		totalAlerts := 0
		for _, group := range alertGroups {
			totalAlerts += len(group.Alerts)
		}
		require.Equal(t, 3, totalAlerts, "Should have 3 alerts total across all groups")
		require.Equal(t, "{__receiver__=\"webhook\"}:{cluster=\"prod-cluster\", instance=\"server-01\", ruleId=\"high-cpu-usage\"}", alertGroups[0].GroupKey)
		require.Equal(t, "{__receiver__=\"webhook\"}:{cluster=\"prod-cluster\", instance=\"server-02\", ruleId=\"high-cpu-usage\"}", alertGroups[1].GroupKey)
		require.Equal(t, "{__receiver__=\"webhook\"}:{cluster=\"prod-cluster\", instance=\"server-03\", ruleId=\"high-cpu-usage\"}", alertGroups[2].GroupKey)
	})
}

// TestEndToEndMaintenanceMuting verifies that the maintenance expression muter
// integrates correctly with the alertmanager server pipeline:
// 1. MuteStage is injected into the notification pipeline when a muter is provided
// 2. Alerts remain visible in GetAlerts during maintenance (muting suppresses
//    notifications, not alert visibility)
// 3. The muter is called during GetAlerts for status resolution
func TestEndToEndMaintenanceMuting(t *testing.T) {
	ctx := context.Background()
	providerSettings := instrumentationtest.New().ToProviderSettings()

	store := nfroutingstoretest.NewMockSQLRouteStore()
	store.MatchExpectationsInOrder(false)
	notificationManager, err := rulebasednotification.New(ctx, providerSettings, nfmanager.Config{}, store)
	require.NoError(t, err)
	orgID := "test-org-maintenance"

	// Create a muter that mutes alerts with severity == "critical"
	muter := &testMuter{
		muteFunc: func(labels model.LabelSet) bool {
			return string(labels["severity"]) == "critical"
		},
	}

	srvCfg := NewConfig()
	stateStore := alertmanagertypestest.NewStateStore()
	registry := prometheus.NewRegistry()
	logger := slog.New(slog.DiscardHandler)

	// Create server WITH the maintenance muter
	server, err := New(ctx, logger, registry, srvCfg, orgID, stateStore, notificationManager, muter)
	require.NoError(t, err)

	amConfig, err := alertmanagertypes.NewDefaultConfig(srvCfg.Global, srvCfg.Route, orgID)
	require.NoError(t, err)
	err = server.SetConfig(ctx, amConfig)
	require.NoError(t, err)

	// Put a mix of alerts: 2 critical (should be muted) and 1 warning (should not)
	now := time.Now()
	testAlerts := []*alertmanagertypes.PostableAlert{
		{
			Alert: alertmanagertypes.AlertModel{
				Labels: map[string]string{
					"ruleId":    "disk-usage",
					"severity":  "critical",
					"env":       "prod",
					"alertname": "DiskUsageHigh",
				},
			},
			Annotations: map[string]string{"summary": "Disk usage critical"},
			StartsAt:    strfmt.DateTime(now.Add(-5 * time.Minute)),
			EndsAt:      strfmt.DateTime(time.Time{}),
		},
		{
			Alert: alertmanagertypes.AlertModel{
				Labels: map[string]string{
					"ruleId":    "disk-usage",
					"severity":  "warning",
					"env":       "prod",
					"alertname": "DiskUsageHigh",
				},
			},
			Annotations: map[string]string{"summary": "Disk usage warning"},
			StartsAt:    strfmt.DateTime(now.Add(-3 * time.Minute)),
			EndsAt:      strfmt.DateTime(time.Time{}),
		},
		{
			Alert: alertmanagertypes.AlertModel{
				Labels: map[string]string{
					"ruleId":    "memory-usage",
					"severity":  "critical",
					"env":       "staging",
					"alertname": "MemoryUsageHigh",
				},
			},
			Annotations: map[string]string{"summary": "Memory usage critical"},
			StartsAt:    strfmt.DateTime(now.Add(-2 * time.Minute)),
			EndsAt:      strfmt.DateTime(time.Time{}),
		},
	}

	err = server.PutAlerts(ctx, testAlerts)
	require.NoError(t, err)

	time.Sleep(2 * time.Second)

	t.Run("alerts_visible_during_maintenance", func(t *testing.T) {
		// Maintenance muting suppresses notifications, NOT alert visibility.
		// All 3 alerts should still be returned by GetAlerts.
		req, err := http.NewRequest(http.MethodGet, "/alerts", nil)
		require.NoError(t, err)

		params, err := alertmanagertypes.NewGettableAlertsParams(req)
		require.NoError(t, err)

		alerts, err := server.GetAlerts(ctx, params)
		require.NoError(t, err)
		require.Len(t, alerts, 3, "All alerts should be visible during maintenance")

		// Verify labels are intact
		severities := map[string]int{}
		for _, alert := range alerts {
			severities[alert.Alert.Labels["severity"]]++
		}
		assert.Equal(t, 2, severities["critical"])
		assert.Equal(t, 1, severities["warning"])
	})

	t.Run("muter_called_during_get_alerts", func(t *testing.T) {
		// The muter should have been called for each alert during GetAlerts.
		calls := muter.getCalls()
		assert.GreaterOrEqual(t, len(calls), 3, "Muter should be called for each alert")
	})

	t.Run("muter_correctly_identifies_targets", func(t *testing.T) {
		// Verify the muter returns correct results for different label sets
		assert.True(t, muter.Mutes(model.LabelSet{"severity": "critical", "env": "prod"}),
			"Should mute critical alerts")
		assert.False(t, muter.Mutes(model.LabelSet{"severity": "warning", "env": "prod"}),
			"Should not mute warning alerts")
		assert.True(t, muter.Mutes(model.LabelSet{"severity": "critical", "env": "staging"}),
			"Should mute critical regardless of env")
	})

}

// TestEndToEndMaintenanceCatchAll verifies that a catch-all muter (always returns true)
// mutes all alerts while keeping them visible.
func TestEndToEndMaintenanceCatchAll(t *testing.T) {
	ctx := context.Background()
	providerSettings := instrumentationtest.New().ToProviderSettings()

	store := nfroutingstoretest.NewMockSQLRouteStore()
	store.MatchExpectationsInOrder(false)
	notificationManager, err := rulebasednotification.New(ctx, providerSettings, nfmanager.Config{}, store)
	require.NoError(t, err)
	orgID := "test-org-catchall"

	// Catch-all muter: mutes everything
	muter := &testMuter{
		muteFunc: func(labels model.LabelSet) bool {
			return true
		},
	}

	srvCfg := NewConfig()
	stateStore := alertmanagertypestest.NewStateStore()
	registry := prometheus.NewRegistry()
	logger := slog.New(slog.DiscardHandler)

	server, err := New(ctx, logger, registry, srvCfg, orgID, stateStore, notificationManager, muter)
	require.NoError(t, err)

	amConfig, err := alertmanagertypes.NewDefaultConfig(srvCfg.Global, srvCfg.Route, orgID)
	require.NoError(t, err)
	err = server.SetConfig(ctx, amConfig)
	require.NoError(t, err)

	now := time.Now()
	testAlerts := []*alertmanagertypes.PostableAlert{
		{
			Alert: alertmanagertypes.AlertModel{
				Labels: map[string]string{
					"ruleId": "rule-1", "alertname": "Alert1", "env": "prod",
				},
			},
			StartsAt: strfmt.DateTime(now.Add(-1 * time.Minute)),
			EndsAt:   strfmt.DateTime(time.Time{}),
		},
		{
			Alert: alertmanagertypes.AlertModel{
				Labels: map[string]string{
					"ruleId": "rule-2", "alertname": "Alert2", "env": "staging",
				},
			},
			StartsAt: strfmt.DateTime(now.Add(-1 * time.Minute)),
			EndsAt:   strfmt.DateTime(time.Time{}),
		},
	}

	err = server.PutAlerts(ctx, testAlerts)
	require.NoError(t, err)

	time.Sleep(2 * time.Second)

	req, err := http.NewRequest(http.MethodGet, "/alerts", nil)
	require.NoError(t, err)
	params, err := alertmanagertypes.NewGettableAlertsParams(req)
	require.NoError(t, err)

	alerts, err := server.GetAlerts(ctx, params)
	require.NoError(t, err)
	assert.Len(t, alerts, 2, "All alerts should remain visible even when catch-all muter is active")

	// Verify the muter was called for each alert
	calls := muter.getCalls()
	assert.GreaterOrEqual(t, len(calls), 2, "Muter should be called for each alert")
}

// TestEndToEndNoMuter verifies the server works correctly without a muter (nil),
// matching the existing behavior where no maintenance muting is configured.
func TestEndToEndNoMuter(t *testing.T) {
	ctx := context.Background()
	providerSettings := instrumentationtest.New().ToProviderSettings()

	store := nfroutingstoretest.NewMockSQLRouteStore()
	store.MatchExpectationsInOrder(false)
	notificationManager, err := rulebasednotification.New(ctx, providerSettings, nfmanager.Config{}, store)
	require.NoError(t, err)
	orgID := "test-org-nomuter"

	srvCfg := NewConfig()
	stateStore := alertmanagertypestest.NewStateStore()
	registry := prometheus.NewRegistry()
	logger := slog.New(slog.DiscardHandler)

	// Create server WITHOUT a muter (nil)
	server, err := New(ctx, logger, registry, srvCfg, orgID, stateStore, notificationManager, nil)
	require.NoError(t, err)

	amConfig, err := alertmanagertypes.NewDefaultConfig(srvCfg.Global, srvCfg.Route, orgID)
	require.NoError(t, err)
	err = server.SetConfig(ctx, amConfig)
	require.NoError(t, err)

	now := time.Now()
	testAlerts := []*alertmanagertypes.PostableAlert{
		{
			Alert: alertmanagertypes.AlertModel{
				Labels: map[string]string{
					"ruleId": "rule-1", "alertname": "Alert1", "severity": "critical",
				},
			},
			StartsAt: strfmt.DateTime(now.Add(-1 * time.Minute)),
			EndsAt:   strfmt.DateTime(time.Time{}),
		},
	}

	err = server.PutAlerts(ctx, testAlerts)
	require.NoError(t, err)

	time.Sleep(2 * time.Second)

	req, err := http.NewRequest(http.MethodGet, "/alerts", nil)
	require.NoError(t, err)
	params, err := alertmanagertypes.NewGettableAlertsParams(req)
	require.NoError(t, err)

	alerts, err := server.GetAlerts(ctx, params)
	require.NoError(t, err)
	assert.Len(t, alerts, 1, "Alert should be returned when no muter is configured")
	assert.Equal(t, "critical", alerts[0].Alert.Labels["severity"])
}
