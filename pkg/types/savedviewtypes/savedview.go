package savedviewtypes

import (
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

var (
	ErrCodeSavedViewInvalidInput = errors.MustNewCode("saved_view_invalid_input")
	ErrCodeSavedViewNotFound     = errors.MustNewCode("saved_view_not_found")
)

type GettableSavedView struct {
	ID         valuer.UUID `json:"id" required:"true"`
	Name       string      `json:"name" required:"true"`
	CreatedAt  time.Time   `json:"createdAt" required:"true"`
	CreatedBy  string      `json:"createdBy" required:"true"`
	UpdatedAt  time.Time   `json:"updatedAt" required:"true"`
	UpdatedBy  string      `json:"updatedBy" required:"true"`
	SourcePage SourcePage  `json:"sourcePage" required:"true"`
	SavedViewData
}

type PostableSavedView struct {
	Name       string     `json:"name" required:"true"`
	SourcePage SourcePage `json:"sourcePage" required:"true"`
	SavedViewData
}

type UpdatableSavedView = PostableSavedView

type ListSavedViewsParams struct {
	SourcePage SourcePage `query:"sourcePage"`
	Name       string     `query:"name"`
}

// StorableSavedView has schemaVersion + spec stored JSON-encoded in Data.
type StorableSavedView struct {
	bun.BaseModel `bun:"table:saved_view"`

	types.Identifiable
	types.TimeAuditable
	types.UserAuditable
	OrgID      string        `json:"orgId" bun:"org_id,notnull"`
	Name       string        `json:"name" bun:"name,type:text,notnull"`
	SourcePage SourcePage    `json:"sourcePage" bun:"source_page,type:text,notnull"`
	Data       SavedViewData `json:"data" bun:"data,type:text,notnull"`
}

type SourcePage struct {
	valuer.String
}

var (
	SourcePageTraces  = SourcePage{valuer.NewString("traces")}
	SourcePageLogs    = SourcePage{valuer.NewString("logs")}
	SourcePageMetrics = SourcePage{valuer.NewString("metrics")}
	SourcePageMeter   = SourcePage{valuer.NewString("meter")}
)

func (SourcePage) Enum() []any {
	return []any{
		SourcePageTraces,
		SourcePageLogs,
		SourcePageMetrics,
		SourcePageMeter,
	}
}

func (s SourcePage) Validate() error {
	switch s {
	case SourcePageTraces, SourcePageLogs, SourcePageMetrics, SourcePageMeter:
		return nil
	default:
		return errors.NewInvalidInputf(ErrCodeSavedViewInvalidInput, "invalid source page: %s", s.StringValue())
	}
}

func (p *PostableSavedView) Validate() error {
	if err := p.SourcePage.Validate(); err != nil {
		return err
	}

	return p.SavedViewData.Validate()
}

func (p *ListSavedViewsParams) Validate() error {
	if p.SourcePage.IsZero() {
		return nil
	}

	return p.SourcePage.Validate()
}

func NewStorableSavedView(orgID string, createdBy string, updatedBy string, view PostableSavedView) *StorableSavedView {
	now := time.Now()
	return &StorableSavedView{
		Identifiable:  types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{CreatedAt: now, UpdatedAt: now},
		UserAuditable: types.UserAuditable{CreatedBy: createdBy, UpdatedBy: updatedBy},
		OrgID:         orgID,
		Name:          view.Name,
		SourcePage:    view.SourcePage,
		Data:          view.SavedViewData,
	}
}

func NewGettableSavedViewFromStorable(view *StorableSavedView) *GettableSavedView {
	data := view.Data
	if data.Spec.SelectedFields == nil {
		data.Spec.SelectedFields = []telemetrytypes.TelemetryFieldKey{}
	}

	return &GettableSavedView{
		ID:            view.ID,
		Name:          view.Name,
		CreatedAt:     view.CreatedAt,
		CreatedBy:     view.CreatedBy,
		UpdatedAt:     view.UpdatedAt,
		UpdatedBy:     view.UpdatedBy,
		SourcePage:    view.SourcePage,
		SavedViewData: data,
	}
}

func NewGettableSavedViewsFromStorable(views []*StorableSavedView) []*GettableSavedView {
	out := make([]*GettableSavedView, 0, len(views))
	for _, view := range views {
		out = append(out, NewGettableSavedViewFromStorable(view))
	}
	return out
}

func NewStatsFromSavedViews(savedViews []*StorableSavedView) map[string]any {
	stats := make(map[string]any)
	for _, savedView := range savedViews {
		key := "savedview.source." + strings.ToLower(savedView.SourcePage.StringValue()) + ".count"
		if _, ok := stats[key]; !ok {
			stats[key] = int64(1)
		} else {
			stats[key] = stats[key].(int64) + 1
		}
	}

	stats["savedview.count"] = int64(len(savedViews))
	return stats
}
