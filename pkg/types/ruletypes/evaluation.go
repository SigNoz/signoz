package ruletypes

import (
	"encoding/json"
	"fmt"
	"time"
)

type Evaluation interface {
	EvaluationTime(curr time.Time) (time.Time, time.Time)
}

type RollingWindow struct {
	EvalWindow Duration `json:"evalWindow"`
	Frequency  Duration `json:"frequency"`
}

func (rollingWindow *RollingWindow) EvaluationTime(curr time.Time) (time.Time, time.Time) {
	return curr.Add(time.Duration(-rollingWindow.EvalWindow)), curr
}

type CumulativeWindow struct {
	StartsAt   int64    `json:"startsAt"`
	EvalWindow Duration `json:"evalWindow"`
}

func (cumulativeWindow *CumulativeWindow) EvaluationTime(curr time.Time) (time.Time, time.Time) {
	startsAt := time.UnixMilli(cumulativeWindow.StartsAt)
	if curr.Before(startsAt) {
		return curr, curr
	}

	dur := time.Duration(cumulativeWindow.EvalWindow)
	if dur <= 0 {
		return curr, curr
	}

	// Calculate the number of complete windows since StartsAt
	elapsed := curr.Sub(startsAt)
	windows := int64(elapsed / dur)
	windowStart := startsAt.Add(time.Duration(windows) * dur)
	return windowStart, curr
}

type EvaluationWrapper struct {
	Kind string          `json:"kind"`
	Spec json.RawMessage `json:"spec"`
}

func (wrapper *EvaluationWrapper) UnmarshalEvaluationJSON(data []byte) (Evaluation, error) {
	if err := json.Unmarshal(data, &wrapper); err != nil {
		return nil, fmt.Errorf("failed to unmarshal evaluation wrapper: %w", err)
	}

	if wrapper.Kind == "" {
		wrapper.Kind = "rolling"
	}

	switch wrapper.Kind {
	case "rolling":
		var rolling RollingWindow
		if err := json.Unmarshal(wrapper.Spec, &rolling); err != nil {
			return nil, fmt.Errorf("failed to unmarshal rolling window: %w", err)
		}
		return &rolling, nil
	case "cumulative":
		var cumulative CumulativeWindow
		if err := json.Unmarshal(wrapper.Spec, &cumulative); err != nil {
			return nil, fmt.Errorf("failed to unmarshal cumulative window: %w", err)
		}
		return &cumulative, nil
	default:
		return nil, fmt.Errorf("unsupported evaluation kind: %s", wrapper.Kind)
	}
}
