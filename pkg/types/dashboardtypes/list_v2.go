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
	Query string    `query:"query" json:"query" description:"A filter expression over the reserved keys name, description, created_at, updated_at, created_by and locked, and over tag keys, using the SigNoz filter grammar: comparisons such as =, !=, CONTAINS, LIKE, IN, < and >, single-quoted strings, RFC3339 timestamps in quotes for created_at and updated_at, combined with AND, OR and NOT, for example name CONTAINS 'overview' AND created_at >= '2026-10-21T00:00:00Z'. At most 1024 characters. Empty matches every dashboard."`
	Sort  ListSort  `query:"sort" json:"sort" description:"The sort field: updated_at (default), created_at or name."`
	Order ListOrder `query:"order" json:"order" description:"The sort direction: asc or desc (default)."`
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
	Limit  int `query:"limit" description:"The page size. Defaults to 20 and is capped at 200."`
	Offset int `query:"offset" description:"The number of dashboards to skip. Defaults to 0."`
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

	OrgID         valuer.UUID             `json:"orgId" required:"true" description:"The organization that owns the dashboard."`
	Locked        bool                    `json:"locked" required:"true" description:"Whether the dashboard is locked against update and patch."`
	Source        Source                  `json:"source" required:"true" description:"Where the dashboard came from: user or integration. System dashboards are not listed."`
	SchemaVersion string                  `json:"schemaVersion" required:"true" description:"The dashboard schema version, v6 for v2 dashboards."`
	Name          string                  `json:"name" required:"true" description:"The dashboard's unique, immutable name."`
	Image         string                  `json:"image,omitempty" description:"Icon or logo shown in the dashboard list: the path of an icon or logo bundled with the UI under /assets/Icons/ or /assets/Logos/, or a base64 image data URI. Omitted when none is set."`
	Tags          []*tagtypes.GettableTag `json:"tags" required:"true" nullable:"false" description:"The tags attached to the dashboard."`
	Spec          listedDashboardV2Spec   `json:"spec" required:"true" description:"The display part of the dashboard spec. Panels, variables and layouts are not included in list rows."`
	// Legacy marks a dashboard whose stored data is not yet in the v2 (perses)
	// schema. Such rows are extracted best-effort from the v1 shape so the list
	// still surfaces them; callers should route them to the legacy view.
	Legacy bool `json:"legacy" required:"true" description:"Whether the dashboard is still in the v1 schema. It is listed but cannot be fetched or edited through the v2 endpoints."`
}

type listedDashboardV2Spec struct {
	Display Display `json:"display,omitempty" description:"The dashboard name and description."`
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

// newListedDashboardForList builds the list view for a single dashboard. A row
// whose stored data is not in the v2 (perses) schema is extracted best-effort
// from the v1 shape and flagged Legacy, so one legacy or malformed dashboard
// can't fail the whole list.
func newListedDashboardForList(storable *StorableDashboard, tags []*tagtypes.Tag) *listedDashboardV2 {
	if v2, err := storable.ToDashboardV2(tags); err == nil {
		return newListedDashboardV2(v2)
	}
	return newLegacyListedDashboardV2(storable, tags)
}

// newLegacyListedDashboardV2 pulls the display-relevant fields out of a v1
// dashboard blob. Column-backed fields (name, source, timestamps, …) come
// straight off the row; title/description/image/version are read leniently from
// the untyped v1 data, defaulting to zero when absent or of the wrong type.
func newLegacyListedDashboardV2(storable *StorableDashboard, tags []*tagtypes.Tag) *listedDashboardV2 {
	return &listedDashboardV2{
		Identifiable:  storable.Identifiable,
		TimeAuditable: storable.TimeAuditable,
		UserAuditable: storable.UserAuditable,
		OrgID:         storable.OrgID,
		Locked:        storable.Locked,
		Source:        storable.Source,
		SchemaVersion: storable.Data.readString("version"),
		Name:          storable.Name,
		Image:         storable.Data.readString("image"),
		Tags:          tagtypes.NewGettableTagsFromTags(tags),
		Spec: listedDashboardV2Spec{Display: Display{
			Name:        storable.Data.readString("title"),
			Description: storable.Data.readString("description"),
		}},
		Legacy: true,
	}
}

type ListableDashboardV2 struct {
	Dashboards       []*listedDashboardV2    `json:"dashboards" required:"true" nullable:"false" description:"The dashboards on this page."`
	Total            int64                   `json:"total" required:"true" description:"The number of dashboards matching the filter across every page."`
	Tags             []*tagtypes.GettableTag `json:"tags" required:"true" nullable:"false" description:"Every dashboard tag in the organization, for building filters."`
	ReservedKeywords []DSLKey                `json:"reservedKeywords" required:"true" nullable:"false" description:"The filter keys that address dashboard columns rather than tags."`
}

func NewListableDashboardV2(dashboards []*StorableDashboard, total int64, tagsByEntity map[valuer.UUID][]*tagtypes.Tag, allTags []*tagtypes.Tag) *ListableDashboardV2 {
	items := make([]*listedDashboardV2, len(dashboards))
	for i, d := range dashboards {
		items[i] = newListedDashboardForList(d, tagsByEntity[d.ID])
	}
	return &ListableDashboardV2{
		Dashboards:       items,
		Total:            total,
		Tags:             tagtypes.NewGettableTagsFromTags(allTags),
		ReservedKeywords: ReservedFilterKeys(),
	}
}

// listedDashboardForUserV2 is a listed dashboard plus the calling user's pin
// state. Only the per-user list endpoint emits this; the pure list omits pins.
type listedDashboardForUserV2 struct {
	listedDashboardV2
	Pinned bool `json:"pinned" required:"true" description:"Whether the calling user has pinned the dashboard."`
}

type ListableDashboardForUserV2 struct {
	Dashboards       []*listedDashboardForUserV2 `json:"dashboards" required:"true" nullable:"false" description:"The dashboards on this page, each with the calling user's pin state."`
	Total            int64                       `json:"total" required:"true" description:"The number of dashboards matching the filter across every page."`
	Tags             []*tagtypes.GettableTag     `json:"tags" required:"true" nullable:"false" description:"Every dashboard tag in the organization, for building filters."`
	ReservedKeywords []DSLKey                    `json:"reservedKeywords" required:"true" nullable:"false" description:"The filter keys that address dashboard columns rather than tags."`
}

// StorableDashboardWithPinInfo is the per-row shape Store.ListForUser returns: the dashboard
// joined with the calling user's pin state, so the module layer can attach tags
// and assemble the gettable view.
type StorableDashboardWithPinInfo struct {
	Dashboard *StorableDashboard
	Pinned    bool
}

func NewListableDashboardForUserV2(rows []*StorableDashboardWithPinInfo, total int64, tagsByEntity map[valuer.UUID][]*tagtypes.Tag, allTags []*tagtypes.Tag) *ListableDashboardForUserV2 {
	items := make([]*listedDashboardForUserV2, len(rows))
	for i, r := range rows {
		items[i] = &listedDashboardForUserV2{
			listedDashboardV2: *newListedDashboardForList(r.Dashboard, tagsByEntity[r.Dashboard.ID]),
			Pinned:            r.Pinned,
		}
	}
	return &ListableDashboardForUserV2{
		Dashboards:       items,
		Total:            total,
		Tags:             tagtypes.NewGettableTagsFromTags(allTags),
		ReservedKeywords: ReservedFilterKeys(),
	}
}
