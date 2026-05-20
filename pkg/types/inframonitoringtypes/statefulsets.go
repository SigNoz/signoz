package inframonitoringtypes

import (
	"encoding/json"
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

type StatefulSets struct {
	Type                   ResponseType           `json:"type" required:"true"`
	Records                []StatefulSetRecord    `json:"records" required:"true"`
	Total                  int                    `json:"total" required:"true"`
	RequiredMetricsCheck   RequiredMetricsCheck   `json:"requiredMetricsCheck" required:"true"`
	EndTimeBeforeRetention bool                   `json:"endTimeBeforeRetention" required:"true"`
	Warning                *qbtypes.QueryWarnData `json:"warning,omitempty"`
}

type StatefulSetRecord struct {
	StatefulSetName          string            `json:"statefulSetName" required:"true"`
	StatefulSetCPU           float64           `json:"statefulSetCPU" required:"true"`
	StatefulSetCPURequest    float64           `json:"statefulSetCPURequest" required:"true"`
	StatefulSetCPULimit      float64           `json:"statefulSetCPULimit" required:"true"`
	StatefulSetMemory        float64           `json:"statefulSetMemory" required:"true"`
	StatefulSetMemoryRequest float64           `json:"statefulSetMemoryRequest" required:"true"`
	StatefulSetMemoryLimit   float64           `json:"statefulSetMemoryLimit" required:"true"`
	DesiredPods              int               `json:"desiredPods" required:"true"`
	CurrentPods              int               `json:"currentPods" required:"true"`
	PodCountsByPhase         PodCountsByPhase  `json:"podCountsByPhase" required:"true"`
	Meta                     map[string]string `json:"meta" required:"true"`
}

// PostableStatefulSets is the request body for the v2 statefulsets list API.
type PostableStatefulSets struct {
	Start   int64                `json:"start" required:"true"`
	End     int64                `json:"end" required:"true"`
	Filter  *qbtypes.Filter      `json:"filter"`
	GroupBy []qbtypes.GroupByKey `json:"groupBy"`
	OrderBy *qbtypes.OrderBy     `json:"orderBy"`
	Offset  int                  `json:"offset"`
	Limit   int                  `json:"limit" required:"true"`
}

// Validate ensures PostableStatefulSets contains acceptable values.
func (req *PostableStatefulSets) Validate() error {
	if req == nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "request is nil")
	}

	if req.Start <= 0 {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"invalid start time %d: start must be greater than 0",
			req.Start,
		)
	}

	if req.End <= 0 {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"invalid end time %d: end must be greater than 0",
			req.End,
		)
	}

	if req.Start >= req.End {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"invalid time range: start (%d) must be less than end (%d)",
			req.Start,
			req.End,
		)
	}

	if req.Limit < 1 || req.Limit > 5000 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "limit must be between 1 and 5000")
	}

	if req.Offset < 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "offset cannot be negative")
	}

	if req.OrderBy != nil {
		if !slices.Contains(StatefulSetsValidOrderByKeys, req.OrderBy.Key.Name) {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid order by key: %s", req.OrderBy.Key.Name)
		}
		if req.OrderBy.Direction != qbtypes.OrderDirectionAsc && req.OrderBy.Direction != qbtypes.OrderDirectionDesc {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid order by direction: %s", req.OrderBy.Direction)
		}
	}

	return nil
}

// UnmarshalJSON validates input immediately after decoding.
func (req *PostableStatefulSets) UnmarshalJSON(data []byte) error {
	type raw PostableStatefulSets
	var decoded raw
	if err := json.Unmarshal(data, &decoded); err != nil {
		return err
	}
	*req = PostableStatefulSets(decoded)
	return req.Validate()
}
