package dashboardtypes

import (
	"strings"

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
type ListSort string

const (
	ListSortUpdatedAt ListSort = "updated_at"
	ListSortCreatedAt ListSort = "created_at"
	ListSortName      ListSort = "name"
)

type ListOrder string

const (
	ListOrderAsc  ListOrder = "asc"
	ListOrderDesc ListOrder = "desc"
)

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
// clamped to MaxListLimit on the high side. Lowercases sort/order so callers
// can pass them in any case.
func (p *ListDashboardsV2Params) Validate() error {
	if p.Sort == "" {
		p.Sort = ListSortUpdatedAt
	} else {
		p.Sort = ListSort(strings.ToLower(string(p.Sort)))
		switch p.Sort {
		case ListSortUpdatedAt, ListSortCreatedAt, ListSortName:
		default:
			return errors.NewInvalidInputf(ErrCodeDashboardListInvalid,
				"invalid sort %q — expected one of: updated_at, created_at, name", p.Sort)
		}
	}

	if p.Order == "" {
		p.Order = ListOrderDesc
	} else {
		p.Order = ListOrder(strings.ToLower(string(p.Order)))
		switch p.Order {
		case ListOrderAsc, ListOrderDesc:
		default:
			return errors.NewInvalidInputf(ErrCodeDashboardListInvalid,
				"invalid order %q — expected asc or desc", p.Order)
		}
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
// joined dashboard / public_dashboard / pinned_dashboard data so the module
// layer can attach tags and assemble the gettable view.
type DashboardListRow struct {
	Dashboard *StorableDashboard
	Public    *StorablePublicDashboard // nil if no public_dashboard row exists
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
