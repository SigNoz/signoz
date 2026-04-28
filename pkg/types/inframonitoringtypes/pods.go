package inframonitoringtypes

import (
	"encoding/json"
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

type Pods struct {
	Type                   ResponseType           `json:"type" required:"true"`
	Records                []PodRecord            `json:"records" required:"true"`
	Total                  int                    `json:"total" required:"true"`
	RequiredMetricsCheck   RequiredMetricsCheck   `json:"requiredMetricsCheck" required:"true"`
	EndTimeBeforeRetention bool                   `json:"endTimeBeforeRetention" required:"true"`
	Warning                *qbtypes.QueryWarnData `json:"warning,omitempty"`
}

type PodRecord struct {
	PodUID            string                 `json:"podUID" required:"true"`
	PodCPU            float64                `json:"podCPU" required:"true"`
	PodCPURequest     float64                `json:"podCPURequest" required:"true"`
	PodCPULimit       float64                `json:"podCPULimit" required:"true"`
	PodMemory         float64                `json:"podMemory" required:"true"`
	PodMemoryRequest  float64                `json:"podMemoryRequest" required:"true"`
	PodMemoryLimit    float64                `json:"podMemoryLimit" required:"true"`
	PodPhase          PodPhase               `json:"podPhase" required:"true"`
	PendingPodCount   int                    `json:"pendingPodCount" required:"true"`
	RunningPodCount   int                    `json:"runningPodCount" required:"true"`
	SucceededPodCount int                    `json:"succeededPodCount" required:"true"`
	FailedPodCount    int                    `json:"failedPodCount" required:"true"`
	UnknownPodCount   int                    `json:"unknownPodCount" required:"true"`
	PodAge            int64                  `json:"podAge" required:"true"`
	Meta              map[string]interface{} `json:"meta" required:"true"`
}

// PostablePods is the request body for the v2 pods list API.
type PostablePods struct {
	Start   int64                `json:"start" required:"true"`
	End     int64                `json:"end" required:"true"`
	Filter  *qbtypes.Filter      `json:"filter"`
	GroupBy []qbtypes.GroupByKey `json:"groupBy"`
	OrderBy *qbtypes.OrderBy     `json:"orderBy"`
	Offset  int                  `json:"offset"`
	Limit   int                  `json:"limit" required:"true"`
}

// Validate ensures PostablePods contains acceptable values.
func (req *PostablePods) Validate() error {
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
		if !slices.Contains(PodsValidOrderByKeys, req.OrderBy.Key.Name) {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid order by key: %s", req.OrderBy.Key.Name)
		}
		if req.OrderBy.Direction != qbtypes.OrderDirectionAsc && req.OrderBy.Direction != qbtypes.OrderDirectionDesc {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid order by direction: %s", req.OrderBy.Direction)
		}
	}

	return nil
}

// UnmarshalJSON validates input immediately after decoding.
func (req *PostablePods) UnmarshalJSON(data []byte) error {
	type raw PostablePods
	var decoded raw
	if err := json.Unmarshal(data, &decoded); err != nil {
		return err
	}
	*req = PostablePods(decoded)
	return req.Validate()
}
