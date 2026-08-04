package savedviewtypes

import (
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

var (
	ErrCodeSavedViewInvalidInput = errors.MustNewCode("saved_view_invalid_input")
	ErrCodeSavedViewNotFound     = errors.MustNewCode("saved_view_not_found")
)

// SavedView is the core domain type. It also doubles as the API response
// type: Data is a named field, so bun stores it as a single opaque "data"
// column while json nests it under a "data" key in responses too, mirroring
// dashboardtypes.DashboardView's use of the same named-field trick for the
// same reason.
type SavedView struct {
	bun.BaseModel `bun:"table:saved_view"`

	types.Identifiable
	types.TimeAuditable
	types.UserAuditable
	OrgID      string        `json:"-" bun:"org_id,notnull"`
	Name       string        `json:"name" bun:"name,type:text,notnull"`
	SourcePage SourcePage    `json:"sourcePage" bun:"source_page,type:text,notnull"`
	Data       SavedViewData `json:"data" bun:"data,type:text,notnull"`
}

type PostableSavedView struct {
	Name       string        `json:"name" required:"true"`
	SourcePage SourcePage    `json:"sourcePage" required:"true"`
	Data       SavedViewData `json:"data" required:"true"`
}

type UpdatableSavedView = PostableSavedView

type ListSavedViewsParams struct {
	SourcePage SourcePage `query:"sourcePage"`
	Name       string     `query:"name"`
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

	return p.Data.Validate()
}

func (p *ListSavedViewsParams) Validate() error {
	if p.SourcePage.IsZero() {
		return nil
	}

	return p.SourcePage.Validate()
}

func NewSavedView(orgID string, createdBy string, updatedBy string, view PostableSavedView) *SavedView {
	now := time.Now()
	return &SavedView{
		Identifiable:  types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{CreatedAt: now, UpdatedAt: now},
		UserAuditable: types.UserAuditable{CreatedBy: createdBy, UpdatedBy: updatedBy},
		OrgID:         orgID,
		Name:          view.Name,
		SourcePage:    view.SourcePage,
		Data:          view.Data,
	}
}

func NewStatsFromSavedViews(savedViews []*SavedView) map[string]any {
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
