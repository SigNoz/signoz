package inframonitoringtypes

import (
	"encoding/json"
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

type Jobs struct {
	Type                   ResponseType           `json:"type" required:"true"`
	Records                []JobRecord            `json:"records" required:"true"`
	Total                  int                    `json:"total" required:"true"`
	RequiredMetricsCheck   RequiredMetricsCheck   `json:"requiredMetricsCheck" required:"true"`
	EndTimeBeforeRetention bool                   `json:"endTimeBeforeRetention" required:"true"`
	Warning                *qbtypes.QueryWarnData `json:"warning,omitempty"`
}

type JobRecord struct {
	JobName               string            `json:"jobName" required:"true"`
	JobCPU                float64           `json:"jobCPU" required:"true"`
	JobCPURequest         float64           `json:"jobCPURequest" required:"true"`
	JobCPULimit           float64           `json:"jobCPULimit" required:"true"`
	JobMemory             float64           `json:"jobMemory" required:"true"`
	JobMemoryRequest      float64           `json:"jobMemoryRequest" required:"true"`
	JobMemoryLimit        float64           `json:"jobMemoryLimit" required:"true"`
	DesiredSuccessfulPods int               `json:"desiredSuccessfulPods" required:"true"`
	ActivePods            int               `json:"activePods" required:"true"`
	FailedPods            int               `json:"failedPods" required:"true"`
	SuccessfulPods        int               `json:"successfulPods" required:"true"`
	PodCountsByPhase      PodCountsByPhase  `json:"podCountsByPhase" required:"true"`
	Meta                  map[string]string `json:"meta" required:"true"`
}

// PostableJobs is the request body for the v2 jobs list API.
type PostableJobs struct {
	Start   int64                `json:"start" required:"true"`
	End     int64                `json:"end" required:"true"`
	Filter  *qbtypes.Filter      `json:"filter"`
	GroupBy []qbtypes.GroupByKey `json:"groupBy"`
	OrderBy *qbtypes.OrderBy     `json:"orderBy"`
	Offset  int                  `json:"offset"`
	Limit   int                  `json:"limit" required:"true"`
}

// Validate ensures PostableJobs contains acceptable values.
func (req *PostableJobs) Validate() error {
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
		if !slices.Contains(JobsValidOrderByKeys, req.OrderBy.Key.Name) {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid order by key: %s", req.OrderBy.Key.Name)
		}
		if req.OrderBy.Direction != qbtypes.OrderDirectionAsc && req.OrderBy.Direction != qbtypes.OrderDirectionDesc {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid order by direction: %s", req.OrderBy.Direction)
		}
	}

	return nil
}

// UnmarshalJSON validates input immediately after decoding.
func (req *PostableJobs) UnmarshalJSON(data []byte) error {
	type raw PostableJobs
	var decoded raw
	if err := json.Unmarshal(data, &decoded); err != nil {
		return err
	}
	*req = PostableJobs(decoded)
	return req.Validate()
}
