package ruletypes

import (
	"encoding/json"
	"fmt"
	"time"
)

type EvaluationKind string

const (
	RollingEvaluation    EvaluationKind = "rolling"
	CumulativeEvaluation EvaluationKind = "cumulative"
)

type Evaluation interface {
	EvaluationTime(curr time.Time) (time.Time, time.Time, error)
}

type RollingWindow struct {
	EvalWindow Duration `json:"evalWindow"`
	Frequency  Duration `json:"frequency"`
}

func (rollingWindow *RollingWindow) EvaluationTime(curr time.Time) (time.Time, time.Time, error) {
	return curr.Add(time.Duration(-rollingWindow.EvalWindow)), curr, nil
}

type CumulativeWindow struct {
	StartsAt   int64    `json:"startsAt"`
	EvalWindow Duration `json:"evalWindow"`
}

func (cumulativeWindow *CumulativeWindow) EvaluationTime(curr time.Time) (time.Time, time.Time, error) {
	startsAt := time.UnixMilli(cumulativeWindow.StartsAt)
	if curr.Before(startsAt) {
		return time.Time{}, time.Time{}, fmt.Errorf("current time is before the start time")
	}

	dur := time.Duration(cumulativeWindow.EvalWindow)
	if dur <= 0 {
		return time.Time{}, time.Time{}, fmt.Errorf("duration cannot be less than zero")
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
			return fmt.Errorf("failed to unmarshal rolling evaluation: %v",
				err)
		}
		e.Spec = rollingWindow
	case CumulativeEvaluation:
		var cumulativeWindow CumulativeWindow
		if err := json.Unmarshal(raw["spec"], &cumulativeWindow); err != nil {
			return fmt.Errorf("failed to unmarshal cumulative evaluation: %v",
				err)
		}
		e.Spec = cumulativeWindow

	default:
		return fmt.Errorf("unsupported evaluation kind: %v", e.Kind)
	}

	return nil
}

func (wrapper *EvaluationWrapper) GetEvaluation() (Evaluation, error) {
	if wrapper.Kind == "" {
		wrapper.Kind = "rolling"
	}

	switch wrapper.Kind {
	case RollingEvaluation:
		if rolling, ok := wrapper.Spec.(RollingWindow); ok {
			return &rolling, nil
		}
	case CumulativeEvaluation:
		if cumulative, ok := wrapper.Spec.(CumulativeWindow); ok {
			return &cumulative, nil
		}
	default:
		return nil, fmt.Errorf("unsupported evaluation kind: %s", wrapper.Kind)
	}
	return nil, fmt.Errorf("unsupported evaluation kind: %s", wrapper.Kind)
}
