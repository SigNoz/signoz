package inframonitoringtypes

import (
	"encoding/json"
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

type Deployments struct {
	Type                   ResponseType           `json:"type" required:"true"`
	Records                []DeploymentRecord     `json:"records" required:"true"`
	Total                  int                    `json:"total" required:"true"`
	RequiredMetricsCheck   RequiredMetricsCheck   `json:"requiredMetricsCheck" required:"true"`
	EndTimeBeforeRetention bool                   `json:"endTimeBeforeRetention" required:"true"`
	Warning                *qbtypes.QueryWarnData `json:"warning,omitempty"`
}

type DeploymentRecord struct {
	DeploymentName          string            `json:"deploymentName" required:"true"`
	DeploymentCPU           float64           `json:"deploymentCPU" required:"true"`
	DeploymentCPURequest    float64           `json:"deploymentCPURequest" required:"true"`
	DeploymentCPULimit      float64           `json:"deploymentCPULimit" required:"true"`
	DeploymentMemory        float64           `json:"deploymentMemory" required:"true"`
	DeploymentMemoryRequest float64           `json:"deploymentMemoryRequest" required:"true"`
	DeploymentMemoryLimit   float64           `json:"deploymentMemoryLimit" required:"true"`
	DesiredPods             int               `json:"desiredPods" required:"true"`
	AvailablePods           int               `json:"availablePods" required:"true"`
	PodCountsByPhase        PodCountsByPhase  `json:"podCountsByPhase" required:"true"`
	Meta                    map[string]string `json:"meta" required:"true"`
}

// PostableDeployments is the request body for the v2 deployments list API.
type PostableDeployments struct {
	Start   int64                `json:"start" required:"true"`
	End     int64                `json:"end" required:"true"`
	Filter  *qbtypes.Filter      `json:"filter"`
	GroupBy []qbtypes.GroupByKey `json:"groupBy"`
	OrderBy *qbtypes.OrderBy     `json:"orderBy"`
	Offset  int                  `json:"offset"`
	Limit   int                  `json:"limit" required:"true"`
}

// Validate ensures PostableDeployments contains acceptable values.
func (req *PostableDeployments) Validate() error {
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
		if !slices.Contains(DeploymentsValidOrderByKeys, req.OrderBy.Key.Name) {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid order by key: %s", req.OrderBy.Key.Name)
		}
		if req.OrderBy.Direction != qbtypes.OrderDirectionAsc && req.OrderBy.Direction != qbtypes.OrderDirectionDesc {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid order by direction: %s", req.OrderBy.Direction)
		}
	}

	return nil
}

// UnmarshalJSON validates input immediately after decoding.
func (req *PostableDeployments) UnmarshalJSON(data []byte) error {
	type raw PostableDeployments
	var decoded raw
	if err := json.Unmarshal(data, &decoded); err != nil {
		return err
	}
	*req = PostableDeployments(decoded)
	return req.Validate()
}
