package inframonitoringtypes

import (
	"encoding/json"
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"

	"github.com/swaggest/jsonschema-go"
)

type Hosts struct {
	Type                   ResponseType           `json:"type" required:"true"`
	Records                []HostRecord           `json:"records" required:"true" nullable:"false"`
	Total                  int                    `json:"total" required:"true"`
	EndTimeBeforeRetention bool                   `json:"endTimeBeforeRetention" required:"true"`
	Warning                *qbtypes.QueryWarnData `json:"warning,omitempty"`
}

type HostRecord struct {
	HostName          string     `json:"hostName" required:"true"`
	Status            HostStatus `json:"status" required:"true"`
	ActiveHostCount   int        `json:"activeHostCount" required:"true"`
	InactiveHostCount int        `json:"inactiveHostCount" required:"true"`
	CPU               float64    `json:"cpu" required:"true"`
	Memory            float64    `json:"memory" required:"true"`
	Wait              float64    `json:"wait" required:"true"`
	Load15            float64    `json:"load15" required:"true"`
	DiskUsage         float64    `json:"diskUsage" required:"true"`
	Meta              HostMeta   `json:"meta" required:"true"`
}

type PostableHosts struct {
	Start   int64                `json:"start" required:"true"`
	End     int64                `json:"end" required:"true"`
	Filter  *HostFilter          `json:"filter"`
	GroupBy []qbtypes.GroupByKey `json:"groupBy"`
	OrderBy *qbtypes.OrderBy     `json:"orderBy"`
	Offset  int                  `json:"offset"`
	Limit   int                  `json:"limit" required:"true"`
}

type HostFilter struct {
	qbtypes.Filter `json:",inline"`
	FilterByStatus HostStatus `json:"filterByStatus"`
}

// Validate ensures PostableHosts contains acceptable values.
func (req *PostableHosts) Validate() error {
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
		if req.OrderBy.Key.Name == HostNameAttrKey && len(req.GroupBy) > 0 {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "order by '%s' is only allowed when groupBy is empty", HostNameAttrKey)
		}
	}

	return nil
}

// UnmarshalJSON validates input immediately after decoding.
func (req *PostableHosts) UnmarshalJSON(data []byte) error {
	type raw PostableHosts
	var decoded raw
	if err := json.Unmarshal(data, &decoded); err != nil {
		return err
	}
	*req = PostableHosts(decoded)
	return req.Validate()
}

// HostMeta carries the guaranteed host metadata keys as typed fields plus any
// dynamic group-by keys in Extra.
type HostMeta struct {
	OSType   string            `json:"os.type" required:"true"`
	HostName string            `json:"host.name" required:"true"`
	Extra    map[string]string `json:"-"`
}

var HostMetaKeys = getMetaKeys(&HostMeta{})

func NewHostMeta(attrs map[string]string) HostMeta {
	var m HostMeta
	m.Extra = populateMeta(&m, attrs)
	return m
}

func (m HostMeta) MarshalJSON() ([]byte, error) {
	return marshalMeta(&m, m.Extra)
}

func (m *HostMeta) UnmarshalJSON(data []byte) error {
	raw, err := splitMeta(data)
	if err != nil {
		return err
	}
	m.Extra = populateMeta(m, raw)
	return nil
}

func (HostMeta) PrepareJSONSchema(s *jsonschema.Schema) error {
	addStringAdditionalProps(s)
	return nil
}
