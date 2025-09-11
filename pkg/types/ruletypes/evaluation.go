package ruletypes

import (
	"encoding/json"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"time"
)

type EvaluationKind struct {
	valuer.String
}

var (
	RollingEvaluation    = EvaluationKind{valuer.NewString("rolling")}
	CumulativeEvaluation = EvaluationKind{valuer.NewString("cumulative")}
)

type Evaluation interface {
	EvaluationTime(curr time.Time) (time.Time, time.Time, error)
}

type RollingWindow struct {
	EvalWindow Duration `json:"evalWindow"`
	Frequency  Duration `json:"frequency"`
}

func (rollingWindow *RollingWindow) Validate() error {
	if rollingWindow.EvalWindow <= 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "evalWindow must be greater than zero")
	}
	if rollingWindow.Frequency <= 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "frequency must be greater than zero")
	}
	return nil
}

func (rollingWindow *RollingWindow) EvaluationTime(curr time.Time) (time.Time, time.Time, error) {
	return curr.Add(time.Duration(-rollingWindow.EvalWindow)), curr, nil
}

type CumulativeWindow struct {
	StartsAt   int64    `json:"startsAt"`
	EvalWindow Duration `json:"evalWindow"`
}

func (cumulativeWindow *CumulativeWindow) Validate() error {
	if cumulativeWindow.EvalWindow <= 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "evalWindow must be greater than zero")
	}
	if cumulativeWindow.StartsAt <= 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "startsAt must be a valid timestamp greater than zero")
	}
	if time.Now().After(time.Unix(cumulativeWindow.StartsAt, 0)) {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "startsAt must be in the past")
	}
	return nil
}

func (cumulativeWindow *CumulativeWindow) EvaluationTime(curr time.Time) (time.Time, time.Time, error) {
	startsAt := time.UnixMilli(cumulativeWindow.StartsAt)
	if curr.Before(startsAt) {
		return time.Time{}, time.Time{}, errors.NewInvalidInputf(errors.CodeInvalidInput, "current time is before the start time")
	}

	dur := time.Duration(cumulativeWindow.EvalWindow)
	if dur <= 0 {
		return time.Time{}, time.Time{}, errors.NewInvalidInputf(errors.CodeInvalidInput, "duration cannot be less than zero")
	}

	// Calculate the number of complete windows since StartsAt
	elapsed := curr.Sub(startsAt)
	windows := int64(elapsed / dur)
	windowStart := startsAt.Add(time.Duration(windows) * dur)
	return windowStart, curr, nil
}

type EvaluationWrapper struct {
	Kind EvaluationKind `json:"kind"`
	Spec any            `json:"spec"`
}

func (e *EvaluationWrapper) UnmarshalJSON(data []byte) error {
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}
	if err := json.Unmarshal(raw["kind"], &e.Kind); err != nil {
		return err
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

func (e *EvaluationWrapper) GetEvaluation() (Evaluation, error) {
	if e.Kind.IsZero() {
		e.Kind = RollingEvaluation
	}

	switch e.Kind {
	case RollingEvaluation:
		if rolling, ok := e.Spec.(RollingWindow); ok {
			return &rolling, nil
		}
	case CumulativeEvaluation:
		if cumulative, ok := e.Spec.(CumulativeWindow); ok {
			return &cumulative, nil
		}
	default:
		return nil, errors.NewInvalidInputf(errors.CodeUnsupported, "unknown evaluation kind")
	}
	return nil, errors.NewInvalidInputf(errors.CodeUnsupported, "unknown evaluation kind")
}
