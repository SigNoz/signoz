package alertmanagerserver

import (
	"context"
	"fmt"
	"log/slog"
	"reflect"
	"sort"
	"sync"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager"
	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager/nfmanagertest"
	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager/nfroutingstore/nfroutingstoretest"
	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager/rulebasednotification"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/valuer"

	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/dispatch"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/provider/mem"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/common/model"
	"github.com/prometheus/common/promslog"

	"github.com/stretchr/testify/require"
)

func createTestProviderSettings() factory.ProviderSettings {
	return instrumentationtest.New().ToProviderSettings()
}

func TestAggrGroup(t *testing.T) {
	lset := model.LabelSet{
		"a": "v1",
		"b": "v2",
	}
	opts := &dispatch.RouteOpts{
		Receiver: "n1",
		GroupBy: map[model.LabelName]struct{}{
			"a": {},
			"b": {},
		},
		GroupWait:      1 * time.Second,
		GroupInterval:  300 * time.Millisecond,
		RepeatInterval: 1 * time.Hour,
	}
	route := &dispatch.Route{
		RouteOpts: *opts,
	}
	orgId := "test-org-id"
	ruleId := "test-rule-id"
	notificationConfig := alertmanagertypes.NotificationConfig{
		Renotify: alertmanagertypes.ReNotificationConfig{
			RenotifyInterval: 2 * time.Hour,
		},
		NotificationGroup: map[model.LabelName]struct{}{
			model.LabelName("a"): {},
			model.LabelName("b"): {},
		},
	}
	// Setup notification manager using nfmanagertest
	nfManager := nfmanagertest.NewMock()
	nfManager.SetMockConfig(orgId, ruleId, &notificationConfig)

	var (
		a1 = &alertmanagertypes.Alert{
			Alert: model.Alert{
				Labels: model.LabelSet{
					"a":      "v1",
					"b":      "v2",
					"c":      "v3",
					"ruleId": "test-rule-1",
				},
				StartsAt: time.Now().Add(time.Minute),
				EndsAt:   time.Now().Add(time.Hour),
			},
			UpdatedAt: time.Now(),
		}
		a2 = &alertmanagertypes.Alert{
			Alert: model.Alert{
				Labels: model.LabelSet{
					"a":      "v1",
					"b":      "v2",
					"c":      "v4",
					"ruleId": "test-rule-1",
				},
				StartsAt: time.Now().Add(-time.Hour),
				EndsAt:   time.Now().Add(2 * time.Hour),
			},
			UpdatedAt: time.Now(),
		}
		a3 = &alertmanagertypes.Alert{
			Alert: model.Alert{
				Labels: model.LabelSet{
					"a":      "v1",
					"b":      "v2",
					"c":      "v5",
					"ruleId": "test-rule-1",
				},
				StartsAt: time.Now().Add(time.Minute),
				EndsAt:   time.Now().Add(5 * time.Minute),
			},
			UpdatedAt: time.Now(),
		}
	)

	var (
		last       = time.Now()
		current    = time.Now()
		lastCurMtx = &sync.Mutex{}
		alertsCh   = make(chan alertmanagertypes.AlertSlice)
	)

	ntfy := func(ctx context.Context, alerts ...*alertmanagertypes.Alert) bool {
		// Validate that the context is properly populated.
		if _, ok := notify.Now(ctx); !ok {
			t.Errorf("now missing")
		}
		if _, ok := notify.GroupKey(ctx); !ok {
			t.Errorf("group key missing")
		}
		if lbls, ok := notify.GroupLabels(ctx); !ok || !reflect.DeepEqual(lbls, lset) {
			t.Errorf("wrong group labels: %q", lbls)
		}
		if rcv, ok := notify.ReceiverName(ctx); !ok || rcv != opts.Receiver {
			t.Errorf("wrong receiver: %q", rcv)
		}
		if ri, ok := notify.RepeatInterval(ctx); !ok || ri != notificationConfig.Renotify.RenotifyInterval {
			t.Errorf("wrong repeat interval: %q", ri)
		}

		lastCurMtx.Lock()
		last = current
		// Subtract a millisecond to allow for races.
		current = time.Now().Add(-time.Millisecond)
		lastCurMtx.Unlock()

		alertsCh <- alertmanagertypes.AlertSlice(alerts)

		return true
	}

	removeEndsAt := func(as alertmanagertypes.AlertSlice) alertmanagertypes.AlertSlice {
		for i, a := range as {
			ac := *a
			ac.EndsAt = time.Time{}
			as[i] = &ac
		}
		return as
	}

	// Test regular situation where we wait for group_wait to send out alerts.
	ag := newAggrGroup(context.Background(), lset, route, nil, promslog.NewNopLogger(), notificationConfig.Renotify.RenotifyInterval)

	go ag.run(ntfy)

	ag.insert(a1)

	select {
	case <-time.After(2 * opts.GroupWait):
		t.Fatalf("expected initial batch after group_wait")

	case batch := <-alertsCh:
		lastCurMtx.Lock()
		s := time.Since(last)
		lastCurMtx.Unlock()
		if s < opts.GroupWait {
			t.Fatalf("received batch too early after %v", s)
		}
		exp := removeEndsAt(alertmanagertypes.AlertSlice{a1})
		sort.Sort(batch)

		if !reflect.DeepEqual(batch, exp) {
			t.Fatalf("expected alerts %v but got %v", exp, batch)
		}
	}

	for i := 0; i < 3; i++ {
		// NewMock alert should come in after group interval.
		ag.insert(a3)

		select {
		case <-time.After(2 * opts.GroupInterval):
			t.Fatalf("expected new batch after group interval but received none")

		case batch := <-alertsCh:
			lastCurMtx.Lock()
			s := time.Since(last)
			lastCurMtx.Unlock()
			if s < opts.GroupInterval {
				t.Fatalf("received batch too early after %v", s)
			}
			exp := removeEndsAt(alertmanagertypes.AlertSlice{a1, a3})
			sort.Sort(batch)

			if !reflect.DeepEqual(batch, exp) {
				t.Fatalf("expected alerts %v but got %v", exp, batch)
			}
		}
	}

	ag.stop()

	// Add an alert that started more than group_interval in the past. We expect
	// immediate flushing.
	// Finally, set all alerts to be resolved. After successful notify the aggregation group
	// should empty itself.
	ag = newAggrGroup(context.Background(), lset, route, nil, promslog.NewNopLogger(), notificationConfig.Renotify.RenotifyInterval)
	go ag.run(ntfy)

	ag.insert(a1)
	ag.insert(a2)

	// a2 lies way in the past so the initial group_wait should be skipped.
	select {
	case <-time.After(opts.GroupWait / 2):
		t.Fatalf("expected immediate alert but received none")

	case batch := <-alertsCh:
		exp := removeEndsAt(alertmanagertypes.AlertSlice{a1, a2})
		sort.Sort(batch)

		if !reflect.DeepEqual(batch, exp) {
			t.Fatalf("expected alerts %v but got %v", exp, batch)
		}
	}

	for i := 0; i < 3; i++ {
		// NewMock alert should come in after group interval.
		ag.insert(a3)

		select {
		case <-time.After(2 * opts.GroupInterval):
			t.Fatalf("expected new batch after group interval but received none")

		case batch := <-alertsCh:
			lastCurMtx.Lock()
			s := time.Since(last)
			lastCurMtx.Unlock()
			if s < opts.GroupInterval {
				t.Fatalf("received batch too early after %v", s)
			}
			exp := removeEndsAt(alertmanagertypes.AlertSlice{a1, a2, a3})
			sort.Sort(batch)

			if !reflect.DeepEqual(batch, exp) {
				t.Fatalf("expected alerts %v but got %v", exp, batch)
			}
		}
	}

	// Resolve an alert, and it should be removed after the next batch was sent.
	a1r := *a1
	a1r.EndsAt = time.Now()
	ag.insert(&a1r)
	exp := append(alertmanagertypes.AlertSlice{&a1r}, removeEndsAt(alertmanagertypes.AlertSlice{a2, a3})...)

	select {
	case <-time.After(2 * opts.GroupInterval):
		t.Fatalf("expected new batch after group interval but received none")
	case batch := <-alertsCh:
		lastCurMtx.Lock()
		s := time.Since(last)
		lastCurMtx.Unlock()
		if s < opts.GroupInterval {
			t.Fatalf("received batch too early after %v", s)
		}
		sort.Sort(batch)

		if !reflect.DeepEqual(batch, exp) {
			t.Fatalf("expected alerts %v but got %v", exp, batch)
		}
	}

	// Resolve all remaining alerts, they should be removed after the next batch was sent.
	// Do not add a1r as it should have been deleted following the previous batch.
	a2r, a3r := *a2, *a3
	resolved := alertmanagertypes.AlertSlice{&a2r, &a3r}
	for _, a := range resolved {
		a.EndsAt = time.Now()
		ag.insert(a)
	}

	select {
	case <-time.After(2 * opts.GroupInterval):
		t.Fatalf("expected new batch after group interval but received none")

	case batch := <-alertsCh:
		lastCurMtx.Lock()
		s := time.Since(last)
		lastCurMtx.Unlock()
		if s < opts.GroupInterval {
			t.Fatalf("received batch too early after %v", s)
		}
		sort.Sort(batch)

		if !reflect.DeepEqual(batch, resolved) {
			t.Fatalf("expected alerts %v but got %v", resolved, batch)
		}

		if !ag.empty() {
			t.Fatalf("Expected aggregation group to be empty after resolving alerts: %v", ag)
		}
	}

	ag.stop()
}

func TestGroupLabels(t *testing.T) {
	a := &alertmanagertypes.Alert{
		Alert: model.Alert{
			Labels: model.LabelSet{
				"a": "v1",
				"b": "v2",
				"c": "v3",
			},
		},
	}

	route := &dispatch.Route{
		RouteOpts: dispatch.RouteOpts{
			GroupBy: map[model.LabelName]struct{}{
				"a": {},
				"b": {},
			},
			GroupByAll: false,
		},
	}

	expLs := model.LabelSet{
		"a": "v1",
		"b": "v2",
	}

	ls := getGroupLabels(a, route.RouteOpts.GroupBy, false)

	if !reflect.DeepEqual(ls, expLs) {
		t.Fatalf("expected labels are %v, but got %v", expLs, ls)
	}
}

func TestAggrRouteMap(t *testing.T) {
	// Simplified config with just receivers and default route - no hardcoded routing rules
	confData := `receivers:
- name: 'slack'
- name: 'email'
- name: 'pagerduty'

route:
  group_by: ['alertname']
  group_wait: 1m
  group_interval: 1m
  receiver: 'slack'`
	conf, err := config.Load(confData)
	if err != nil {
		t.Fatal(err)
	}
	providerSettings := createTestProviderSettings()
	logger := providerSettings.Logger
	route := dispatch.NewRoute(conf.Route, nil)
	marker := alertmanagertypes.NewMarker(prometheus.NewRegistry())
	alerts, err := mem.NewAlerts(context.Background(), marker, time.Hour, nil, logger, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer alerts.Close()

	timeout := func(d time.Duration) time.Duration { return time.Duration(0) }
	recorder := &recordStage{alerts: make(map[string]map[model.Fingerprint]*alertmanagertypes.Alert)}
	metrics := NewDispatcherMetrics(false, prometheus.NewRegistry())
	store := nfroutingstoretest.NewMockSQLRouteStore()
	store.MatchExpectationsInOrder(false)
	nfManager, err := rulebasednotification.New(context.Background(), providerSettings, nfmanager.Config{}, store)
	if err != nil {
		t.Fatal(err)
	}
	orgId := "test-org"

	ctx := context.Background()
	routes := []*alertmanagertypes.RoutePolicy{
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			Expression:     `ruleId == "ruleId-OtherAlert" && threshold.name == "critical"`,
			ExpressionKind: alertmanagertypes.PolicyBasedExpression,
			Name:           "ruleId-OtherAlert",
			Description:    "Route for OtherAlert to Slack",
			Enabled:        true,
			OrgID:          orgId,
			Channels:       []string{"slack"},
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			Expression:     `ruleId == "ruleId-OtherAlert" && threshold.name == "warning"`,
			ExpressionKind: alertmanagertypes.PolicyBasedExpression,
			Name:           "ruleId-OtherAlert",
			Description:    "Route for cluster aa and service api to Email",
			Enabled:        true,
			OrgID:          orgId,
			Channels:       []string{"email"},
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			Expression:     `ruleId == "ruleId-HighLatency" && threshold.name == "critical"`,
			ExpressionKind: alertmanagertypes.PolicyBasedExpression,
			Name:           "ruleId-HighLatency",
			Description:    "High priority route for HighLatency to PagerDuty",
			Enabled:        true,
			OrgID:          orgId,
			Channels:       []string{"pagerduty"},
		},
	}
	// Set up SQL mock expectations for the CreateBatch call
	store.ExpectCreateBatch(routes)
	err = nfManager.CreateRoutePolicies(ctx, orgId, routes)
	require.NoError(t, err)

	// Set up expectations for getting routes during matching (multiple calls expected)

	dispatcher := NewDispatcher(alerts, route, recorder, marker, timeout, nil, logger, metrics, nfManager, orgId)
	go dispatcher.Run()
	defer dispatcher.Stop()
	inputAlerts := []*alertmanagertypes.Alert{
		newAlert(model.LabelSet{"ruleId": "ruleId-OtherAlert", "cluster": "cc", "service": "dd", "threshold.name": "critical"}),
		newAlert(model.LabelSet{"ruleId": "ruleId-OtherAlert", "cluster": "dc", "service": "dd", "threshold.name": "critical"}),
		newAlert(model.LabelSet{"env": "testing", "ruleId": "ruleId-TestingAlert", "service": "api", "instance": "inst1"}),
		newAlert(model.LabelSet{"env": "prod", "ruleId": "ruleId-HighErrorRate", "cluster": "aa", "service": "api", "instance": "inst1"}),
		newAlert(model.LabelSet{"env": "prod", "ruleId": "ruleId-HighErrorRate", "cluster": "aa", "service": "api", "instance": "inst2"}),
		newAlert(model.LabelSet{"env": "prod", "ruleId": "ruleId-HighErrorRate", "cluster": "bb", "service": "api", "instance": "inst1"}),
		newAlert(model.LabelSet{"env": "prod", "ruleId": "ruleId-HighLatency", "cluster": "aa", "service": "api", "kafka": "yes", "instance": "inst3"}),
		newAlert(model.LabelSet{"env": "prod", "ruleId": "ruleId-HighLatency", "cluster": "bb", "service": "db", "kafka": "yes", "instance": "inst4", "threshold.name": "critical"}),
		newAlert(model.LabelSet{"env": "prod", "ruleId": "ruleId-HighLatency", "cluster": "bb", "service": "test-db", "kafka": "yes", "instance": "inst4", "threshold.name": "critical"}),
	}
	for i := 0; i < 9; i++ {
		store.ExpectGetAllByName(orgId, string(inputAlerts[i].Labels["ruleId"]), routes)
	}
	notiConfigs := map[string]alertmanagertypes.NotificationConfig{
		"ruleId-OtherAlert": {
			NotificationGroup: map[model.LabelName]struct{}{
				model.LabelName("ruleId"):  {},
				model.LabelName("cluster"): {},
				model.LabelName("service"): {},
			},
			Renotify: alertmanagertypes.ReNotificationConfig{
				RenotifyInterval: 10,
			},
			UsePolicy: false,
		},
		"ruleId-TestingAlert": {
			NotificationGroup: map[model.LabelName]struct{}{
				model.LabelName("ruleId"):   {},
				model.LabelName("service"):  {},
				model.LabelName("instance"): {},
			},
			Renotify: alertmanagertypes.ReNotificationConfig{
				RenotifyInterval: 11,
			},
			UsePolicy: false,
		},
		"ruleId-HighErrorRate": {
			NotificationGroup: map[model.LabelName]struct{}{
				model.LabelName("ruleId"):   {},
				model.LabelName("cluster"):  {},
				model.LabelName("instance"): {},
			},
			Renotify: alertmanagertypes.ReNotificationConfig{
				RenotifyInterval: 12,
			},
			UsePolicy: false,
		},
		"ruleId-HighLatency": {
			NotificationGroup: map[model.LabelName]struct{}{
				model.LabelName("ruleId"):  {},
				model.LabelName("service"): {},
				model.LabelName("kafka"):   {},
			},
			Renotify: alertmanagertypes.ReNotificationConfig{
				RenotifyInterval: 13,
			},
			UsePolicy: false,
		},
	}

	for ruleID, config := range notiConfigs {
		err := nfManager.SetNotificationConfig(orgId, ruleID, &config)
		require.NoError(t, err)
	}
	err = alerts.Put(inputAlerts...)
	if err != nil {
		t.Fatal(err)
	}

	// Let alerts get processed.
	for i := 0; len(recorder.Alerts()) != 4; i++ {
		time.Sleep(400 * time.Millisecond)
	}
	require.Len(t, recorder.Alerts(), 4)

	alertGroups, receivers := dispatcher.Groups(
		func(*dispatch.Route) bool {
			return true
		}, func(*alertmanagertypes.Alert, time.Time) bool {
			return true
		},
	)

	dispatcher.mtx.RLock()
	aggrGroupsPerRoute := dispatcher.aggrGroupsPerRoute
	dispatcher.mtx.RUnlock()

	require.NotEmpty(t, aggrGroupsPerRoute, "Should have aggregation groups per route")

	routeIDsFound := make(map[string]bool)
	totalAggrGroups := 0

	//first lets check for valid route id
	for route, groups := range aggrGroupsPerRoute {
		routeID := route.ID()
		routeIDsFound[routeID] = true
		expectedReceiver := ""
		switch routeID {
		case "{__receiver__=\"slack\"}":
			expectedReceiver = "slack"
		case "{__receiver__=\"email\"}":
			expectedReceiver = "email"
		case "{__receiver__=\"pagerduty\"}":
			expectedReceiver = "pagerduty"
		}
		if expectedReceiver != "" {
			require.Equal(t, expectedReceiver, route.RouteOpts.Receiver,
				"Route %s should have receiver %s", routeID, expectedReceiver)
		}
		totalAggrGroups += len(groups)
	}

	require.Equal(t, 4, totalAggrGroups, "Should have exactly 4 aggregation groups")

	// Verify specific route group counts
	expectedGroupCounts := map[string]int{
		"{__receiver__=\"slack\"}":     2,
		"{__receiver__=\"pagerduty\"}": 2,
	}

	for route, groups := range aggrGroupsPerRoute {
		routeID := route.ID()
		if expectedCount, exists := expectedGroupCounts[routeID]; exists {
			require.Equal(t, expectedCount, len(groups),
				"Route %s should have %d groups, got %d", routeID, expectedCount, len(groups))
		}
	}

	require.Equal(t, AlertGroups{
		&AlertGroup{
			Alerts: []*alertmanagertypes.Alert{inputAlerts[7]},
			Labels: model.LabelSet{
				"kafka":   "yes",
				"ruleId":  "ruleId-HighLatency",
				"service": "db",
			},
			Receiver: "pagerduty",
			GroupKey: "{__receiver__=\"pagerduty\"}:{kafka=\"yes\", ruleId=\"ruleId-HighLatency\", service=\"db\"}",
			RouteID:  "{__receiver__=\"pagerduty\"}",
			Renotify: 13,
		},
		&AlertGroup{
			Alerts: []*alertmanagertypes.Alert{inputAlerts[8]},
			Labels: model.LabelSet{
				"kafka":   "yes",
				"ruleId":  "ruleId-HighLatency",
				"service": "test-db",
			},
			Receiver: "pagerduty",
			GroupKey: "{__receiver__=\"pagerduty\"}:{kafka=\"yes\", ruleId=\"ruleId-HighLatency\", service=\"test-db\"}",
			RouteID:  "{__receiver__=\"pagerduty\"}",
			Renotify: 13,
		},
		&AlertGroup{
			Alerts: []*alertmanagertypes.Alert{inputAlerts[0]},
			Labels: model.LabelSet{
				"cluster": "cc",
				"ruleId":  "ruleId-OtherAlert",
				"service": "dd",
			},
			Renotify: 10,
			Receiver: "slack",
			GroupKey: "{__receiver__=\"slack\"}:{cluster=\"cc\", ruleId=\"ruleId-OtherAlert\", service=\"dd\"}",
			RouteID:  "{__receiver__=\"slack\"}",
		},
		&AlertGroup{
			Alerts: []*alertmanagertypes.Alert{inputAlerts[1]},
			Labels: model.LabelSet{
				"cluster": "dc",
				"service": "dd",
				"ruleId":  "ruleId-OtherAlert",
			},
			Renotify: 10,
			Receiver: "slack",
			GroupKey: "{__receiver__=\"slack\"}:{cluster=\"dc\", ruleId=\"ruleId-OtherAlert\", service=\"dd\"}",
			RouteID:  "{__receiver__=\"slack\"}",
		},
	}, alertGroups)
	require.Equal(t, map[model.Fingerprint][]string{
		inputAlerts[0].Fingerprint(): {"slack"},
		inputAlerts[1].Fingerprint(): {"slack"},
		inputAlerts[7].Fingerprint(): {"pagerduty"},
		inputAlerts[8].Fingerprint(): {"pagerduty"},
	}, receivers)
}

func TestGroupsWithNodata(t *testing.T) {
	// Simplified config with just receivers and default route - no hardcoded routing rules
	confData := `receivers:
- name: 'slack'
- name: 'email'
- name: 'pagerduty'

route:
  group_by: ['alertname']
  group_wait: 10ms
  group_interval: 10ms
  receiver: 'slack'`
	conf, err := config.Load(confData)
	if err != nil {
		t.Fatal(err)
	}
	providerSettings := createTestProviderSettings()
	logger := providerSettings.Logger
	route := dispatch.NewRoute(conf.Route, nil)
	marker := alertmanagertypes.NewMarker(prometheus.NewRegistry())
	alerts, err := mem.NewAlerts(context.Background(), marker, time.Hour, nil, logger, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer alerts.Close()

	timeout := func(d time.Duration) time.Duration { return time.Duration(0) }
	recorder := &recordStage{alerts: make(map[string]map[model.Fingerprint]*alertmanagertypes.Alert)}
	metrics := NewDispatcherMetrics(false, prometheus.NewRegistry())
	store := nfroutingstoretest.NewMockSQLRouteStore()
	store.MatchExpectationsInOrder(false)
	nfManager, err := rulebasednotification.New(context.Background(), providerSettings, nfmanager.Config{}, store)
	if err != nil {
		t.Fatal(err)
	}
	orgId := "test-org"

	ctx := context.Background()
	routes := []*alertmanagertypes.RoutePolicy{
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			Expression:     `ruleId == "ruleId-OtherAlert" && threshold.name == "critical"`,
			ExpressionKind: alertmanagertypes.PolicyBasedExpression,
			Name:           "ruleId-OtherAlert",
			Description:    "Route for OtherAlert critical to Slack",
			Enabled:        true,
			OrgID:          orgId,
			Channels:       []string{"slack"},
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			Expression:     `ruleId == "ruleId-TestingAlert" && threshold.name == "warning"`,
			ExpressionKind: alertmanagertypes.PolicyBasedExpression,
			Name:           "ruleId-TestingAlert",
			Description:    "Route for TestingAlert warning to Slack",
			Enabled:        true,
			OrgID:          orgId,
			Channels:       []string{"slack"},
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			Expression:     `ruleId == "ruleId-HighErrorRate" && threshold.name == "critical"`,
			ExpressionKind: alertmanagertypes.PolicyBasedExpression,
			Name:           "ruleId-HighErrorRate",
			Description:    "Route for HighErrorRate critical to Email",
			Enabled:        true,
			OrgID:          orgId,
			Channels:       []string{"email"},
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			Expression:     `ruleId == "ruleId-HighLatency" && threshold.name == "warning"`,
			ExpressionKind: alertmanagertypes.PolicyBasedExpression,
			Name:           "ruleId-HighLatency",
			Description:    "Route for HighLatency warning to Email",
			Enabled:        true,
			OrgID:          orgId,
			Channels:       []string{"email"},
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			Expression:     `ruleId == "ruleId-HighLatency" && threshold.name == "critical"`,
			ExpressionKind: alertmanagertypes.PolicyBasedExpression,
			Name:           "ruleId-HighLatency",
			Description:    "Route for HighLatency critical to PagerDuty",
			Enabled:        true,
			OrgID:          orgId,
			Channels:       []string{"pagerduty"},
		},
	}
	// Set up SQL mock expectations for the CreateBatch call
	store.ExpectCreateBatch(routes)
	err = nfManager.CreateRoutePolicies(ctx, orgId, routes)
	require.NoError(t, err)

	dispatcher := NewDispatcher(alerts, route, recorder, marker, timeout, nil, logger, metrics, nfManager, orgId)
	go dispatcher.Run()
	defer dispatcher.Stop()

	inputAlerts := []*alertmanagertypes.Alert{
		newAlert(model.LabelSet{"ruleId": "ruleId-OtherAlert", "cluster": "cc", "service": "dd", "threshold.name": "critical"}),
		newAlert(model.LabelSet{"env": "testing", "ruleId": "ruleId-TestingAlert", "service": "api", "instance": "inst1", "threshold.name": "warning"}),
		newAlert(model.LabelSet{"env": "prod", "ruleId": "ruleId-HighErrorRate", "cluster": "aa", "service": "api", "instance": "inst1", "threshold.name": "critical"}),
		newAlert(model.LabelSet{"env": "prod", "ruleId": "ruleId-HighErrorRate", "cluster": "aa", "service": "api", "instance": "inst2", "threshold.name": "critical"}),
		newAlert(model.LabelSet{"env": "prod", "ruleId": "ruleId-HighErrorRate", "cluster": "bb", "service": "api", "instance": "inst1", "threshold.name": "critical"}),
		newAlert(model.LabelSet{"env": "prod", "ruleId": "ruleId-HighLatency", "cluster": "bb", "service": "db", "kafka": "yes", "instance": "inst3", "threshold.name": "warning"}),
		newAlert(model.LabelSet{"env": "prod", "ruleId": "ruleId-HighLatency", "cluster": "bb", "service": "db", "kafka": "yes", "instance": "inst4", "threshold.name": "critical"}),
		newAlert(model.LabelSet{"ruleId": "ruleId-HighLatency", "nodata": "true"}),
	}
	// Set up expectations with route filtering for each alert
	store.ExpectGetAllByName(orgId, "ruleId-OtherAlert", []*alertmanagertypes.RoutePolicy{routes[0]})
	store.ExpectGetAllByName(orgId, "ruleId-TestingAlert", []*alertmanagertypes.RoutePolicy{routes[1]})
	store.ExpectGetAllByName(orgId, "ruleId-HighErrorRate", []*alertmanagertypes.RoutePolicy{routes[2]})
	store.ExpectGetAllByName(orgId, "ruleId-HighErrorRate", []*alertmanagertypes.RoutePolicy{routes[2]})
	store.ExpectGetAllByName(orgId, "ruleId-HighErrorRate", []*alertmanagertypes.RoutePolicy{routes[2]})
	store.ExpectGetAllByName(orgId, "ruleId-HighLatency", []*alertmanagertypes.RoutePolicy{routes[3], routes[4]})
	store.ExpectGetAllByName(orgId, "ruleId-HighLatency", []*alertmanagertypes.RoutePolicy{routes[3], routes[4]})
	store.ExpectGetAllByName(orgId, "ruleId-HighLatency", []*alertmanagertypes.RoutePolicy{routes[3], routes[4]})
	notiConfigs := map[string]alertmanagertypes.NotificationConfig{
		"ruleId-OtherAlert": {
			NotificationGroup: map[model.LabelName]struct{}{
				model.LabelName("ruleId"):  {},
				model.LabelName("cluster"): {},
				model.LabelName("service"): {},
			},
			Renotify: alertmanagertypes.ReNotificationConfig{
				RenotifyInterval: 10,
			},
			UsePolicy: false,
		},
		"ruleId-TestingAlert": {
			NotificationGroup: map[model.LabelName]struct{}{
				model.LabelName("ruleId"):   {},
				model.LabelName("service"):  {},
				model.LabelName("instance"): {},
			},
			Renotify: alertmanagertypes.ReNotificationConfig{
				RenotifyInterval: 11,
			},
			UsePolicy: false,
		},
		"ruleId-HighErrorRate": {
			NotificationGroup: map[model.LabelName]struct{}{
				model.LabelName("ruleId"):   {},
				model.LabelName("cluster"):  {},
				model.LabelName("instance"): {},
			},
			Renotify: alertmanagertypes.ReNotificationConfig{
				RenotifyInterval: 12,
			},
			UsePolicy: false,
		},
		"ruleId-HighLatency": {
			NotificationGroup: map[model.LabelName]struct{}{
				model.LabelName("ruleId"):  {},
				model.LabelName("service"): {},
				model.LabelName("kafka"):   {},
			},
			Renotify: alertmanagertypes.ReNotificationConfig{
				RenotifyInterval: 13,
				NoDataInterval:   14,
			},
			UsePolicy: false,
		},
	}

	for ruleID, config := range notiConfigs {
		err := nfManager.SetNotificationConfig(orgId, ruleID, &config)
		require.NoError(t, err)
	}
	err = alerts.Put(inputAlerts...)
	if err != nil {
		t.Fatal(err)
	}

	for i := 0; len(recorder.Alerts()) != 9; i++ {
		time.Sleep(400 * time.Millisecond)
	}
	require.Len(t, recorder.Alerts(), 9)

	alertGroups, receivers := dispatcher.Groups(
		func(*dispatch.Route) bool {
			return true
		}, func(*alertmanagertypes.Alert, time.Time) bool {
			return true
		},
	)

	dispatcher.mtx.RLock()
	aggrGroupsPerRoute := dispatcher.aggrGroupsPerRoute
	dispatcher.mtx.RUnlock()

	require.NotEmpty(t, aggrGroupsPerRoute, "Should have aggregation groups per route")

	routeIDsFound := make(map[string]bool)
	totalAggrGroups := 0

	for route, groups := range aggrGroupsPerRoute {
		routeID := route.ID()
		routeIDsFound[routeID] = true
		expectedReceiver := ""
		switch routeID {
		case "{__receiver__=\"slack\"}":
			expectedReceiver = "slack"
		case "{__receiver__=\"email\"}":
			expectedReceiver = "email"
		case "{__receiver__=\"pagerduty\"}":
			expectedReceiver = "pagerduty"
		}
		if expectedReceiver != "" {
			require.Equal(t, expectedReceiver, route.RouteOpts.Receiver,
				"Route %s should have receiver %s", routeID, expectedReceiver)
		}
		totalAggrGroups += len(groups)
	}

	require.Equal(t, 9, totalAggrGroups, "Should have exactly 9 aggregation groups")

	expectedGroupCounts := map[string]int{
		"{__receiver__=\"slack\"}":     2,
		"{__receiver__=\"email\"}":     5,
		"{__receiver__=\"pagerduty\"}": 2,
	}

	for route, groups := range aggrGroupsPerRoute {
		routeID := route.ID()
		if expectedCount, exists := expectedGroupCounts[routeID]; exists {
			require.Equal(t, expectedCount, len(groups),
				"Route %s should have %d groups, got %d", routeID, expectedCount, len(groups))
		}
	}

	// Verify alert groups contain expected alerts
	require.Len(t, alertGroups, 9)

	// Verify receivers mapping - exact expectations based on actual routing behavior
	expectedReceivers := map[model.Fingerprint][]string{
		inputAlerts[0].Fingerprint(): {"slack"}, // OtherAlert critical -> slack
		inputAlerts[1].Fingerprint(): {"slack"}, // TestingAlert warning -> slack
		inputAlerts[2].Fingerprint(): {"email"}, // HighErrorRate critical -> email
		inputAlerts[3].Fingerprint(): {"email"}, // HighErrorRate critical -> email
		inputAlerts[4].Fingerprint(): {"email"}, // HighErrorRate critical -> email
		inputAlerts[5].Fingerprint(): {"email"}, // HighLatency warning -> email
		inputAlerts[6].Fingerprint(): {"pagerduty"},
		inputAlerts[7].Fingerprint(): {"email", "pagerduty"},
	}
	require.Equal(t, expectedReceivers, receivers)
}

func TestGroupsWithNotificationPolicy(t *testing.T) {
	// Simplified config with just receivers and default route - no hardcoded routing rules
	confData := `receivers:
- name: 'slack'
- name: 'email'
- name: 'pagerduty'

route:
  group_by: ['alertname']
  group_wait: 10ms
  group_interval: 10ms
  receiver: 'slack'`
	conf, err := config.Load(confData)
	if err != nil {
		t.Fatal(err)
	}
	providerSettings := createTestProviderSettings()
	logger := providerSettings.Logger
	route := dispatch.NewRoute(conf.Route, nil)
	marker := alertmanagertypes.NewMarker(prometheus.NewRegistry())
	alerts, err := mem.NewAlerts(context.Background(), marker, time.Hour, nil, logger, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer alerts.Close()

	timeout := func(d time.Duration) time.Duration { return time.Duration(0) }
	recorder := &recordStage{alerts: make(map[string]map[model.Fingerprint]*alertmanagertypes.Alert)}
	metrics := NewDispatcherMetrics(false, prometheus.NewRegistry())
	store := nfroutingstoretest.NewMockSQLRouteStore()
	store.MatchExpectationsInOrder(false)
	nfManager, err := rulebasednotification.New(context.Background(), providerSettings, nfmanager.Config{}, store)
	if err != nil {
		t.Fatal(err)
	}
	orgId := "test-org"

	ctx := context.Background()
	routes := []*alertmanagertypes.RoutePolicy{
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			Expression:     `cluster == "bb" && threshold.name == "critical"`,
			ExpressionKind: alertmanagertypes.PolicyBasedExpression,
			Name:           "ruleId-OtherAlert",
			Description:    "Route for OtherAlert critical to Slack",
			Enabled:        true,
			OrgID:          orgId,
			Channels:       []string{"slack"},
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			Expression:     `service == "db" && threshold.name == "critical"`,
			ExpressionKind: alertmanagertypes.PolicyBasedExpression,
			Name:           "ruleId-TestingAlert",
			Description:    "Route for TestingAlert warning to Slack",
			Enabled:        true,
			OrgID:          orgId,
			Channels:       []string{"slack"},
		},
		{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			Expression:     `cluster == "bb" && instance == "inst1"`,
			ExpressionKind: alertmanagertypes.PolicyBasedExpression,
			Name:           "ruleId-HighErrorRate",
			Description:    "Route for HighErrorRate critical to Email",
			Enabled:        true,
			OrgID:          orgId,
			Channels:       []string{"email"},
		},
	}
	// Set up SQL mock expectations for the CreateBatch call
	store.ExpectCreateBatch(routes)
	err = nfManager.CreateRoutePolicies(ctx, orgId, routes)
	require.NoError(t, err)

	dispatcher := NewDispatcher(alerts, route, recorder, marker, timeout, nil, logger, metrics, nfManager, orgId)
	go dispatcher.Run()
	defer dispatcher.Stop()

	inputAlerts := []*alertmanagertypes.Alert{
		newAlert(model.LabelSet{"ruleId": "ruleId-OtherAlert", "cluster": "cc", "service": "db", "threshold.name": "critical"}),
		newAlert(model.LabelSet{"env": "testing", "ruleId": "ruleId-TestingAlert", "service": "api", "instance": "inst1", "threshold.name": "warning"}),
		newAlert(model.LabelSet{"env": "prod", "ruleId": "ruleId-HighErrorRate", "cluster": "aa", "service": "api", "instance": "inst1", "threshold.name": "critical"}),
		newAlert(model.LabelSet{"env": "prod", "ruleId": "ruleId-HighErrorRate", "cluster": "aa", "service": "api", "instance": "inst2", "threshold.name": "critical"}),
		newAlert(model.LabelSet{"env": "prod", "ruleId": "ruleId-HighErrorRate", "cluster": "bb", "service": "api", "instance": "inst1", "threshold.name": "critical"}),
		newAlert(model.LabelSet{"env": "prod", "ruleId": "ruleId-HighLatency", "cluster": "bb", "service": "db", "kafka": "yes", "instance": "inst1", "threshold.name": "warning"}),
		newAlert(model.LabelSet{"env": "prod", "ruleId": "ruleId-HighLatency", "cluster": "bb", "service": "db", "kafka": "yes", "instance": "inst4", "threshold.name": "critical"}),
		newAlert(model.LabelSet{"ruleId": "ruleId-HighLatency", "nodata": "true"}),
	}
	// Set up expectations with route filtering for each alert
	for i := 0; i < len(inputAlerts); i++ {
		store.ExpectGetAllByKindAndOrgID(orgId, alertmanagertypes.PolicyBasedExpression, routes)
	}
	notiConfigs := map[string]alertmanagertypes.NotificationConfig{
		"ruleId-OtherAlert": {
			NotificationGroup: map[model.LabelName]struct{}{
				model.LabelName("ruleId"):  {},
				model.LabelName("cluster"): {},
				model.LabelName("service"): {},
			},
			Renotify: alertmanagertypes.ReNotificationConfig{
				RenotifyInterval: 10,
			},
			UsePolicy: true,
		},
		"ruleId-TestingAlert": {
			NotificationGroup: map[model.LabelName]struct{}{
				model.LabelName("ruleId"):   {},
				model.LabelName("service"):  {},
				model.LabelName("instance"): {},
			},
			Renotify: alertmanagertypes.ReNotificationConfig{
				RenotifyInterval: 11,
			},
			UsePolicy: true,
		},
		"ruleId-HighErrorRate": {
			NotificationGroup: map[model.LabelName]struct{}{
				model.LabelName("ruleId"):   {},
				model.LabelName("cluster"):  {},
				model.LabelName("instance"): {},
			},
			Renotify: alertmanagertypes.ReNotificationConfig{
				RenotifyInterval: 12,
			},
			UsePolicy: true,
		},
		"ruleId-HighLatency": {
			NotificationGroup: map[model.LabelName]struct{}{
				model.LabelName("ruleId"):  {},
				model.LabelName("service"): {},
				model.LabelName("kafka"):   {},
			},
			Renotify: alertmanagertypes.ReNotificationConfig{
				RenotifyInterval: 13,
				NoDataInterval:   14,
			},
			UsePolicy: true,
		},
	}

	for ruleID, config := range notiConfigs {
		err := nfManager.SetNotificationConfig(orgId, ruleID, &config)
		require.NoError(t, err)
	}
	err = alerts.Put(inputAlerts...)
	if err != nil {
		t.Fatal(err)
	}

	for i := 0; len(recorder.Alerts()) != 3 && i < 15; i++ {
		time.Sleep(400 * time.Millisecond)
	}
	require.Len(t, recorder.Alerts(), 5)

	alertGroups, receivers := dispatcher.Groups(
		func(*dispatch.Route) bool {
			return true
		}, func(*alertmanagertypes.Alert, time.Time) bool {
			return true
		},
	)

	dispatcher.mtx.RLock()
	aggrGroupsPerRoute := dispatcher.aggrGroupsPerRoute
	dispatcher.mtx.RUnlock()

	require.NotEmpty(t, aggrGroupsPerRoute, "Should have aggregation groups per route")

	routeIDsFound := make(map[string]bool)
	totalAggrGroups := 0

	for route, groups := range aggrGroupsPerRoute {
		routeID := route.ID()
		routeIDsFound[routeID] = true
		expectedReceiver := ""
		switch routeID {
		case "{__receiver__=\"slack\"}":
			expectedReceiver = "slack"
		case "{__receiver__=\"email\"}":
			expectedReceiver = "email"
		case "{__receiver__=\"pagerduty\"}":
			expectedReceiver = "pagerduty"
		}
		if expectedReceiver != "" {
			require.Equal(t, expectedReceiver, route.RouteOpts.Receiver,
				"Route %s should have receiver %s", routeID, expectedReceiver)
		}
		totalAggrGroups += len(groups)
	}

	require.Equal(t, 5, totalAggrGroups, "Should have exactly 5 aggregation groups")

	expectedGroupCounts := map[string]int{
		"{__receiver__=\"slack\"}": 3,
		"{__receiver__=\"email\"}": 2,
	}

	for route, groups := range aggrGroupsPerRoute {
		routeID := route.ID()
		if expectedCount, exists := expectedGroupCounts[routeID]; exists {
			require.Equal(t, expectedCount, len(groups),
				"Route %s should have %d groups, got %d", routeID, expectedCount, len(groups))
		}
	}

	// Verify alert groups contain expected alerts
	require.Len(t, alertGroups, 5)

	// Verify receivers mapping - based on NotificationPolicy routing without ruleID
	expectedReceivers := map[model.Fingerprint][]string{
		inputAlerts[0].Fingerprint(): {"slack"},
		inputAlerts[6].Fingerprint(): {"slack"},
		inputAlerts[4].Fingerprint(): {"email", "slack"},
		inputAlerts[5].Fingerprint(): {"email"},
	}
	require.Equal(t, expectedReceivers, receivers)
}

type recordStage struct {
	mtx    sync.RWMutex
	alerts map[string]map[model.Fingerprint]*alertmanagertypes.Alert
}

func (r *recordStage) Alerts() []*alertmanagertypes.Alert {
	r.mtx.RLock()
	defer r.mtx.RUnlock()
	alerts := make([]*alertmanagertypes.Alert, 0)
	for k := range r.alerts {
		for _, a := range r.alerts[k] {
			alerts = append(alerts, a)
		}
	}
	return alerts
}

func (r *recordStage) Exec(ctx context.Context, l *slog.Logger, alerts ...*alertmanagertypes.Alert) (context.Context, []*alertmanagertypes.Alert, error) {
	r.mtx.Lock()
	defer r.mtx.Unlock()
	gk, ok := notify.GroupKey(ctx)
	if !ok {
		panic("GroupKey not present!")
	}
	if _, ok := r.alerts[gk]; !ok {
		r.alerts[gk] = make(map[model.Fingerprint]*alertmanagertypes.Alert)
	}
	for _, a := range alerts {
		r.alerts[gk][a.Fingerprint()] = a
	}
	return ctx, nil, nil
}

var (
	// Set the start time in the past to trigger a flush immediately.
	t0 = time.Now().Add(-time.Minute)
	// Set the end time in the future to avoid deleting the alert.
	t1 = t0.Add(2 * time.Minute)
)

func newAlert(labels model.LabelSet) *alertmanagertypes.Alert {
	return &alertmanagertypes.Alert{
		Alert: model.Alert{
			Labels:       labels,
			Annotations:  model.LabelSet{"foo": "bar"},
			StartsAt:     t0,
			EndsAt:       t1,
			GeneratorURL: "http://example.com/prometheus",
		},
		UpdatedAt: t0,
		Timeout:   false,
	}
}

func TestDispatcherRace(t *testing.T) {
	logger := promslog.NewNopLogger()
	marker := alertmanagertypes.NewMarker(prometheus.NewRegistry())
	alerts, err := mem.NewAlerts(context.Background(), marker, time.Hour, nil, logger, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer alerts.Close()

	timeout := func(d time.Duration) time.Duration { return time.Duration(0) }
	metrics := NewDispatcherMetrics(false, prometheus.NewRegistry())
	nfManager := nfmanagertest.NewMock()
	// Set up default expectation that won't be called in this race test
	dispatcher := NewDispatcher(alerts, nil, nil, marker, timeout, nil, logger, metrics, nfManager, "test-org")
	go dispatcher.Run()
	dispatcher.Stop()
}

func TestDispatcherRaceOnFirstAlertNotDeliveredWhenGroupWaitIsZero(t *testing.T) {
	const numAlerts = 5000
	confData := `receivers:
- name: 'slack'
- name: 'email'
- name: 'pagerduty'

route:
  group_by: ['alertname']
  group_wait: 1h
  group_interval: 1h
  receiver: 'slack'`
	conf, err := config.Load(confData)
	if err != nil {
		t.Fatal(err)
	}
	route := dispatch.NewRoute(conf.Route, nil)
	providerSettings := createTestProviderSettings()
	logger := providerSettings.Logger
	marker := alertmanagertypes.NewMarker(prometheus.NewRegistry())
	alerts, err := mem.NewAlerts(context.Background(), marker, time.Hour, nil, logger, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer alerts.Close()
	timeout := func(d time.Duration) time.Duration { return d }
	recorder := &recordStage{alerts: make(map[string]map[model.Fingerprint]*alertmanagertypes.Alert)}
	metrics := NewDispatcherMetrics(false, prometheus.NewRegistry())
	store := nfroutingstoretest.NewMockSQLRouteStore()
	store.MatchExpectationsInOrder(false)
	nfManager, err := rulebasednotification.New(context.Background(), providerSettings, nfmanager.Config{}, store)
	if err != nil {
		t.Fatal(err)
	}
	orgId := "test-org"

	for i := 0; i < numAlerts; i++ {
		ruleId := fmt.Sprintf("Alert_%d", i)

		notifConfig := alertmanagertypes.NotificationConfig{
			NotificationGroup: map[model.LabelName]struct{}{
				model.LabelName("ruleId"): {},
			},
			Renotify: alertmanagertypes.ReNotificationConfig{
				RenotifyInterval: 1 * time.Hour,
			},
			UsePolicy: false,
		}
		route := &alertmanagertypes.RoutePolicy{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			Expression:     fmt.Sprintf(`ruleId == "%s"`, ruleId),
			ExpressionKind: alertmanagertypes.PolicyBasedExpression,
			Name:           ruleId,
			Description:    "Route for OtherAlert critical to Slack",
			Enabled:        true,
			OrgID:          orgId,
			Channels:       []string{"slack"},
		}

		store.ExpectGetAllByName(orgId, ruleId, []*alertmanagertypes.RoutePolicy{route})
		err := nfManager.SetNotificationConfig(orgId, ruleId, &notifConfig)
		require.NoError(t, err)
	}

	dispatcher := NewDispatcher(alerts, route, recorder, marker, timeout, nil, logger, metrics, nfManager, orgId)
	go dispatcher.Run()
	defer dispatcher.Stop()

	for i := 0; i < numAlerts; i++ {
		ruleId := fmt.Sprintf("Alert_%d", i)
		alert := newAlert(model.LabelSet{"ruleId": model.LabelValue(ruleId)})
		require.NoError(t, alerts.Put(alert))
	}

	for deadline := time.Now().Add(5 * time.Second); time.Now().Before(deadline); {
		if len(recorder.Alerts()) >= numAlerts {
			break
		}

		time.Sleep(10 * time.Millisecond)
	}

	require.Len(t, recorder.Alerts(), numAlerts)
}

func TestDispatcher_DoMaintenance(t *testing.T) {
	r := prometheus.NewRegistry()
	marker := alertmanagertypes.NewMarker(r)

	alerts, err := mem.NewAlerts(context.Background(), marker, time.Minute, nil, promslog.NewNopLogger(), nil)
	if err != nil {
		t.Fatal(err)
	}

	route := &dispatch.Route{
		RouteOpts: dispatch.RouteOpts{
			GroupBy:       map[model.LabelName]struct{}{"alertname": {}},
			GroupWait:     0,
			GroupInterval: 5 * time.Minute, // Should never hit in this test.
		},
	}
	timeout := func(d time.Duration) time.Duration { return d }
	recorder := &recordStage{alerts: make(map[string]map[model.Fingerprint]*alertmanagertypes.Alert)}

	ctx := context.Background()
	metrics := NewDispatcherMetrics(false, r)
	nfManager := nfmanagertest.NewMock()
	// Set up default expectation that may be called during maintenance
	dispatcher := NewDispatcher(alerts, route, recorder, marker, timeout, nil, promslog.NewNopLogger(), metrics, nfManager, "test-org")
	aggrGroups := make(map[*dispatch.Route]map[model.Fingerprint]*aggrGroup)
	aggrGroups[route] = make(map[model.Fingerprint]*aggrGroup)

	// Insert an aggregation group with no alerts.
	labels := model.LabelSet{"alertname": "1"}
	aggrGroup1 := newAggrGroup(ctx, labels, route, timeout, promslog.NewNopLogger(), time.Hour)
	aggrGroups[route][aggrGroup1.fingerprint()] = aggrGroup1
	dispatcher.aggrGroupsPerRoute = aggrGroups
	// Must run otherwise doMaintenance blocks on aggrGroup1.stop().
	go aggrGroup1.run(func(context.Context, ...*alertmanagertypes.Alert) bool { return true })

	// Insert a marker for the aggregation group's group key.
	marker.SetMuted(route.ID(), aggrGroup1.GroupKey(), []string{"weekends"})
	mutedBy, isMuted := marker.Muted(route.ID(), aggrGroup1.GroupKey())
	require.True(t, isMuted)
	require.Equal(t, []string{"weekends"}, mutedBy)

	// Run the maintenance and the marker should be removed.
	dispatcher.doMaintenance()
	mutedBy, isMuted = marker.Muted(route.ID(), aggrGroup1.GroupKey())
	require.False(t, isMuted)
	require.Empty(t, mutedBy)
}
