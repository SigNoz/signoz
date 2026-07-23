package monitor

import (
	"context"
	"fmt"
	"time"

	"github.com/guruvedhanth-s/reliability-agent/internal/alerting"
	"github.com/guruvedhanth-s/reliability-agent/internal/audit"
	"github.com/guruvedhanth-s/reliability-agent/internal/profile"
	"github.com/guruvedhanth-s/reliability-agent/internal/source"
)

type Runner struct {
	Profile  profile.Profile
	Source   source.TelemetrySource
	Audit    audit.Engine
	Sink     alerting.Sink
	Interval time.Duration
	Lookback time.Duration
	// AlertSeverity controls which failed findings can open an alert. Supported
	// values are blocker, warning, and info.
	AlertSeverity string
	// FailuresBeforeAlert prevents one transient audit from opening an alert.
	FailuresBeforeAlert int
	Now                 func() time.Time
	OnReport            func(audit.Report)
	OnError             func(error)

	tracker Tracker
}

func (r *Runner) Run(ctx context.Context) error {
	if r.Source == nil {
		return fmt.Errorf("telemetry source is required")
	}
	if r.Interval <= 0 {
		r.Interval = 5 * time.Second
	}
	if r.Lookback <= 0 {
		r.Lookback = time.Minute
	}
	if r.Now == nil {
		r.Now = time.Now
	}
	r.runCycle(ctx)
	ticker := time.NewTicker(r.Interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
			r.runCycle(ctx)
		}
	}
}

func (r *Runner) RunOnce(ctx context.Context, now time.Time) (audit.Report, error) {
	if r.Source == nil {
		return audit.Report{}, fmt.Errorf("telemetry source is required")
	}
	snapshot, err := r.Source.Snapshot(ctx, r.Profile, source.Target{
		Service:     r.Profile.Metadata.Service,
		Environment: r.Profile.Metadata.Environment,
		Start:       now.Add(-r.Lookback),
		End:         now,
	})
	if err != nil {
		return audit.Report{}, err
	}
	return r.Audit.Run(r.Profile, snapshot, now)
}

func (r *Runner) runCycle(ctx context.Context) {
	now := r.Now()
	report, err := r.RunOnce(ctx, now)
	if err != nil {
		if r.OnError != nil {
			r.OnError(err)
		}
		return
	}
	if r.OnReport != nil {
		r.OnReport(report)
	}
	event := r.tracker.Observe(report, now, r.AlertSeverity, r.FailuresBeforeAlert)
	if event != nil && r.Sink != nil {
		if err := r.Sink.Notify(ctx, *event); err != nil && r.OnError != nil {
			r.OnError(err)
		}
	}
}

type Tracker struct {
	active        bool
	previous      audit.Status
	failureStreak int
}

func (t *Tracker) Observe(report audit.Report, now time.Time, minimumSeverity string, failuresBeforeAlert int) *alerting.Event {
	if minimumSeverity == "" {
		minimumSeverity = "blocker"
	}
	if failuresBeforeAlert <= 0 {
		failuresBeforeAlert = 1
	}
	previous := t.previous
	t.previous = report.OverallStatus
	alertableFailure := report.OverallStatus == audit.Fail && hasFailedFinding(report, minimumSeverity)
	if alertableFailure {
		t.failureStreak++
	} else if report.OverallStatus != audit.Indeterminate {
		t.failureStreak = 0
	}
	switch {
	case alertableFailure && !t.active && t.failureStreak >= failuresBeforeAlert:
		t.active = true
		return &alerting.Event{
			Kind:           "track_a_alert",
			State:          "firing",
			Service:        report.Service,
			Environment:    report.Environment,
			PreviousStatus: previous,
			CurrentStatus:  report.OverallStatus,
			ObservedAt:     now,
			Message:        "telemetry quality audit failed",
			Report:         report,
		}
	case !alertableFailure && report.OverallStatus != audit.Indeterminate && t.active:
		t.active = false
		return &alerting.Event{
			Kind:           "track_a_alert",
			State:          "resolved",
			Service:        report.Service,
			Environment:    report.Environment,
			PreviousStatus: previous,
			CurrentStatus:  report.OverallStatus,
			ObservedAt:     now,
			Message:        "telemetry quality audit recovered",
			Report:         report,
		}
	default:
		return nil
	}
}

func hasFailedFinding(report audit.Report, minimumSeverity string) bool {
	minimumRank, ok := severityRank(minimumSeverity)
	if !ok {
		minimumRank = 3
	}
	for _, finding := range report.Findings {
		rank, known := severityRank(finding.Severity)
		if finding.Status == audit.Fail && known && rank >= minimumRank {
			return true
		}
	}
	return false
}

func severityRank(severity string) (int, bool) {
	switch severity {
	case "info":
		return 1, true
	case "warning":
		return 2, true
	case "blocker":
		return 3, true
	default:
		return 0, false
	}
}
