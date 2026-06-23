package dashboardtypes

import (
	"slices"
	"unicode/utf8"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/tagtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

const (
	DefaultListLimit = 20
	MaxListLimit     = 200
	MaxListQueryLen  = 1024
)

// ListSort is the sort field for the dashboard list endpoint. The value is a
// stable enum so callers can't ask for arbitrary columns.
type ListSort struct{ valuer.String }

var (
	ListSortUpdatedAt = ListSort{valuer.NewString("updated_at")}
	ListSortCreatedAt = ListSort{valuer.NewString("created_at")}
	ListSortName      = ListSort{valuer.NewString("name")}
)

func (ListSort) Enum() []any {
	return []any{ListSortUpdatedAt, ListSortCreatedAt, ListSortName}
}

func (s ListSort) IsValid() bool {
	return slices.ContainsFunc(s.Enum(), func(v any) bool { return v == s })
}

type ListOrder struct{ valuer.String }

var (
	ListOrderAsc  = ListOrder{valuer.NewString("asc")}
	ListOrderDesc = ListOrder{valuer.NewString("desc")}
)

func (ListOrder) Enum() []any {
	return []any{ListOrderAsc, ListOrderDesc}
}

func (o ListOrder) IsValid() bool {
	return slices.ContainsFunc(o.Enum(), func(v any) bool { return v == o })
}

var ErrCodeDashboardListInvalid = errors.MustNewCode("dashboard_list_invalid")

type ListFilter struct {
	Query string    `query:"query" json:"query"`
	Sort  ListSort  `query:"sort" json:"sort"`
	Order ListOrder `query:"order" json:"order"`
}

func (f *ListFilter) Validate() error {
	if n := utf8.RuneCountInString(f.Query); n > MaxListQueryLen {
		return errors.NewInvalidInputf(ErrCodeDashboardListInvalid,
			"query cannot be longer than %d characters, got %d", MaxListQueryLen, n)
	}
	if !f.Sort.IsZero() && !f.Sort.IsValid() {
		return errors.NewInvalidInputf(ErrCodeDashboardListInvalid,
			"invalid sort %q — expected one of: `updated_at`, `created_at`, `name`", f.Sort)
	}
	if !f.Order.IsZero() && !f.Order.IsValid() {
		return errors.NewInvalidInputf(ErrCodeDashboardListInvalid,
			"invalid order %q — expected `asc` or `desc`", f.Order)
	}
	return nil
}

type ListDashboardsV2Params struct {
	ListFilter
	Limit  int `query:"limit"`
	Offset int `query:"offset"`
}

func (p *ListDashboardsV2Params) Validate() error {
	if err := p.ListFilter.Validate(); err != nil {
		return err
	}

	if p.Sort.IsZero() {
		p.Sort = ListSortUpdatedAt
	}

	if p.Order.IsZero() {
		p.Order = ListOrderDesc
	}

	if p.Limit == 0 {
		p.Limit = DefaultListLimit
	} else if p.Limit < 0 {
		return errors.NewInvalidInputf(ErrCodeDashboardListInvalid,
			"invalid limit %d — must be a positive integer", p.Limit)
	} else if p.Limit > MaxListLimit {
		p.Limit = MaxListLimit
	}

	if p.Offset < 0 {
		return errors.NewInvalidInputf(ErrCodeDashboardListInvalid,
			"invalid offset %d — must be a non-negative integer", p.Offset)
	}

	return nil
}

type listedDashboardV2 struct {
	types.Identifiable
	types.TimeAuditable
	types.UserAuditable

	OrgID         valuer.UUID             `json:"orgId" required:"true"`
	Locked        bool                    `json:"locked" required:"true"`
	Source        Source                  `json:"source" required:"true"`
	SchemaVersion string                  `json:"schemaVersion" required:"true"`
	Name          string                  `json:"name" required:"true"`
	Image         string                  `json:"image,omitempty"`
	Tags          []*tagtypes.GettableTag `json:"tags" required:"true" nullable:"false"`
	Spec          listedDashboardV2Spec   `json:"spec" required:"true"`
}

type listedDashboardV2Spec struct {
	Display Display `json:"display,omitempty"`
}

func newListedDashboardV2(v2 *DashboardV2) *listedDashboardV2 {
	return &listedDashboardV2{
		Identifiable:  v2.Identifiable,
		TimeAuditable: v2.TimeAuditable,
		UserAuditable: v2.UserAuditable,
		OrgID:         v2.OrgID,
		Locked:        v2.Locked,
		Source:        v2.Source,
		SchemaVersion: v2.SchemaVersion,
		Name:          v2.Name,
		Image:         v2.Image,
		Tags:          tagtypes.NewGettableTagsFromTags(v2.Tags),
		Spec:          listedDashboardV2Spec{Display: v2.Spec.Display},
	}
}

type ListableDashboardV2 struct {
	Dashboards []*listedDashboardV2    `json:"dashboards" required:"true" nullable:"false"`
	Total      int64                   `json:"total" required:"true"`
	Tags       []*tagtypes.GettableTag `json:"tags" required:"true" nullable:"false"`
}

func NewListableDashboardV2(dashboards []*StorableDashboard, total int64, tagsByEntity map[valuer.UUID][]*tagtypes.Tag, allTags []*tagtypes.Tag) (*ListableDashboardV2, error) {
	items := make([]*listedDashboardV2, len(dashboards))
	for i, d := range dashboards {
		v2, err := d.ToDashboardV2(tagsByEntity[d.ID])
		if err != nil {
			return nil, err
		}
		items[i] = newListedDashboardV2(v2)
	}
	return &ListableDashboardV2{
		Dashboards: items,
		Total:      total,
		Tags:       tagtypes.NewGettableTagsFromTags(allTags),
	}, nil
}

// listedDashboardForUserV2 is a listed dashboard plus the calling user's pin
// state. Only the per-user list endpoint emits this; the pure list omits pins.
type listedDashboardForUserV2 struct {
	listedDashboardV2
	Pinned bool `json:"pinned" required:"true"`
}

type ListableDashboardForUserV2 struct {
	Dashboards []*listedDashboardForUserV2 `json:"dashboards" required:"true" nullable:"false"`
	Total      int64                       `json:"total" required:"true"`
	Tags       []*tagtypes.GettableTag     `json:"tags" required:"true" nullable:"false"`
}

// StorableDashboardWithPinInfo is the per-row shape Store.ListForUser returns: the dashboard
// joined with the calling user's pin state, so the module layer can attach tags
// and assemble the gettable view.
type StorableDashboardWithPinInfo struct {
	Dashboard *StorableDashboard
	Pinned    bool
}

func NewListableDashboardForUserV2(rows []*StorableDashboardWithPinInfo, total int64, tagsByEntity map[valuer.UUID][]*tagtypes.Tag, allTags []*tagtypes.Tag) (*ListableDashboardForUserV2, error) {
	items := make([]*listedDashboardForUserV2, len(rows))
	for i, r := range rows {
		v2, err := r.Dashboard.ToDashboardV2(tagsByEntity[r.Dashboard.ID])
		if err != nil {
			return nil, err
		}
		items[i] = &listedDashboardForUserV2{
			listedDashboardV2: *newListedDashboardV2(v2),
			Pinned:            r.Pinned,
		}
	}
	return &ListableDashboardForUserV2{
		Dashboards: items,
		Total:      total,
		Tags:       tagtypes.NewGettableTagsFromTags(allTags),
	}, nil
}
