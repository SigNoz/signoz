package ruletypes

import (
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type EvaluationKind struct {
	valuer.String
}

var allowedCumulativeWindows = []Duration{
	Duration(1 * time.Hour),
	Duration(24 * time.Hour),
	Duration(24 * 30 * time.Hour),
}

var (
	RollingEvaluation    = EvaluationKind{valuer.NewString("rolling")}
	CumulativeEvaluation = EvaluationKind{valuer.NewString("cumulative")}
)

type Evaluation interface {
	NextWindowFor(curr time.Time) (time.Time, time.Time)
	GetFrequency() Duration
}

type RollingWindow struct {
	EvalWindow Duration `json:"evalWindow"`
	Frequency  Duration `json:"frequency"`
}

func (rollingWindow RollingWindow) Validate() error {
	if rollingWindow.EvalWindow <= 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "evalWindow must be greater than zero")
	}
	if rollingWindow.Frequency <= 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "frequency must be greater than zero")
	}
	return nil
}

func (rollingWindow RollingWindow) NextWindowFor(curr time.Time) (time.Time, time.Time) {
	return curr.Add(time.Duration(-rollingWindow.EvalWindow)), curr
}

func (rollingWindow RollingWindow) GetFrequency() Duration {
	return rollingWindow.Frequency
}

type CumulativeWindow struct {
	StartsAt   int64    `json:"startsAt"`
	EvalWindow Duration `json:"evalWindow"`
	Frequency  Duration `json:"frequency"`
	Timezone   string   `json:"timezone"`
}

func (cumulativeWindow CumulativeWindow) Validate() error {
	if cumulativeWindow.EvalWindow <= 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "evalWindow must be greater than zero")
	}
	isValidWindow := false
	for _, allowed := range allowedCumulativeWindows {
		if cumulativeWindow.EvalWindow == allowed {
			isValidWindow = true
			break
		}
	}
	if !isValidWindow {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "evalWindow must be one of: current hour (1h), current day (24h), or current month (720h)")
	}

	if cumulativeWindow.StartsAt <= 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "startsAt must be a valid timestamp greater than zero")
	}
	if time.Now().Before(time.UnixMilli(cumulativeWindow.StartsAt)) {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "startsAt must be in the past")
	}
	if _, err := time.LoadLocation(cumulativeWindow.Timezone); err != nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "timezone is invalid")
	}
	if cumulativeWindow.Frequency <= 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "frequency must be greater than zero")
	}
	return nil
}

func (cumulativeWindow CumulativeWindow) NextWindowFor(curr time.Time) (time.Time, time.Time) {
	startsAt := time.UnixMilli(cumulativeWindow.StartsAt)
	dur := time.Duration(cumulativeWindow.EvalWindow)

	// Guard against divide by zero
	if dur <= 0 {
		return curr, curr
	}

	// Calculate the number of complete windows since StartsAt
	elapsed := curr.Sub(startsAt)
	windows := int64(elapsed / dur)
	windowStart := startsAt.Add(time.Duration(windows) * dur)

	if windowStart.Equal(curr) && windows > 0 {
		prevWindowStart := startsAt.Add(time.Duration(windows-1) * dur)
		prevWindowEnd := windowStart
		return prevWindowStart, prevWindowEnd
	}

	return windowStart, curr
}

func (cumulativeWindow CumulativeWindow) GetFrequency() Duration {
	return cumulativeWindow.Frequency
}

type EvaluationEnvelope struct {
	Kind EvaluationKind `json:"kind"`
	Spec any            `json:"spec"`
}

func (e *EvaluationEnvelope) UnmarshalJSON(data []byte) error {
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to unmarshal evaluation: %v", err)
	}
	if err := json.Unmarshal(raw["kind"], &e.Kind); err != nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to unmarshal evaluation kind: %v", err)
	}
	switch e.Kind {
	case RollingEvaluation:
		var rollingWindow RollingWindow
		if err := json.Unmarshal(raw["spec"], &rollingWindow); err != nil {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to unmarshal rolling window: %v", err)
		}
		err := rollingWindow.Validate()
		if err != nil {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to validate rolling window: %v", err)
		}
		e.Spec = rollingWindow
	case CumulativeEvaluation:
		var cumulativeWindow CumulativeWindow
		if err := json.Unmarshal(raw["spec"], &cumulativeWindow); err != nil {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to unmarshal cumulative window: %v", err)
		}
		err := cumulativeWindow.Validate()
		if err != nil {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to validate cumulative window: %v", err)
		}
		e.Spec = cumulativeWindow

	default:
		return errors.NewInvalidInputf(errors.CodeUnsupported, "unknown evaluation kind")
	}

	return nil
}

func (e *EvaluationEnvelope) GetEvaluation() (Evaluation, error) {
	if e.Kind.IsZero() {
		e.Kind = RollingEvaluation
	}

	switch e.Kind {
	case RollingEvaluation:
		if rolling, ok := e.Spec.(RollingWindow); ok {
			return rolling, nil
		}
	case CumulativeEvaluation:
		if cumulative, ok := e.Spec.(CumulativeWindow); ok {
			return cumulative, nil
		}
	default:
		return nil, errors.NewInvalidInputf(errors.CodeUnsupported, "unknown evaluation kind")
	}
	return nil, errors.NewInvalidInputf(errors.CodeUnsupported, "unknown evaluation kind")
}
