package ruletypes

import (
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var ErrCodeRuleMuteInvalid = errors.MustNewCode("rule_mute_invalid")

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
