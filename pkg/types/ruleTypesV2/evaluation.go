package ruletypesv2

import (
	"encoding/json"
	"fmt"
	"time"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
)

type Evaluation interface {
	EvaluationTime(curr time.Time) (time.Time, time.Time)
	json.Marshaler
}

func (r *RollingWindow) MarshalJSON() ([]byte, error) {
	wrapper := evaluationWrapper{
		Kind: "rolling",
	}
	spec, err := json.Marshal(*r)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal rolling window: %w", err)
	}
	wrapper.Spec = spec
	return json.Marshal(wrapper)
}

func (c *CumulativeWindow) MarshalJSON() ([]byte, error) {
	wrapper := evaluationWrapper{
		Kind: "cumulative",
	}
	spec, err := json.Marshal(*c)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal cumulative window: %w", err)
	}
	wrapper.Spec = spec
	return json.Marshal(wrapper)
}

type RollingWindow struct {
	EvalWindow           Duration          `json:"evalWindow"`
	Frequency            Duration          `json:"frequency"`
	RequireMinPoints     bool              `json:"requireMinPoints"`
	RequiredNumPoints    int               `json:"requiredNumPoints"`
	SkipEvalForNewGroups []v3.AttributeKey `json:"skipEvalForNewGroups"`
}

func (rollingWindow *RollingWindow) EvaluationTime(curr time.Time) (time.Time, time.Time) {
	return curr.Add(time.Duration(-rollingWindow.EvalWindow)), curr
}

type CumulativeWindow struct {
	StartsAt             time.Time         `json:"startsAt"`
	EvalWindow           Duration          `json:"evalWindow"`
	RequireMinPoints     bool              `json:"requireMinPoints"`
	RequiredNumPoints    int               `json:"requiredNumPoints"`
	SkipEvalForNewGroups []v3.AttributeKey `json:"skipEvalForNewGroups"`
}

func (cumulativeWindow *CumulativeWindow) EvaluationTime(curr time.Time) (time.Time, time.Time) {
	if curr.Before(cumulativeWindow.StartsAt) {
		return curr, curr
	}

	dur := time.Duration(cumulativeWindow.EvalWindow)
	if dur <= 0 {
		return curr, curr
	}

	// Calculate the number of complete windows since StartsAt
	elapsed := curr.Sub(cumulativeWindow.StartsAt)
	windows := int64(elapsed / dur)
	windowStart := cumulativeWindow.StartsAt.Add(time.Duration(windows) * dur)
	return windowStart, curr
}

func NewEvaluation(evalType string, params interface{}) Evaluation {
	switch evalType {
	case "rolling":
		p, ok := params.(RollingWindow)
		if !ok {
			return nil
		}
		return &p
	case "cumulative":
		p, ok := params.(CumulativeWindow)
		if !ok {
			return nil
		}
		return &p
	default:
		return nil
	}
}

type evaluationWrapper struct {
	Kind string          `json:"kind"`
	Spec json.RawMessage `json:"spec"`
}

func UnmarshalEvaluationJSON(data []byte) (Evaluation, error) {
	var wrapper evaluationWrapper
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

// Duration type - need to import/define this as well
type Duration time.Duration

func (d Duration) MarshalJSON() ([]byte, error) {
	return json.Marshal(time.Duration(d).String())
}

func (d *Duration) UnmarshalJSON(data []byte) error {
	var s string
	if err := json.Unmarshal(data, &s); err != nil {
		return err
	}
	
	duration, err := time.ParseDuration(s)
	if err != nil {
		return err
	}
	
	*d = Duration(duration)
	return nil
}