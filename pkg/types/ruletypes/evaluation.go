package ruletypes

import (
	"time"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
)

type Evaluation interface {
	EvaluationTime(curr time.Time) (time.Time, time.Time)
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
