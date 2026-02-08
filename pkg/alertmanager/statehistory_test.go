package alertmanager

import (
	"testing"
	"time"

	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func makeAlert(ruleID, alertname string, firing bool, now time.Time, extraLabels map[string]string) *types.Alert {
	labels := model.LabelSet{
		"ruleId":    model.LabelValue(ruleID),
		"alertname": model.LabelValue(alertname),
	}
	for k, v := range extraLabels {
		labels[model.LabelName(k)] = model.LabelValue(v)
	}

	alert := &types.Alert{
		Alert: model.Alert{
			Labels:      labels,
			Annotations: model.LabelSet{"value": "42.5"},
			StartsAt:    now.Add(-1 * time.Minute),
		},
		UpdatedAt: now,
	}

	if firing {
		alert.EndsAt = now.Add(5 * time.Minute) // future = firing
	} else {
		alert.EndsAt = now.Add(-10 * time.Second) // past = resolved
	}

	return alert
}

func TestProcessAlerts_NewFiringAlert(t *testing.T) {
	tracker := newStateTracker()
	now := time.Now()

	alerts := []*types.Alert{
		makeAlert("rule-1", "HighCPU", true, now, map[string]string{"host": "server-1"}),
	}

	entries := tracker.processAlerts("org-1", alerts, now)

	require.Len(t, entries, 1)
	assert.Equal(t, "firing", entries[0].State)
	assert.Equal(t, "rule-1", entries[0].RuleID)
	assert.Equal(t, "HighCPU", entries[0].RuleName)
	assert.Equal(t, "org-1", entries[0].OrgID)
	assert.Equal(t, true, entries[0].StateChanged)
	assert.Equal(t, 42.5, entries[0].Value)
	assert.Equal(t, now.UnixMilli(), entries[0].UnixMilli)
	assert.Equal(t, "firing", entries[0].OverallState)
	assert.Equal(t, true, entries[0].OverallStateChanged)
}

func TestProcessAlerts_StillFiringNoTransition(t *testing.T) {
	tracker := newStateTracker()
	now := time.Now()

	alerts := []*types.Alert{
		makeAlert("rule-1", "HighCPU", true, now, map[string]string{"host": "server-1"}),
	}

	// First call: new firing.
	entries := tracker.processAlerts("org-1", alerts, now)
	require.Len(t, entries, 1)

	// Second call: still firing — no transition.
	entries = tracker.processAlerts("org-1", alerts, now.Add(1*time.Minute))
	assert.Empty(t, entries)
}

func TestProcessAlerts_FiringThenResolved(t *testing.T) {
	tracker := newStateTracker()
	now := time.Now()

	// First: fire the alert.
	firingAlerts := []*types.Alert{
		makeAlert("rule-1", "HighCPU", true, now, map[string]string{"host": "server-1"}),
	}
	entries := tracker.processAlerts("org-1", firingAlerts, now)
	require.Len(t, entries, 1)
	assert.Equal(t, "firing", entries[0].State)

	// Second: resolve the alert.
	resolvedAlerts := []*types.Alert{
		makeAlert("rule-1", "HighCPU", false, now.Add(5*time.Minute), map[string]string{"host": "server-1"}),
	}
	entries = tracker.processAlerts("org-1", resolvedAlerts, now.Add(5*time.Minute))
	require.Len(t, entries, 1)
	assert.Equal(t, "inactive", entries[0].State)
	assert.Equal(t, "rule-1", entries[0].RuleID)
	assert.Equal(t, "inactive", entries[0].OverallState)
	assert.Equal(t, true, entries[0].OverallStateChanged)
}

func TestProcessAlerts_ResolvedWithoutPriorFiring(t *testing.T) {
	tracker := newStateTracker()
	now := time.Now()

	// A resolved alert arriving without prior tracking should produce no entry.
	alerts := []*types.Alert{
		makeAlert("rule-1", "HighCPU", false, now, map[string]string{"host": "server-1"}),
	}

	entries := tracker.processAlerts("org-1", alerts, now)
	assert.Empty(t, entries)
}

func TestProcessAlerts_ReFiring(t *testing.T) {
	tracker := newStateTracker()
	now := time.Now()

	// Fire.
	entries := tracker.processAlerts("org-1", []*types.Alert{
		makeAlert("rule-1", "HighCPU", true, now, map[string]string{"host": "server-1"}),
	}, now)
	require.Len(t, entries, 1)
	assert.Equal(t, "firing", entries[0].State)

	// Resolve.
	entries = tracker.processAlerts("org-1", []*types.Alert{
		makeAlert("rule-1", "HighCPU", false, now.Add(5*time.Minute), map[string]string{"host": "server-1"}),
	}, now.Add(5*time.Minute))
	require.Len(t, entries, 1)
	assert.Equal(t, "inactive", entries[0].State)

	// Re-fire.
	entries = tracker.processAlerts("org-1", []*types.Alert{
		makeAlert("rule-1", "HighCPU", true, now.Add(10*time.Minute), map[string]string{"host": "server-1"}),
	}, now.Add(10*time.Minute))
	require.Len(t, entries, 1)
	assert.Equal(t, "firing", entries[0].State)
	assert.Equal(t, "firing", entries[0].OverallState)
	assert.Equal(t, true, entries[0].OverallStateChanged)
}

func TestProcessAlerts_OverallStateComputation(t *testing.T) {
	tracker := newStateTracker()
	now := time.Now()

	// Fire two series for the same rule.
	entries := tracker.processAlerts("org-1", []*types.Alert{
		makeAlert("rule-1", "HighCPU", true, now, map[string]string{"host": "server-1"}),
		makeAlert("rule-1", "HighCPU", true, now, map[string]string{"host": "server-2"}),
	}, now)
	require.Len(t, entries, 2)
	assert.Equal(t, "firing", entries[0].OverallState)
	assert.Equal(t, "firing", entries[1].OverallState)

	// Resolve only one series — overall should still be "firing".
	entries = tracker.processAlerts("org-1", []*types.Alert{
		makeAlert("rule-1", "HighCPU", false, now.Add(5*time.Minute), map[string]string{"host": "server-1"}),
	}, now.Add(5*time.Minute))
	require.Len(t, entries, 1)
	assert.Equal(t, "inactive", entries[0].State)
	assert.Equal(t, "firing", entries[0].OverallState)
	assert.Equal(t, false, entries[0].OverallStateChanged) // still firing overall

	// Resolve the second series — overall should transition to "inactive".
	entries = tracker.processAlerts("org-1", []*types.Alert{
		makeAlert("rule-1", "HighCPU", false, now.Add(6*time.Minute), map[string]string{"host": "server-2"}),
	}, now.Add(6*time.Minute))
	require.Len(t, entries, 1)
	assert.Equal(t, "inactive", entries[0].State)
	assert.Equal(t, "inactive", entries[0].OverallState)
	assert.Equal(t, true, entries[0].OverallStateChanged) // transitioned to inactive
}

func TestProcessAlerts_MultipleRulesIndependent(t *testing.T) {
	tracker := newStateTracker()
	now := time.Now()

	entries := tracker.processAlerts("org-1", []*types.Alert{
		makeAlert("rule-1", "HighCPU", true, now, map[string]string{"host": "server-1"}),
		makeAlert("rule-2", "HighMem", true, now, map[string]string{"host": "server-1"}),
	}, now)

	require.Len(t, entries, 2)
	// Each rule has its own overall state.
	assert.Equal(t, "rule-1", entries[0].RuleID)
	assert.Equal(t, "rule-2", entries[1].RuleID)
	assert.Equal(t, "firing", entries[0].OverallState)
	assert.Equal(t, "firing", entries[1].OverallState)
}

func TestProcessAlerts_AlertWithoutRuleIDSkipped(t *testing.T) {
	tracker := newStateTracker()
	now := time.Now()

	alert := &types.Alert{
		Alert: model.Alert{
			Labels:   model.LabelSet{"alertname": "NoRuleID"},
			StartsAt: now.Add(-1 * time.Minute),
			EndsAt:   now.Add(5 * time.Minute),
		},
		UpdatedAt: now,
	}

	entries := tracker.processAlerts("org-1", []*types.Alert{alert}, now)
	assert.Empty(t, entries)
}

func TestProcessAlerts_MultipleOrgs(t *testing.T) {
	tracker := newStateTracker()
	now := time.Now()

	// Org 1 fires.
	entries1 := tracker.processAlerts("org-1", []*types.Alert{
		makeAlert("rule-1", "HighCPU", true, now, nil),
	}, now)
	require.Len(t, entries1, 1)
	assert.Equal(t, "org-1", entries1[0].OrgID)

	// Org 2 fires same rule ID — independent tracking.
	entries2 := tracker.processAlerts("org-2", []*types.Alert{
		makeAlert("rule-1", "HighCPU", true, now, nil),
	}, now)
	require.Len(t, entries2, 1)
	assert.Equal(t, "org-2", entries2[0].OrgID)
}

func TestSweepStale_FiringAlertBecomesInactive(t *testing.T) {
	tracker := newStateTracker()
	now := time.Now()

	// Fire an alert.
	tracker.processAlerts("org-1", []*types.Alert{
		makeAlert("rule-1", "HighCPU", true, now, map[string]string{"host": "server-1"}),
	}, now)

	// Sweep with staleTimeout = 5 minutes, 10 minutes later.
	result := tracker.sweepStale(5*time.Minute, now.Add(10*time.Minute))

	require.Len(t, result["org-1"], 1)
	assert.Equal(t, "inactive", result["org-1"][0].State)
	assert.Equal(t, "rule-1", result["org-1"][0].RuleID)
	assert.Equal(t, "inactive", result["org-1"][0].OverallState)
	assert.Equal(t, true, result["org-1"][0].OverallStateChanged)
}

func TestSweepStale_RecentAlertNotSwept(t *testing.T) {
	tracker := newStateTracker()
	now := time.Now()

	// Fire an alert.
	tracker.processAlerts("org-1", []*types.Alert{
		makeAlert("rule-1", "HighCPU", true, now, map[string]string{"host": "server-1"}),
	}, now)

	// Sweep with staleTimeout = 10 minutes, only 2 minutes later.
	result := tracker.sweepStale(10*time.Minute, now.Add(2*time.Minute))
	assert.Empty(t, result)
}

func TestSweepStale_InactiveAlertNotSwept(t *testing.T) {
	tracker := newStateTracker()
	now := time.Now()

	// Fire then resolve.
	tracker.processAlerts("org-1", []*types.Alert{
		makeAlert("rule-1", "HighCPU", true, now, nil),
	}, now)
	tracker.processAlerts("org-1", []*types.Alert{
		makeAlert("rule-1", "HighCPU", false, now.Add(1*time.Minute), nil),
	}, now.Add(1*time.Minute))

	// Sweep much later — should produce nothing since alert is already inactive.
	result := tracker.sweepStale(5*time.Minute, now.Add(30*time.Minute))
	assert.Empty(t, result)
}

func TestLabelsToJSON(t *testing.T) {
	ls := model.LabelSet{
		"alertname": "HighCPU",
		"env":       "prod",
	}

	result := labelsToJSON(ls)

	// Parse back and verify.
	parsed := labelsFromJSON(result)
	require.NotNil(t, parsed)
	assert.Equal(t, model.LabelValue("HighCPU"), parsed["alertname"])
	assert.Equal(t, model.LabelValue("prod"), parsed["env"])
}

func TestValueFromAnnotations(t *testing.T) {
	tests := []struct {
		name        string
		annotations model.LabelSet
		want        float64
	}{
		{
			name:        "valid float",
			annotations: model.LabelSet{"value": "42.5"},
			want:        42.5,
		},
		{
			name:        "empty value",
			annotations: model.LabelSet{},
			want:        0,
		},
		{
			name:        "invalid value",
			annotations: model.LabelSet{"value": "not-a-number"},
			want:        0,
		},
		{
			name:        "scientific notation",
			annotations: model.LabelSet{"value": "1.5E+02"},
			want:        150,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := valueFromAnnotations(tc.annotations)
			assert.Equal(t, tc.want, got)
		})
	}
}
