package inframonitoringtypes

import (
	"encoding/json"
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

type Nodes struct {
	Type                   ResponseType           `json:"type" required:"true"`
	Records                []NodeRecord           `json:"records" required:"true"`
	Total                  int                    `json:"total" required:"true"`
	RequiredMetricsCheck   RequiredMetricsCheck   `json:"requiredMetricsCheck" required:"true"`
	EndTimeBeforeRetention bool                   `json:"endTimeBeforeRetention" required:"true"`
	Warning                *qbtypes.QueryWarnData `json:"warning,omitempty"`
}

// NodeCountsByReadiness buckets node counts by their latest k8s.node.condition_ready
// value in the time window. Reusable across record types (node / cluster).
type NodeCountsByReadiness struct {
	Ready    int `json:"ready" required:"true"`
	NotReady int `json:"notReady" required:"true"`
}

type NodeRecord struct {
	NodeName              string                `json:"nodeName" required:"true"`
	Condition             NodeCondition         `json:"condition" required:"true"`
	NodeCountsByReadiness NodeCountsByReadiness `json:"nodeCountsByReadiness" required:"true"`
	PodCountsByPhase      PodCountsByPhase      `json:"podCountsByPhase" required:"true"`
	NodeCPU               float64               `json:"nodeCPU" required:"true"`
	NodeCPUAllocatable    float64               `json:"nodeCPUAllocatable" required:"true"`
	NodeMemory            float64               `json:"nodeMemory" required:"true"`
	NodeMemoryAllocatable float64               `json:"nodeMemoryAllocatable" required:"true"`
	Meta                  map[string]string     `json:"meta" required:"true"`
}

// PostableNodes is the request body for the v2 nodes list API.
type PostableNodes struct {
	Start   int64                `json:"start" required:"true"`
	End     int64                `json:"end" required:"true"`
	Filter  *qbtypes.Filter      `json:"filter"`
	GroupBy []qbtypes.GroupByKey `json:"groupBy"`
	OrderBy *qbtypes.OrderBy     `json:"orderBy"`
	Offset  int                  `json:"offset"`
	Limit   int                  `json:"limit" required:"true"`
}

// Validate ensures PostableNodes contains acceptable values.
func (req *PostableNodes) Validate() error {
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
		if !slices.Contains(NodesValidOrderByKeys, req.OrderBy.Key.Name) {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid order by key: %s", req.OrderBy.Key.Name)
		}
		if req.OrderBy.Direction != qbtypes.OrderDirectionAsc && req.OrderBy.Direction != qbtypes.OrderDirectionDesc {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid order by direction: %s", req.OrderBy.Direction)
		}
	}

	return nil
}

// UnmarshalJSON validates input immediately after decoding.
func (req *PostableNodes) UnmarshalJSON(data []byte) error {
	type raw PostableNodes
	var decoded raw
	if err := json.Unmarshal(data, &decoded); err != nil {
		return err
	}
	*req = PostableNodes(decoded)
	return req.Validate()
}
