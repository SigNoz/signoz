package dashboardtypes

import (
	"bytes"
	"encoding/json"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

const (
	DashboardViewSchemaVersion = "v1"
	MaxDashboardViewNameLen    = 64
)

var (
	ErrCodeDashboardViewInvalidInput = errors.MustNewCode("dashboard_view_invalid_input")
	ErrCodeDashboardViewNotFound     = errors.MustNewCode("dashboard_view_not_found")
)

type DashboardView struct {
	bun.BaseModel `bun:"table:dashboard_view,alias:dashboard_view"`

	types.Identifiable
	types.TimeAuditable

	Name  string            `bun:"name,type:text,notnull" json:"name" required:"true"`
	Data  DashboardViewData `bun:"data,type:text,notnull" json:"data" required:"true"`
	OrgID valuer.UUID       `bun:"org_id,type:text,notnull" json:"orgId" required:"true"`
}

type DashboardViewData struct {
	Version string `json:"version" required:"true"`
	ListFilter
}

func (d *DashboardViewData) Validate() error {
	if d.Version != DashboardViewSchemaVersion {
		return errors.NewInvalidInputf(ErrCodeDashboardViewInvalidInput,
			"version must be %q, got %q", DashboardViewSchemaVersion, d.Version)
	}
	return d.ListFilter.Validate()
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
		return errors.WrapInvalidInputf(err, ErrCodeDashboardViewInvalidInput, "invalid saved view request body").WithAdditional(err.Error())
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

func (p PostableDashboardView) NewDashboardView(orgID valuer.UUID) *DashboardView {
	now := time.Now()
	return &DashboardView{
		Identifiable:  types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{CreatedAt: now, UpdatedAt: now},
		OrgID:         orgID,
		Name:          p.Name,
		Data:          p.Data,
	}
}

// ════════════════════════════════════════════════════════════════════════
// Updateable
// ════════════════════════════════════════════════════════════════════════

type UpdatableDashboardView = PostableDashboardView

func (v *DashboardView) Update(updateable UpdatableDashboardView) {
	v.Name = updateable.Name
	v.Data = updateable.Data
	v.UpdatedAt = time.Now()
}

// ════════════════════════════════════════════════════════════════════════
// Listable
// ════════════════════════════════════════════════════════════════════════

type ListableDashboardView struct {
	Views []*DashboardView `json:"views" required:"true" nullable:"false"`
}

// ════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════

func validateDashboardViewName(name string) error {
	if strings.TrimSpace(name) == "" {
		return errors.NewInvalidInputf(ErrCodeDashboardViewInvalidInput, "name is required")
	}
	if name != strings.TrimSpace(name) {
		return errors.NewInvalidInputf(ErrCodeDashboardViewInvalidInput, "name must not have leading or trailing whitespace")
	}
	if n := utf8.RuneCountInString(name); n > MaxDashboardViewNameLen {
		return errors.NewInvalidInputf(ErrCodeDashboardViewInvalidInput,
			"name must be at most %d characters, got %d", MaxDashboardViewNameLen, n)
	}
	return nil
}
