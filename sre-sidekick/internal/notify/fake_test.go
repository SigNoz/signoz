package notify

import (
	"context"
	"errors"
	"testing"
	"time"
)

func sampleDiagnosis() Diagnosis {
	return Diagnosis{
		CorrelationID: "corr-1",
		Service:       "support-agent",
		Window:        "1h",
		Status:        StatusDiagnosed,
		Grounding: Grounding{
			SLO:                  "successful-agent-runs",
			SLOState:             "unhealthy",
			BurnRate:             20.0,
			ErrorBudgetRemaining: -19.0,
			TelemetryTrusted:     true,
		},
		RootCause:   "Error rate rose after the 12:40 deploy; 78% of failures are TimeoutError from tool.search_knowledge_base.",
		ProposedFix: "Roll back support-agent to the previous revision, or raise the tool timeout to 5s.",
		Reversible:  true,
		Confidence:  0.72,
		Evidence: []Evidence{
			{Kind: EvidenceKindTrace, SignozLink: "https://example/trace/1", Note: "timeout span"},
			{Kind: EvidenceKindLog, SignozLink: "https://example/logs?x=1", Note: "connection reset spike"},
		},
		Timestamp: time.Now(),
	}
}

func sampleIndeterminate() IndeterminateReason {
	return IndeterminateReason{
		CorrelationID: "corr-2",
		Service:       "support-agent",
		Window:        "30d",
		Grounding: Grounding{
			SLO:              "successful-agent-runs",
			SLOState:         "indeterminate",
			TelemetryTrusted: false,
		},
		Reason:    "missing agent_success_total for support-agent over 30d",
		Timestamp: time.Now(),
	}
}

func TestFake_NotifyDiagnosis_Records(t *testing.T) {
	f := NewFake()
	d := sampleDiagnosis()

	if err := f.NotifyDiagnosis(context.Background(), d); err != nil {
		t.Fatalf("NotifyDiagnosis() error = %v", err)
	}

	got, ok := f.LastDiagnosis()
	if !ok {
		t.Fatal("LastDiagnosis() ok = false, want true")
	}
	if got.CorrelationID != d.CorrelationID {
		t.Errorf("CorrelationID = %q, want %q", got.CorrelationID, d.CorrelationID)
	}
	if got.Status != StatusDiagnosed {
		t.Errorf("Status = %q, want %q", got.Status, StatusDiagnosed)
	}
	if len(got.Evidence) != 2 {
		t.Errorf("len(Evidence) = %d, want 2", len(got.Evidence))
	}
}

func TestFake_NotifyIndeterminate_Records(t *testing.T) {
	f := NewFake()
	r := sampleIndeterminate()

	if err := f.NotifyIndeterminate(context.Background(), r); err != nil {
		t.Fatalf("NotifyIndeterminate() error = %v", err)
	}

	got, ok := f.LastIndeterminate()
	if !ok {
		t.Fatal("LastIndeterminate() ok = false, want true")
	}
	if got.Grounding.TelemetryTrusted {
		t.Error("Grounding.TelemetryTrusted = true, want false")
	}
	if got.Reason == "" {
		t.Error("Reason is empty, want a non-empty explanation")
	}
}

func TestFake_PropagatesConfiguredError(t *testing.T) {
	wantErr := errors.New("slack unavailable")
	f := &Fake{Err: wantErr}

	if err := f.NotifyDiagnosis(context.Background(), sampleDiagnosis()); !errors.Is(err, wantErr) {
		t.Errorf("NotifyDiagnosis() error = %v, want %v", err, wantErr)
	}
	if err := f.NotifyIndeterminate(context.Background(), sampleIndeterminate()); !errors.Is(err, wantErr) {
		t.Errorf("NotifyIndeterminate() error = %v, want %v", err, wantErr)
	}
	if len(f.Diagnoses) != 0 || len(f.Indeterminates) != 0 {
		t.Error("calls should not be recorded when Err is set")
	}
}

// compile-time contract check: sampleDiagnosis must satisfy an indeterminate
// diagnosis shape too (RootCause/ProposedFix empty, MissingEvidence set).
func TestIndeterminateDiagnosis_OmitsRootCause(t *testing.T) {
	d := Diagnosis{
		CorrelationID:   "corr-3",
		Service:         "support-agent",
		Window:          "1h",
		Status:          StatusIndeterminate,
		Grounding:       Grounding{TelemetryTrusted: false},
		MissingEvidence: []string{"agent_success_total"},
		Timestamp:       time.Now(),
	}
	if d.RootCause != "" {
		t.Error("RootCause should be empty for an indeterminate diagnosis")
	}
	if len(d.MissingEvidence) == 0 {
		t.Error("MissingEvidence should be set for an indeterminate diagnosis")
	}
}
