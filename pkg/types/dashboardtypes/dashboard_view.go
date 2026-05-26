package dashboardtypes

import (
	"bytes"
	"encoding/json"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

const (
	DashboardViewSchemaVersion = "v1"
	MaxDashboardViewNameLen    = 32
)

var (
	ErrCodeDashboardViewInvalidInput = errors.MustNewCode("dashboard_view_invalid_input")
	ErrCodeDashboardViewNotFound     = errors.MustNewCode("dashboard_view_not_found")
)

type DashboardViewData struct {
	Version string    `json:"version" required:"true"`
	Query   string    `json:"query,omitempty"`
	Sort    ListSort  `json:"sort,omitempty"`
	Order   ListOrder `json:"order,omitempty"`
}

func (d *DashboardViewData) Validate() error {
	if d.Version != DashboardViewSchemaVersion {
		return errors.NewInvalidInputf(ErrCodeDashboardViewInvalidInput,
			"version must be %q, got %q", DashboardViewSchemaVersion, d.Version)
	}
	if d.Sort != "" {
		s := ListSort(strings.ToLower(string(d.Sort)))
		switch s {
		case ListSortUpdatedAt, ListSortCreatedAt, ListSortName:
		default:
			return errors.NewInvalidInputf(ErrCodeDashboardViewInvalidInput,
				"invalid sort %q — expected one of: `updated_at`, `created_at`, `name`", d.Sort)
		}
		d.Sort = s
	}
	if d.Order != "" {
		o := ListOrder(strings.ToLower(string(d.Order)))
		switch o {
		case ListOrderAsc, ListOrderDesc:
		default:
			return errors.NewInvalidInputf(ErrCodeDashboardViewInvalidInput,
				"invalid order %q — expected `asc` or `desc`", d.Order)
		}
		d.Order = o
	}
	return nil
}

type DashboardView struct {
	bun.BaseModel `bun:"table:dashboard_view,alias:dashboard_view"`

	types.Identifiable
	types.TimeAuditable
	types.UserAuditable

	Name  string            `bun:"name,type:text,notnull" json:"name" required:"true"`
	Data  DashboardViewData `bun:"data,type:jsonb,notnull" json:"data" required:"true"`
	OrgID valuer.UUID       `bun:"org_id,type:text,notnull" json:"orgId" required:"true"`
}

// ════════════════════════════════════════════════════════════════════════
// Postable
// ════════════════════════════════════════════════════════════════════════

type PostableDashboardView struct {
	Name string            `json:"name" required:"true"`
	Data DashboardViewData `json:"data" required:"true"`
}

func (p *PostableDashboardView) UnmarshalJSON(data []byte) error {
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.DisallowUnknownFields()
	type alias PostableDashboardView
	var tmp alias
	if err := dec.Decode(&tmp); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardViewInvalidInput, "%s", err.Error())
	}
	*p = PostableDashboardView(tmp)
	return p.Validate()
}

func (p *PostableDashboardView) Validate() error {
	if err := validateDashboardViewName(p.Name); err != nil {
		return err
	}
	return p.Data.Validate()
}

func (p PostableDashboardView) NewDashboardView(orgID valuer.UUID, createdBy string) *DashboardView {
	now := time.Now()
	return &DashboardView{
		Identifiable:  types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{CreatedAt: now, UpdatedAt: now},
		UserAuditable: types.UserAuditable{CreatedBy: createdBy, UpdatedBy: createdBy},
		OrgID:         orgID,
		Name:          p.Name,
		Data:          p.Data,
	}
}

// ════════════════════════════════════════════════════════════════════════
// Updateable
// ════════════════════════════════════════════════════════════════════════

type UpdateableDashboardView = PostableDashboardView

func (v *DashboardView) Update(updateable UpdateableDashboardView, updatedBy string) {
	v.Name = updateable.Name
	v.Data = updateable.Data
	v.UpdatedBy = updatedBy
	v.UpdatedAt = time.Now()
}

// ════════════════════════════════════════════════════════════════════════
// Gettable
// ════════════════════════════════════════════════════════════════════════

type GettableDashboardView = DashboardView

type ListableDashboardView struct {
	Views []*GettableDashboardView `json:"views" required:"true" nullable:"false"`
}

// ════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════

func validateDashboardViewName(name string) error {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		return errors.NewInvalidInputf(ErrCodeDashboardViewInvalidInput, "name is required")
	}
	if len(trimmed) > MaxDashboardViewNameLen {
		return errors.NewInvalidInputf(ErrCodeDashboardViewInvalidInput,
			"name must be at most %d characters, got %d", MaxDashboardViewNameLen, len(trimmed))
	}
	return nil
}
