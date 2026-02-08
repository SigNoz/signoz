package alertmanager

import (
	"encoding/json"
	"strconv"
	"sync"
	"time"

	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/common/model"
)

// trackedAlert represents the last known state of a single alert series.
type trackedAlert struct {
	state    string // "firing" or "inactive"
	labels   string // JSON labels
	ruleName string
	value    float64
	lastSeen time.Time
}

// ruleOverallState tracks the overall state of a rule across all its alert series.
type ruleOverallState struct {
	state string // "firing" or "inactive"
}

// stateTracker maintains per-org, per-rule, per-fingerprint alert state
// to detect state transitions when PutAlerts is called.
type stateTracker struct {
	mu           sync.Mutex
	alerts       map[string]map[string]map[uint64]*trackedAlert // orgID → ruleID → fingerprint → state
	overallState map[string]map[string]*ruleOverallState        // orgID → ruleID → overall state
}

func newStateTracker() *stateTracker {
	return &stateTracker{
		alerts:       make(map[string]map[string]map[uint64]*trackedAlert),
		overallState: make(map[string]map[string]*ruleOverallState),
	}
}

// processAlerts detects state transitions from incoming alerts and returns
// RuleStateHistory entries for transitions only.
func (t *stateTracker) processAlerts(orgID string, alerts []*types.Alert, now time.Time) []alertmanagertypes.RuleStateHistory {
	t.mu.Lock()
	defer t.mu.Unlock()

	if _, ok := t.alerts[orgID]; !ok {
		t.alerts[orgID] = make(map[string]map[uint64]*trackedAlert)
	}
	if _, ok := t.overallState[orgID]; !ok {
		t.overallState[orgID] = make(map[string]*ruleOverallState)
	}

	var entries []alertmanagertypes.RuleStateHistory

	// Track which rules were affected in this batch for overall_state computation.
	affectedRules := make(map[string]bool)

	for _, alert := range alerts {
		ruleID := string(alert.Labels[model.LabelName("ruleId")])
		if ruleID == "" {
			continue
		}

		fp := uint64(alert.Fingerprint())
		ruleName := string(alert.Labels[model.LabelName("alertname")])
		labelsJSON := labelsToJSON(alert.Labels)
		value := valueFromAnnotations(alert.Annotations)

		var newState string
		if !alert.EndsAt.IsZero() && !alert.EndsAt.After(now) {
			newState = "inactive"
		} else {
			newState = "firing"
		}

		if _, ok := t.alerts[orgID][ruleID]; !ok {
			t.alerts[orgID][ruleID] = make(map[uint64]*trackedAlert)
		}

		tracked, exists := t.alerts[orgID][ruleID][fp]

		if !exists {
			// First time seeing this alert.
			t.alerts[orgID][ruleID][fp] = &trackedAlert{
				state:    newState,
				labels:   labelsJSON,
				ruleName: ruleName,
				value:    value,
				lastSeen: now,
			}
			if newState == "firing" {
				// New firing alert — record transition.
				entries = append(entries, alertmanagertypes.RuleStateHistory{
					OrgID:       orgID,
					RuleID:      ruleID,
					RuleName:    ruleName,
					State:       "firing",
					StateChanged: true,
					UnixMilli:   now.UnixMilli(),
					Labels:      labelsJSON,
					Fingerprint: fp,
					Value:       value,
				})
				affectedRules[ruleID] = true
			}
			// Not found + resolved: no-op (we didn't track it firing).
			continue
		}

		// Alert exists in tracker — check for transition.
		tracked.lastSeen = now
		tracked.value = value
		tracked.labels = labelsJSON

		if tracked.state != newState {
			// State transition detected.
			tracked.state = newState
			entries = append(entries, alertmanagertypes.RuleStateHistory{
				OrgID:        orgID,
				RuleID:       ruleID,
				RuleName:     ruleName,
				State:        newState,
				StateChanged: true,
				UnixMilli:    now.UnixMilli(),
				Labels:       labelsJSON,
				Fingerprint:  fp,
				Value:        value,
			})
			affectedRules[ruleID] = true
		}
		// Same state — no transition, nothing to record.
	}

	// Compute overall_state for affected rules and set on entries.
	for ruleID := range affectedRules {
		currentOverall := t.computeOverallState(orgID, ruleID)
		prevOverall, hasPrev := t.overallState[orgID][ruleID]

		overallChanged := !hasPrev || prevOverall.state != currentOverall
		if !hasPrev {
			t.overallState[orgID][ruleID] = &ruleOverallState{state: currentOverall}
		} else {
			prevOverall.state = currentOverall
		}

		// Set overall_state on all entries for this rule.
		for i := range entries {
			if entries[i].RuleID == ruleID {
				entries[i].OverallState = currentOverall
				entries[i].OverallStateChanged = overallChanged
			}
		}
	}

	return entries
}

// computeOverallState returns "firing" if any tracked alert for the rule is firing.
func (t *stateTracker) computeOverallState(orgID, ruleID string) string {
	ruleAlerts, ok := t.alerts[orgID][ruleID]
	if !ok {
		return "inactive"
	}
	for _, a := range ruleAlerts {
		if a.state == "firing" {
			return "firing"
		}
	}
	return "inactive"
}

// sweepStale finds alerts that haven't been updated within staleTimeout and
// records them as resolved. Returns transition entries grouped by orgID.
func (t *stateTracker) sweepStale(staleTimeout time.Duration, now time.Time) map[string][]alertmanagertypes.RuleStateHistory {
	t.mu.Lock()
	defer t.mu.Unlock()

	result := make(map[string][]alertmanagertypes.RuleStateHistory)
	affectedRules := make(map[string]map[string]bool) // orgID → ruleID → true

	for orgID, rules := range t.alerts {
		for ruleID, fingerprints := range rules {
			for fp, tracked := range fingerprints {
				if tracked.state != "firing" {
					continue
				}
				if now.Sub(tracked.lastSeen) <= staleTimeout {
					continue
				}

				// Stale firing alert — mark as resolved.
				tracked.state = "inactive"
				result[orgID] = append(result[orgID], alertmanagertypes.RuleStateHistory{
					OrgID:        orgID,
					RuleID:       ruleID,
					RuleName:     tracked.ruleName,
					State:        "inactive",
					StateChanged: true,
					UnixMilli:    now.UnixMilli(),
					Labels:       tracked.labels,
					Fingerprint:  fp,
					Value:        tracked.value,
				})

				if affectedRules[orgID] == nil {
					affectedRules[orgID] = make(map[string]bool)
				}
				affectedRules[orgID][ruleID] = true
			}
		}
	}

	// Compute overall_state for affected rules.
	for orgID, rules := range affectedRules {
		for ruleID := range rules {
			currentOverall := t.computeOverallState(orgID, ruleID)
			prevOverall, hasPrev := t.overallState[orgID][ruleID]

			overallChanged := !hasPrev || prevOverall.state != currentOverall
			if hasPrev {
				prevOverall.state = currentOverall
			}

			for i := range result[orgID] {
				if result[orgID][i].RuleID == ruleID {
					result[orgID][i].OverallState = currentOverall
					result[orgID][i].OverallStateChanged = overallChanged
				}
			}
		}
	}

	return result
}

// labelsToJSON converts a model.LabelSet to a JSON string.
func labelsToJSON(ls model.LabelSet) string {
	m := make(map[string]string, len(ls))
	for k, v := range ls {
		m[string(k)] = string(v)
	}
	b, err := json.Marshal(m)
	if err != nil {
		return "{}"
	}
	return string(b)
}

// valueFromAnnotations extracts the metric value from alert annotations.
func valueFromAnnotations(annotations model.LabelSet) float64 {
	valStr := string(annotations[model.LabelName("value")])
	if valStr == "" {
		return 0
	}
	v, err := strconv.ParseFloat(valStr, 64)
	if err != nil {
		return 0
	}
	return v
}
