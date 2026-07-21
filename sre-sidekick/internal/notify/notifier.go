// Package notify defines the contract between the diagnose stage and any
// chat/voice adapter (Slack, Telegram, voice - see PRD section 18,
// "Notifier interface"). Adapters implement Notifier; nothing in this
// package talks to a specific chat provider.
//
// Diagnosis mirrors the diagnosis contract in PRD section 13.3. The
// deterministic grounding facts (SLO state, error budget, burn rate,
// telemetry trust) are computed elsewhere (Track B, the SLO engine) and only
// carried/displayed here - this package and its adapters must never compute
// or alter them (PRD section 7: the AI/adapter layer never produces an SLO
// verdict, a score, or a threshold).
package notify

import (
	"context"
	"time"
)

// Status is the outcome of a diagnosis attempt.
type Status string

const (
	// StatusDiagnosed means the RCA agent produced a root cause grounded in
	// evidence.
	StatusDiagnosed Status = "diagnosed"
	// StatusIndeterminate means the telemetry could not be trusted, or the
	// evidence was insufficient to support a conclusion. No root cause is
	// stated in this case (PRD section 13.2, 13.4).
	StatusIndeterminate Status = "indeterminate"
)

// Grounding carries the deterministic reliability facts the diagnosis is
// based on (PRD section 11, section 13.3 "grounding" object). These values
// are computed by the SLO engine and completeness gate; Notifier
// implementations only render them.
type Grounding struct {
	// SLO is the name of the SLO this incident is scoped to.
	SLO string `json:"slo"`
	// SLOState is one of "healthy", "unhealthy", "indeterminate" (see
	// slo.State in the SLO engine).
	SLOState string `json:"sloState"`
	// BurnRate is the multi-window burn rate at evaluation time.
	BurnRate float64 `json:"burnRate"`
	// ErrorBudgetRemaining is the fraction of error budget left; negative
	// values mean the budget has been exceeded.
	ErrorBudgetRemaining float64 `json:"errorBudgetRemaining"`
	// TelemetryTrusted reports whether the completeness gate trusted the
	// telemetry for this window. When false, diagnosis must be
	// StatusIndeterminate.
	TelemetryTrusted bool `json:"telemetryTrusted"`
}

// EvidenceKind identifies the signal type behind an Evidence entry.
type EvidenceKind string

const (
	EvidenceKindTrace  EvidenceKind = "trace"
	EvidenceKindLog    EvidenceKind = "logs"
	EvidenceKindMetric EvidenceKind = "metric"
)

// Evidence is one piece of proof the RCA agent grounded its diagnosis on,
// with a deep link back into SigNoz so a human can verify it (PRD section
// 13.3).
type Evidence struct {
	Kind       EvidenceKind `json:"kind"`
	SignozLink string       `json:"signozLink"`
	Note       string       `json:"note"`
}

// Diagnosis is the full result of the diagnose stage for one incident,
// ready to hand to a Notifier. It is the Go representation of the JSON
// contract in PRD section 13.3.
type Diagnosis struct {
	// CorrelationID ties this diagnosis to the triggering alert/question and
	// to every message and action that follows it, for audit (PRD section
	// 20).
	CorrelationID string `json:"correlationId"`

	Service string `json:"service"`
	Window  string `json:"window"`
	Status  Status `json:"status"`

	Grounding Grounding `json:"grounding"`

	// RootCause and ProposedFix are set only when Status ==
	// StatusDiagnosed. The RCA model must cite the Evidence it used and must
	// not invent metrics or services (PRD section 13.2).
	RootCause   string `json:"rootCause,omitempty"`
	ProposedFix string `json:"proposedFix,omitempty"`
	// Reversible flags whether ProposedFix is a reversible action; PRD
	// section 15 requires irreversible actions to be labeled and to demand
	// stronger confirmation.
	Reversible bool `json:"reversible,omitempty"`

	// Confidence is a presentation hint only (PRD section 13.4: presentation
	// is rule-based, not a soft LLM confidence number, so this is informative,
	// not the thing that decides how the diagnosis is rendered).
	Confidence float64 `json:"confidence,omitempty"`

	Evidence []Evidence `json:"evidence,omitempty"`

	// MissingEvidence is set only when Status == StatusIndeterminate: it
	// names what telemetry was missing or incomplete (PRD section 13.3).
	MissingEvidence []string `json:"missingEvidence,omitempty"`

	// Timestamp is when the diagnosis was produced.
	Timestamp time.Time `json:"timestamp"`
}

// IndeterminateReason is used when the completeness gate refuses to trust
// the telemetry before the RCA agent even runs (PRD section 9.3 sequence:
// "telemetry not trusted" branch). It is a lighter-weight message than a
// full Diagnosis because no evidence gathering or reasoning happened.
type IndeterminateReason struct {
	CorrelationID string    `json:"correlationId"`
	Service       string    `json:"service"`
	Window        string    `json:"window"`
	Grounding     Grounding `json:"grounding"`
	// Reason is a human-readable explanation of why telemetry is not
	// trusted (e.g. "missing agent_success_total for support-agent over 30d").
	Reason    string    `json:"reason"`
	Timestamp time.Time `json:"timestamp"`
}

// Notifier delivers grounded diagnoses to wherever the on-call engineer is
// (Slack, Telegram, voice - PRD section 14). Implementations must never
// compute or alter grounding facts; they only format and deliver them.
//
// A Notifier call is expected to be logged by its implementation with the
// Diagnosis/IndeterminateReason's CorrelationID (PRD section 20).
type Notifier interface {
	// NotifyDiagnosis delivers a completed diagnosis (root cause or
	// ranked hypotheses, per PRD section 13.4) to on-call.
	NotifyDiagnosis(ctx context.Context, d Diagnosis) error

	// NotifyIndeterminate tells on-call the telemetry could not be trusted,
	// so no diagnosis was attempted. The Notifier must never fabricate a
	// root cause in this path.
	NotifyIndeterminate(ctx context.Context, r IndeterminateReason) error
}
