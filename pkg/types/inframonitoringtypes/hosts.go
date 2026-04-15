package inframonitoringtypes

import (
	"encoding/json"
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type HostStatus struct {
	valuer.String
}

var (
	HostStatusActive   = HostStatus{valuer.NewString("active")}
	HostStatusInactive = HostStatus{valuer.NewString("inactive")}
	HostStatusNone     = HostStatus{valuer.NewString("")}
)

func (HostStatus) Enum() []any {
	return []any{
		HostStatusActive,
		HostStatusInactive,
		HostStatusNone,
	}
}

const (
	HostsOrderByCPU       = "cpu"
	HostsOrderByMemory    = "memory"
	HostsOrderByWait      = "wait"
	HostsOrderByDiskUsage = "disk_usage"
	HostsOrderByLoad15    = "load15"
)

var HostsValidOrderByKeys = []string{
	HostsOrderByCPU,
	HostsOrderByMemory,
	HostsOrderByWait,
	HostsOrderByDiskUsage,
	HostsOrderByLoad15,
}

type HostFilter struct {
	qbtypes.Filter `json:",inline"`
	FilterByStatus HostStatus `json:"filterByStatus"`
}

type HostsListRequest struct {
	Start   int64                `json:"start"`
	End     int64                `json:"end"`
	Filter  *HostFilter          `json:"filter"`
	GroupBy []qbtypes.GroupByKey `json:"groupBy"`
	OrderBy *qbtypes.OrderBy     `json:"orderBy"`
	Offset  int                  `json:"offset"`
	Limit   int                  `json:"limit"`
}

// Validate ensures HostsListRequest contains acceptable values.
func (req *HostsListRequest) Validate() error {
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

	if req.Filter != nil && !req.Filter.FilterByStatus.IsZero() &&
		req.Filter.FilterByStatus != HostStatusActive && req.Filter.FilterByStatus != HostStatusInactive {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid filter by status: %s", req.Filter.FilterByStatus)
	}

	if req.OrderBy != nil {
		if !slices.Contains(HostsValidOrderByKeys, req.OrderBy.Key.Name) {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid order by key: %s", req.OrderBy.Key.Name)
		}
		if req.OrderBy.Direction != qbtypes.OrderDirectionAsc && req.OrderBy.Direction != qbtypes.OrderDirectionDesc {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid order by direction: %s", req.OrderBy.Direction)
		}
	}

	return nil
}

// UnmarshalJSON validates input immediately after decoding.
func (req *HostsListRequest) UnmarshalJSON(data []byte) error {
	type raw HostsListRequest
	var decoded raw
	if err := json.Unmarshal(data, &decoded); err != nil {
		return err
	}
	*req = HostsListRequest(decoded)
	return req.Validate()
}

type RequiredMetricsCheck struct {
	MissingMetrics []string `json:"missingMetrics"`
}

type HostsListResponse struct {
	Type                   ResponseType           `json:"type"`
	Records                []HostRecord           `json:"records"`
	Total                  int                    `json:"total"`
	RequiredMetricsCheck   RequiredMetricsCheck   `json:"requiredMetricsCheck"`
	EndTimeBeforeRetention bool                   `json:"endTimeBeforeRetention"`
	Warning                *qbtypes.QueryWarnData `json:"warning,omitempty"`
}

type HostRecord struct {
	HostName          string                 `json:"hostName"`
	Status            HostStatus             `json:"status"`
	ActiveHostCount   int                    `json:"activeHostCount"`
	InactiveHostCount int                    `json:"inactiveHostCount"`
	CPU               float64                `json:"cpu"`
	Memory            float64                `json:"memory"`
	Wait              float64                `json:"wait"`
	Load15            float64                `json:"load15"`
	DiskUsage         float64                `json:"diskUsage"`
	Meta              map[string]interface{} `json:"meta"`
}
