package dashboardtypes

import (
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/tagtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/perses/perses/pkg/model/api/v1/common"
)

const (
	DefaultListLimit = 20
	MaxListLimit     = 200
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

type ListDashboardsV2Params struct {
	Query  string    `query:"query"`
	Sort   ListSort  `query:"sort"`
	Order  ListOrder `query:"order"`
	Limit  int       `query:"limit"`
	Offset int       `query:"offset"`
}

// Validate fills in defaults (sort=updated_at, order=desc, limit=20) and
// rejects out-of-allowlist sort/order values and bad limit/offset. Limit is
// clamped to MaxListLimit on the high side. Sort/order are case-insensitive —
// valuer.String lowercases them at bind time.
func (p *ListDashboardsV2Params) Validate() error {
	if p.Sort.IsZero() {
		p.Sort = ListSortUpdatedAt
	} else if !p.Sort.IsValid() {
		return errors.NewInvalidInputf(ErrCodeDashboardListInvalid,
			"invalid sort %q — expected one of: `updated_at`, `created_at`, `name`", p.Sort)
	}

	if p.Order.IsZero() {
		p.Order = ListOrderDesc
	} else if !p.Order.IsValid() {
		return errors.NewInvalidInputf(ErrCodeDashboardListInvalid,
			"invalid order %q — expected `asc` or `desc`", p.Order)
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
	Pinned        bool                    `json:"pinned" required:"true"`
	Tags          []*tagtypes.GettableTag `json:"tags" required:"true" nullable:"false"`
	Spec          listedDashboardV2Spec   `json:"spec" required:"true"`
}

type listedDashboardV2Spec struct {
	Display *common.Display `json:"display,omitempty"`
}

type ListableDashboardV2 struct {
	Dashboards []*listedDashboardV2 `json:"dashboards" required:"true" nullable:"false"`
	Total      int64                `json:"total" required:"true"`
}

// DashboardListRow is the per-row shape Store.ListV2 returns. Bundles the
// joined dashboard / pinned_dashboard data so the module layer can attach
// tags and assemble the gettable view.
type DashboardListRow struct {
	Dashboard *StorableDashboard
	Pinned    bool
}

func NewListableDashboardV2(rows []*DashboardListRow, total int64, tagsByEntity map[valuer.UUID][]*tagtypes.Tag) (*ListableDashboardV2, error) {
	dashboards := make([]*listedDashboardV2, len(rows))
	for i, r := range rows {
		v2, err := r.Dashboard.ToDashboardV2(tagsByEntity[r.Dashboard.ID])
		if err != nil {
			return nil, err
		}

		dashboards[i] = &listedDashboardV2{
			Identifiable:  v2.Identifiable,
			TimeAuditable: v2.TimeAuditable,
			UserAuditable: v2.UserAuditable,
			OrgID:         v2.OrgID,
			Locked:        v2.Locked,
			Source:        v2.Source,
			SchemaVersion: v2.SchemaVersion,
			Name:          v2.Name,
			Pinned:        r.Pinned,
			Tags:          tagtypes.NewGettableTagsFromTags(v2.Tags),
			Spec:          listedDashboardV2Spec{Display: v2.Spec.Display},
		}
	}
	return &ListableDashboardV2{
		Dashboards: dashboards,
		Total:      total,
	}, nil
}
