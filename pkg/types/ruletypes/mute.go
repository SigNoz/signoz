package ruletypes

import (
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var ErrCodeRuleMuteInvalid = errors.MustNewCode("rule_mute_invalid")

// RuleMuteSource is one active schedule silencing a rule; a zero EndTime means it never expires.
type RuleMuteSource struct {
	ID      valuer.UUID                         `json:"id" required:"true"`
	Name    string                              `json:"name" required:"true"`
	Origin  alertmanagertypes.MaintenanceOrigin `json:"origin" required:"true"`
	EndTime time.Time                           `json:"endTime,omitzero"`
}

// PostableRuleMute is the mute request; an empty body means the mute never expires.
type PostableRuleMute struct {
	Duration valuer.TextDuration `json:"duration,omitzero"`
	EndTime  time.Time           `json:"endTime,omitzero"`
}

// ResolveEndTime validates the request and returns the effective end; zero means indefinite.
func (p *PostableRuleMute) ResolveEndTime(now time.Time) (time.Time, error) {
	if !p.Duration.IsZero() && !p.EndTime.IsZero() {
		return time.Time{}, errors.NewInvalidInputf(ErrCodeRuleMuteInvalid, "duration and endTime are mutually exclusive")
	}

	if !p.Duration.IsZero() {
		if !p.Duration.IsPositive() {
			return time.Time{}, errors.NewInvalidInputf(ErrCodeRuleMuteInvalid, "duration must be positive, got %q", p.Duration.StringValue())
		}
		return now.Add(p.Duration.Duration()), nil
	}

	if !p.EndTime.IsZero() {
		if !p.EndTime.After(now) {
			return time.Time{}, errors.NewInvalidInputf(ErrCodeRuleMuteInvalid, "endTime must be in the future")
		}
		return p.EndTime, nil
	}

	return time.Time{}, nil
}

// ComputeRuleMuteSources returns every schedule actively covering the rule; muted is true
// only when one of them is adhoc, a maintenance window silences without muting. Scoped
// windows count as covering: there is no label set to evaluate the scope against here.
func ComputeRuleMuteSources(ruleID string, schedules []*alertmanagertypes.PlannedMaintenance, now time.Time) (bool, []RuleMuteSource) {
	var muted bool
	var sources []RuleMuteSource

	for _, schedule := range schedules {
		if !schedule.AppliesTo(ruleID) || !schedule.IsActive(now) {
			continue
		}
		if schedule.Origin == alertmanagertypes.MaintenanceOriginAdhoc {
			muted = true
		}
		sources = append(sources, RuleMuteSource{ID: schedule.ID, Name: schedule.Name, Origin: schedule.Origin, EndTime: schedule.Schedule.EndTime})
	}

	return muted, sources
}

// OverlayRuleMutes stamps muted and mutedBy on every row in place.
func OverlayRuleMutes(rules []*ListableRule, schedules []*alertmanagertypes.PlannedMaintenance, now time.Time) {
	for _, rule := range rules {
		rule.Muted, rule.MutedBy = ComputeRuleMuteSources(rule.Id, schedules, now)
	}
}
