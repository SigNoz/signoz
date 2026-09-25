package audit

import (
	"testing"
	"time"

	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/evidence"
	"github.com/guruvedhanth-s/signoz/sre-sidekick/internal/profile"
)

func TestRunProfileDrivenAudit(t *testing.T) {
	now := time.Date(2026, 7, 22, 12, 0, 0, 0, time.UTC)
	p := profile.Profile{
		Metadata: profile.Metadata{Name: "backend", Service: "checkout"},
		Spec: profile.Spec{
			DataKind: "backend", Source: profile.SourceSpec{Adapter: "memory"},
			AuditRules: []profile.RuleSpec{
				{ID: "service", Type: "required_field", Signal: "traces", Field: "service.name", Severity: "blocker"},
				{ID: "fresh", Type: "freshness", Signal: "metrics", Field: "requests", MaxAge: "10m", Severity: "warning"},
			},
		},
	}
	snapshot := evidence.Snapshot{
		QueryComplete: true,
		Traces:        []evidence.Record{{Selector: "http.server", Fields: map[string]any{"service.name": "checkout"}}},
		LastSeen:      map[string]time.Time{"requests": now.Add(-time.Minute)},
	}
	report, err := (Engine{}).Run(p, snapshot, now)
	if err != nil {
		t.Fatal(err)
	}
	if report.OverallStatus != Pass || report.Score != 100 || report.Coverage != 1 {
		t.Fatalf("unexpected report: %+v", report)
	}
}

func TestRunReturnsIndeterminateForPartialEvidence(t *testing.T) {
	p := profile.Profile{
		Metadata: profile.Metadata{Name: "backend", Service: "checkout"},
		Spec: profile.Spec{
			DataKind: "backend", Source: profile.SourceSpec{Adapter: "memory"},
			AuditRules: []profile.RuleSpec{{
				ID: "service", Type: "required_field", Signal: "traces",
				Field: "service.name", Severity: "blocker",
			}},
		},
	}
	report, err := (Engine{}).Run(p, evidence.Snapshot{Partial: true}, time.Now())
	if err != nil {
		t.Fatal(err)
	}
	if report.OverallStatus != Indeterminate {
		t.Fatalf("expected indeterminate, got %s", report.OverallStatus)
	}
}

func TestRequiredSpanDistinguishesUnsupportedFromMissing(t *testing.T) {
	rule := profile.RuleSpec{
		ID: "model-span", Type: "required_span", Signal: "traces",
		SpanName: "model.chat", Severity: "blocker",
	}

	unsupported := evaluate(rule, evidence.Snapshot{
		AvailableSignals: map[string]bool{"logs": true},
	}, time.Now())
	if unsupported.Status != NotApplicable {
		t.Fatalf("unsupported trace source should be not applicable: %+v", unsupported)
	}

	missing := evaluate(rule, evidence.Snapshot{
		AvailableSignals: map[string]bool{"traces": true},
		Traces:           []evidence.Record{},
	}, time.Now())
	if missing.Status != Fail {
		t.Fatalf("completed trace evidence without the span should fail: %+v", missing)
	}
}
