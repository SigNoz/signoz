package monitor

import (
	"testing"
	"time"

	"github.com/guruvedhanth-s/reliability-agent/internal/audit"
)

func TestTrackerFiresOnceAndResolves(t *testing.T) {
	now := time.Date(2026, 7, 23, 10, 0, 0, 0, time.UTC)
	tracker := Tracker{}
	failed := audit.Report{
		Service: "logs", Environment: "demo", OverallStatus: audit.Fail,
		Findings: []audit.Finding{{Status: audit.Fail, Severity: "blocker"}},
	}
	passed := audit.Report{Service: "logs", Environment: "demo", OverallStatus: audit.Pass}

	if early := tracker.Observe(failed, now, "blocker", 2); early != nil {
		t.Fatalf("expected first failure to be suppressed, got %#v", early)
	}
	firing := tracker.Observe(failed, now.Add(time.Second), "blocker", 2)
	if firing == nil || firing.State != "firing" {
		t.Fatalf("expected firing event, got %#v", firing)
	}
	if duplicate := tracker.Observe(failed, now.Add(2*time.Second), "blocker", 2); duplicate != nil {
		t.Fatalf("expected duplicate failure to be suppressed, got %#v", duplicate)
	}
	resolved := tracker.Observe(passed, now.Add(3*time.Second), "blocker", 2)
	if resolved == nil || resolved.State != "resolved" {
		t.Fatalf("expected resolved event, got %#v", resolved)
	}
	if duplicate := tracker.Observe(passed, now.Add(4*time.Second), "blocker", 2); duplicate != nil {
		t.Fatalf("expected duplicate pass to be suppressed, got %#v", duplicate)
	}
}

func TestTrackerDoesNotAlertOnWarningWhenPolicyIsBlocker(t *testing.T) {
	tracker := Tracker{}
	report := audit.Report{
		OverallStatus: audit.Fail,
		Findings:      []audit.Finding{{Status: audit.Fail, Severity: "warning"}},
	}
	if event := tracker.Observe(report, time.Now(), "blocker", 1); event != nil {
		t.Fatalf("warning unexpectedly opened blocker alert: %#v", event)
	}
}
