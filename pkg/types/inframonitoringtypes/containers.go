package inframonitoringtypes

import (
	"encoding/json"
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

type Containers struct {
	Type                   ResponseType           `json:"type" required:"true"`
	Records                []ContainerRecord      `json:"records" required:"true" nullable:"false"`
	Total                  int                    `json:"total" required:"true"`
	EndTimeBeforeRetention bool                   `json:"endTimeBeforeRetention" required:"true"`
	Warning                *qbtypes.QueryWarnData `json:"warning,omitempty"`
}

// ContainerCountsByStatus buckets container counts by their latest kubectl-style
// display status in the time window (see ContainerStatus). One field per
// derivable status. Populated in both list and grouped_list modes.
type ContainerCountsByStatus struct {
	// State fallback.
	Running    int `json:"running" required:"true"`
	Waiting    int `json:"waiting" required:"true"`
	Terminated int `json:"terminated" required:"true"`

	// Container-level reasons (k8s.container.status.reason allowlist).
	CrashLoopBackOff           int `json:"crashLoopBackOff" required:"true"`
	ImagePullBackOff           int `json:"imagePullBackOff" required:"true"`
	ErrImagePull               int `json:"errImagePull" required:"true"`
	CreateContainerConfigError int `json:"createContainerConfigError" required:"true"`
	ContainerCreating          int `json:"containerCreating" required:"true"`
	OOMKilled                  int `json:"oomKilled" required:"true"`
	Completed                  int `json:"completed" required:"true"`
	Error                      int `json:"error" required:"true"`
	ContainerCannotRun         int `json:"containerCannotRun" required:"true"`

	Unknown int `json:"unknown" required:"true"`
}

// ContainerCountsByReady buckets container counts by their latest readiness
// (k8s.container.ready) in the time window. Populated in both modes.
type ContainerCountsByReady struct {
	Ready    int `json:"ready" required:"true"`
	NotReady int `json:"notReady" required:"true"`
}

type ContainerRecord struct {
	// Row identity: (k8s.pod.uid, k8s.container.name). Stable across container
	// restarts (unlike container.id), globally unique, present on both receivers.
	PodUID        string `json:"podUID" required:"true"`
	ContainerName string `json:"containerName" required:"true"`

	// Health (k8sclusterreceiver). Single value in list mode; counts in grouped_list mode.
	Status                  ContainerStatus         `json:"status" required:"true"`
	ContainerCountsByStatus ContainerCountsByStatus `json:"containerCountsByStatus" required:"true"`
	Ready                   ContainerReady          `json:"ready" required:"true"`
	ContainerCountsByReady  ContainerCountsByReady  `json:"containerCountsByReady" required:"true"`
	// Absolute restart count: own count (list mode) or group sum (grouped mode). -1 when no data.
	Restarts int64 `json:"restarts" required:"true"`

	// Usage / utilization (kubeletstats). -1 when no data.
	CPU                      float64 `json:"cpu" required:"true"`                      // container.cpu.usage (cores)
	CPURequestUtilization    float64 `json:"cpuRequestUtilization" required:"true"`    // k8s.container.cpu_request_utilization
	CPULimitUtilization      float64 `json:"cpuLimitUtilization" required:"true"`      // k8s.container.cpu_limit_utilization
	Memory                   float64 `json:"memory" required:"true"`                   // container.memory.working_set
	MemoryRequestUtilization float64 `json:"memoryRequestUtilization" required:"true"` // k8s.container.memory_request_utilization
	MemoryLimitUtilization   float64 `json:"memoryLimitUtilization" required:"true"`   // k8s.container.memory_limit_utilization

	Meta map[string]string `json:"meta" required:"true"`
}

// PostableContainers is the request body for the v2 containers list API.
type PostableContainers struct {
	Start   int64                `json:"start" required:"true"`
	End     int64                `json:"end" required:"true"`
	Filter  *qbtypes.Filter      `json:"filter"`
	GroupBy []qbtypes.GroupByKey `json:"groupBy"`
	OrderBy *qbtypes.OrderBy     `json:"orderBy"`
	Offset  int                  `json:"offset"`
	Limit   int                  `json:"limit" required:"true"`
}

// Validate ensures PostableContainers contains acceptable values.
func (req *PostableContainers) Validate() error {
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
		if !slices.Contains(ContainersValidOrderByKeys, req.OrderBy.Key.Name) {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid order by key: %s", req.OrderBy.Key.Name)
		}
		if req.OrderBy.Direction != qbtypes.OrderDirectionAsc && req.OrderBy.Direction != qbtypes.OrderDirectionDesc {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid order by direction: %s", req.OrderBy.Direction)
		}
		if req.OrderBy.Key.Name == ContainerNameAttrKey && len(req.GroupBy) > 0 {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "order by '%s' is only allowed when groupBy is empty", ContainerNameAttrKey)
		}
	}

	return nil
}

// UnmarshalJSON validates input immediately after decoding.
func (req *PostableContainers) UnmarshalJSON(data []byte) error {
	type raw PostableContainers
	var decoded raw
	if err := json.Unmarshal(data, &decoded); err != nil {
		return err
	}
	*req = PostableContainers(decoded)
	return req.Validate()
}
