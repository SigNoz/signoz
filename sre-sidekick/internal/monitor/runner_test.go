package monitor

import (
	"testing"
	"time"

	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/alerting"
	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/audit"
)

func TestTrackerFiresOnceAndResolves(t *testing.T) {
	now := time.Date(2026, 7, 23, 10, 0, 0, 0, time.UTC)
	tracker := Tracker{}
	failed := audit.Report{
		Service: "logs", Environment: "demo", OverallStatus: audit.Fail,
		Findings: []audit.Finding{{Status: audit.Fail, Severity: "blocker"}},
	}
	passed := audit.Report{Service: "logs", Environment: "demo", OverallStatus: audit.Pass}

	var early *alerting.Event
	tracker, early = tracker.Observe(failed, now, "blocker", 2)
	if early != nil {
		t.Fatalf("expected first failure to be suppressed, got %#v", early)
	}
	var firing *alerting.Event
	tracker, firing = tracker.Observe(failed, now.Add(time.Second), "blocker", 2)
	if firing == nil || firing.State != "firing" {
		t.Fatalf("expected firing event, got %#v", firing)
	}
	var duplicate *alerting.Event
	tracker, duplicate = tracker.Observe(failed, now.Add(2*time.Second), "blocker", 2)
	if duplicate != nil {
		t.Fatalf("expected duplicate failure to be suppressed, got %#v", duplicate)
	}
	var resolved *alerting.Event
	tracker, resolved = tracker.Observe(passed, now.Add(3*time.Second), "blocker", 2)
	if resolved == nil || resolved.State != "resolved" {
		t.Fatalf("expected resolved event, got %#v", resolved)
	}
	tracker, duplicate = tracker.Observe(passed, now.Add(4*time.Second), "blocker", 2)
	if duplicate != nil {
		t.Fatalf("expected duplicate pass to be suppressed, got %#v", duplicate)
	}
}

func TestTrackerDoesNotAlertOnWarningWhenPolicyIsBlocker(t *testing.T) {
	tracker := Tracker{}
	report := audit.Report{
		OverallStatus: audit.Fail,
		Findings:      []audit.Finding{{Status: audit.Fail, Severity: "warning"}},
	}
	_, event := tracker.Observe(report, time.Now(), "blocker", 1)
	if event != nil {
		t.Fatalf("warning unexpectedly opened blocker alert: %#v", event)
	}
}

func TestUncommittedAlertTransitionCanBeRetried(t *testing.T) {
	tracker := Tracker{}
	report := audit.Report{
		OverallStatus: audit.Fail,
		Findings:      []audit.Finding{{Status: audit.Fail, Severity: "blocker"}},
	}

	next, first := tracker.Observe(report, time.Now(), "blocker", 1)
	if first == nil || first.State != "firing" {
		t.Fatalf("expected firing transition, got %#v", first)
	}

	// A failed sink leaves tracker unchanged, so the same report is retryable.
	_, retry := tracker.Observe(report, time.Now(), "blocker", 1)
	if retry == nil || retry.State != "firing" {
		t.Fatalf("expected firing retry, got %#v", retry)
	}

	_, duplicate := next.Observe(report, time.Now(), "blocker", 1)
	if duplicate != nil {
		t.Fatalf("committed transition should suppress duplicates, got %#v", duplicate)
	}
}
