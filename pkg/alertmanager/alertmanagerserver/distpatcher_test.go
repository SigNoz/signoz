package alertmanagerserver

import (
	"context"
	"fmt"
	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager/nfmanagertest"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/prometheus/alertmanager/dispatch"
	"log/slog"
	"reflect"
	"sort"
	"sync"
	"testing"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/common/model"
	"github.com/prometheus/common/promslog"
	"github.com/stretchr/testify/require"

	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/provider/mem"
	"github.com/prometheus/alertmanager/types"
)

const testMaintenanceInterval = 30 * time.Second

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
		a1 = &types.Alert{
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
		a2 = &types.Alert{
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
		a3 = &types.Alert{
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
		alertsCh   = make(chan types.AlertSlice)
	)

	ntfy := func(ctx context.Context, alerts ...*types.Alert) bool {
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

		alertsCh <- types.AlertSlice(alerts)

		return true
	}

	removeEndsAt := func(as types.AlertSlice) types.AlertSlice {
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
		exp := removeEndsAt(types.AlertSlice{a1})
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
			exp := removeEndsAt(types.AlertSlice{a1, a3})
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
		exp := removeEndsAt(types.AlertSlice{a1, a2})
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
			exp := removeEndsAt(types.AlertSlice{a1, a2, a3})
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
	exp := append(types.AlertSlice{&a1r}, removeEndsAt(types.AlertSlice{a2, a3})...)

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
	resolved := types.AlertSlice{&a2r, &a3r}
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
	a := &types.Alert{
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

	ls := getGroupLabels(a, route.RouteOpts.GroupBy)

	if !reflect.DeepEqual(ls, expLs) {
		t.Fatalf("expected labels are %v, but got %v", expLs, ls)
	}
}

func TestGroupByAllLabels(t *testing.T) {
	a := &types.Alert{
		Alert: model.Alert{
			Labels: model.LabelSet{
				"a": "v1",
				"b": "v2",
				"c": "v3",
			},
		},
	}

	// Test grouping by all labels (empty GroupBy map should group by all)
	allLabelsGroup := map[model.LabelName]struct{}{
		"a": {},
		"b": {},
		"c": {},
	}

	expLs := model.LabelSet{
		"a": "v1",
		"b": "v2",
		"c": "v3",
	}

	ls := getGroupLabels(a, allLabelsGroup)

	if !reflect.DeepEqual(ls, expLs) {
		t.Fatalf("expected labels are %v, but got %v", expLs, ls)
	}
}

func TestGroups(t *testing.T) {
	confData := `receivers:
- name: 'kafka'
- name: 'prod'
- name: 'testing'

route:
  group_by: ['alertname']
  group_wait: 10ms
  group_interval: 10ms
  receiver: 'prod'
  routes:
  - match:
      env: 'testing'
    receiver: 'testing'
    group_by: ['alertname', 'service']
  - match:
      env: 'prod'
    receiver: 'prod'
    group_by: ['alertname', 'service', 'cluster']
    continue: true
  - match:
      kafka: 'yes'
    receiver: 'kafka'
    group_by: ['alertname', 'service', 'cluster']`
	conf, err := config.Load(confData)
	if err != nil {
		t.Fatal(err)
	}

	logger := promslog.NewNopLogger()
	route := dispatch.NewRoute(conf.Route, nil)
	marker := types.NewMarker(prometheus.NewRegistry())
	alerts, err := mem.NewAlerts(context.Background(), marker, time.Hour, nil, logger, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer alerts.Close()

	timeout := func(d time.Duration) time.Duration { return time.Duration(0) }
	recorder := &recordStage{alerts: make(map[string]map[model.Fingerprint]*types.Alert)}
	metrics := NewDispatcherMetrics(false, prometheus.NewRegistry())
	nfManager := nfmanagertest.NewMock()
	orgId := "test-org"
	dispatcher := NewDispatcher(alerts, route, recorder, marker, timeout, nil, logger, metrics, nfManager, orgId)
	go dispatcher.Run()
	defer dispatcher.Stop()

	// Create alerts. the dispatcher will automatically create the groups.
	inputAlerts := []*types.Alert{
		// Matches the parent route.
		newAlert(model.LabelSet{"ruleId": "OtherAlert", "cluster": "cc", "service": "dd"}),
		// Matches the first sub-route.
		newAlert(model.LabelSet{"env": "testing", "ruleId": "TestingAlert", "service": "api", "instance": "inst1"}),
		// Matches the second sub-route.
		newAlert(model.LabelSet{"env": "prod", "ruleId": "HighErrorRate", "cluster": "aa", "service": "api", "instance": "inst1"}),
		newAlert(model.LabelSet{"env": "prod", "ruleId": "HighErrorRate", "cluster": "aa", "service": "api", "instance": "inst2"}),
		// Matches the second sub-route.
		newAlert(model.LabelSet{"env": "prod", "ruleId": "HighErrorRate", "cluster": "bb", "service": "api", "instance": "inst1"}),
		// Matches the second and third sub-route.
		newAlert(model.LabelSet{"env": "prod", "ruleId": "HighLatency", "cluster": "bb", "service": "db", "kafka": "yes", "instance": "inst3"}),
	}
	notiConfigs := map[string]alertmanagertypes.NotificationConfig{
		"OtherAlert": {
			NotificationGroup: map[model.LabelName]struct{}{
				model.LabelName("ruleId"):  {},
				model.LabelName("cluster"): {},
				model.LabelName("service"): {},
			},
			Renotify: alertmanagertypes.ReNotificationConfig{
				RenotifyInterval: 10,
			},
		},
		"TestingAlert": {
			NotificationGroup: map[model.LabelName]struct{}{
				model.LabelName("ruleId"):   {},
				model.LabelName("service"):  {},
				model.LabelName("instance"): {},
			},
		},
		"HighErrorRate": {
			NotificationGroup: map[model.LabelName]struct{}{
				model.LabelName("ruleId"):   {},
				model.LabelName("cluster"):  {},
				model.LabelName("instance"): {},
			},
		},
		"HighLatency": {
			NotificationGroup: map[model.LabelName]struct{}{
				model.LabelName("ruleId"):  {},
				model.LabelName("service"): {},
				model.LabelName("kafka"):   {},
			},
		},
	}

	for ruleID, config := range notiConfigs {
		nfManager.SetMockConfig(orgId, ruleID, &config)
	}
	alerts.Put(inputAlerts...)

	// Let alerts get processed.
	for i := 0; len(recorder.Alerts()) != 7 && i < 10; i++ {
		time.Sleep(200 * time.Millisecond)
	}
	require.Len(t, recorder.Alerts(), 7)

	alertGroups, receivers := dispatcher.Groups(
		func(*dispatch.Route) bool {
			return true
		}, func(*types.Alert, time.Time) bool {
			return true
		},
	)

	require.Equal(t, AlertGroups{
		&AlertGroup{
			Alerts: []*types.Alert{inputAlerts[5]},
			Labels: model.LabelSet{
				"kafka":   "yes",
				"ruleId":  "HighLatency",
				"service": "db",
			},
			Receiver: "kafka",
			GroupKey: "{}/{kafka=\"yes\"}:{kafka=\"yes\", ruleId=\"HighLatency\", service=\"db\"}",
			RouteID:  "{}/{kafka=\"yes\"}/2",
		},
		&AlertGroup{
			Alerts: []*types.Alert{inputAlerts[5]},
			Labels: model.LabelSet{
				"kafka":   "yes",
				"ruleId":  "HighLatency",
				"service": "db",
			},
			Receiver: "prod",
			GroupKey: "{}/{env=\"prod\"}:{kafka=\"yes\", ruleId=\"HighLatency\", service=\"db\"}",
			RouteID:  "{}/{env=\"prod\"}/1",
		},
		&AlertGroup{
			Alerts: []*types.Alert{inputAlerts[1]},
			Labels: model.LabelSet{
				"instance": "inst1",
				"ruleId":   "TestingAlert",
				"service":  "api",
			},
			Receiver: "testing",
			GroupKey: "{}/{env=\"testing\"}:{instance=\"inst1\", ruleId=\"TestingAlert\", service=\"api\"}",
			RouteID:  "{}/{env=\"testing\"}/0",
		},
		&AlertGroup{
			Alerts: []*types.Alert{inputAlerts[2]},
			Labels: model.LabelSet{
				"cluster":  "aa",
				"instance": "inst1",
				"ruleId":   "HighErrorRate",
			},
			Receiver: "prod",
			GroupKey: "{}/{env=\"prod\"}:{cluster=\"aa\", instance=\"inst1\", ruleId=\"HighErrorRate\"}",
			RouteID:  "{}/{env=\"prod\"}/1",
		},
		&AlertGroup{
			Alerts: []*types.Alert{inputAlerts[3]},
			Labels: model.LabelSet{
				"cluster":  "aa",
				"instance": "inst2",
				"ruleId":   "HighErrorRate",
			},
			Receiver: "prod",
			GroupKey: "{}/{env=\"prod\"}:{cluster=\"aa\", instance=\"inst2\", ruleId=\"HighErrorRate\"}",
			RouteID:  "{}/{env=\"prod\"}/1",
		},
		&AlertGroup{
			Alerts: []*types.Alert{inputAlerts[4]},
			Labels: model.LabelSet{
				"cluster":  "bb",
				"instance": "inst1",
				"ruleId":   "HighErrorRate",
			},
			Receiver: "prod",
			GroupKey: "{}/{env=\"prod\"}:{cluster=\"bb\", instance=\"inst1\", ruleId=\"HighErrorRate\"}",
			RouteID:  "{}/{env=\"prod\"}/1",
		},
		&AlertGroup{
			Alerts: []*types.Alert{inputAlerts[0]},
			Labels: model.LabelSet{
				"cluster": "cc",
				"ruleId":  "OtherAlert",
				"service": "dd",
			},
			Receiver: "prod",
			GroupKey: "{}:{cluster=\"cc\", ruleId=\"OtherAlert\", service=\"dd\"}",
			RouteID:  "{}",
		},
	}, alertGroups)
	require.Equal(t, map[model.Fingerprint][]string{
		inputAlerts[0].Fingerprint(): {"prod"},
		inputAlerts[1].Fingerprint(): {"testing"},
		inputAlerts[2].Fingerprint(): {"prod"},
		inputAlerts[3].Fingerprint(): {"prod"},
		inputAlerts[4].Fingerprint(): {"prod"},
		inputAlerts[5].Fingerprint(): {"kafka", "prod"},
	}, receivers)
}

type recordStage struct {
	mtx    sync.RWMutex
	alerts map[string]map[model.Fingerprint]*types.Alert
}

func (r *recordStage) Alerts() []*types.Alert {
	r.mtx.RLock()
	defer r.mtx.RUnlock()
	alerts := make([]*types.Alert, 0)
	for k := range r.alerts {
		for _, a := range r.alerts[k] {
			alerts = append(alerts, a)
		}
	}
	return alerts
}

func (r *recordStage) Exec(ctx context.Context, l *slog.Logger, alerts ...*types.Alert) (context.Context, []*types.Alert, error) {
	r.mtx.Lock()
	defer r.mtx.Unlock()
	gk, ok := notify.GroupKey(ctx)
	if !ok {
		panic("GroupKey not present!")
	}
	if _, ok := r.alerts[gk]; !ok {
		r.alerts[gk] = make(map[model.Fingerprint]*types.Alert)
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

func newAlert(labels model.LabelSet) *types.Alert {
	return &types.Alert{
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
	marker := types.NewMarker(prometheus.NewRegistry())
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

	logger := promslog.NewNopLogger()
	marker := types.NewMarker(prometheus.NewRegistry())
	alerts, err := mem.NewAlerts(context.Background(), marker, time.Hour, nil, logger, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer alerts.Close()

	route := &dispatch.Route{
		RouteOpts: dispatch.RouteOpts{
			Receiver:       "default",
			GroupBy:        map[model.LabelName]struct{}{"alertname": {}},
			GroupWait:      0,
			GroupInterval:  1 * time.Hour, // Should never hit in this test.
			RepeatInterval: 1 * time.Hour, // Should never hit in this test.
		},
	}

	timeout := func(d time.Duration) time.Duration { return d }
	recorder := &recordStage{alerts: make(map[string]map[model.Fingerprint]*types.Alert)}
	metrics := NewDispatcherMetrics(false, prometheus.NewRegistry())
	nfManager := nfmanagertest.NewMock()
	dispatcher := NewDispatcher(alerts, route, recorder, marker, timeout, nil, logger, metrics, nfManager, "test-org")
	go dispatcher.Run()
	defer dispatcher.Stop()

	// Push all alerts.
	for i := 0; i < numAlerts; i++ {
		alert := newAlert(model.LabelSet{"alertname": model.LabelValue(fmt.Sprintf("Alert_%d", i))})
		require.NoError(t, alerts.Put(alert))
	}

	// Wait until the alerts have been notified or the waiting timeout expires.
	for deadline := time.Now().Add(5 * time.Second); time.Now().Before(deadline); {
		if len(recorder.Alerts()) >= numAlerts {
			break
		}

		// Throttle.
		time.Sleep(10 * time.Millisecond)
	}

	// We expect all alerts to be notified immediately, since they all belong to different groups.
	require.Len(t, recorder.Alerts(), numAlerts)
}

type limits struct {
	groups int
}

func (l limits) MaxNumberOfAggregationGroups() int {
	return l.groups
}

func TestDispatcher_DoMaintenance(t *testing.T) {
	r := prometheus.NewRegistry()
	marker := types.NewMarker(r)

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
	recorder := &recordStage{alerts: make(map[string]map[model.Fingerprint]*types.Alert)}

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
	go aggrGroup1.run(func(context.Context, ...*types.Alert) bool { return true })

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
