package savedviewtypes

import (
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

var ErrCodeSavedViewInvalidInput = errors.MustNewCode("saved_view_invalid_input")

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

type GettableSavedView struct {
	ID             valuer.UUID     `json:"id" required:"true"`
	Name           string          `json:"name" required:"true"`
	Category       string          `json:"category" required:"true"`
	CreatedAt      time.Time       `json:"createdAt" required:"true"`
	CreatedBy      string          `json:"createdBy" required:"true"`
	UpdatedAt      time.Time       `json:"updatedAt" required:"true"`
	UpdatedBy      string          `json:"updatedBy" required:"true"`
	SourcePage     SourcePage      `json:"sourcePage" required:"true"`
	Tags           []string        `json:"tags" required:"true" nullable:"true"`
	CompositeQuery *CompositeQuery `json:"compositeQuery" required:"true"`
	// ExtraData is JSON encoded data used by frontend to store additional data
	ExtraData string `json:"extraData" required:"true"`
}

type PostableSavedView struct {
	Name           string          `json:"name" required:"true"`
	Category       string          `json:"category" required:"true"`
	SourcePage     SourcePage      `json:"sourcePage" required:"true"`
	Tags           []string        `json:"tags" required:"true" nullable:"true"`
	CompositeQuery *CompositeQuery `json:"compositeQuery" required:"true"`
	// ExtraData is JSON encoded data used by frontend to store additional data
	ExtraData string `json:"extraData" required:"true"`
}

type UpdatableSavedView = PostableSavedView

func (p *PostableSavedView) Validate() error {
	if err := p.SourcePage.Validate(); err != nil {
		return err
	}

	if p.CompositeQuery == nil {
		return errors.NewInvalidInputf(ErrCodeSavedViewInvalidInput, "composite query is required")
	}

	return p.CompositeQuery.Validate()
}

type ListSavedViewsParams struct {
	SourcePage SourcePage `query:"sourcePage"`
	Name       string     `query:"name"`
	Category   string     `query:"category"`
}

// StorableSavedView has CompositeQuery stored JSON-encoded in Data.
type StorableSavedView struct {
	bun.BaseModel `bun:"table:saved_views"`

	types.Identifiable
	types.TimeAuditable
	types.UserAuditable
	OrgID      string     `json:"orgId" bun:"org_id,notnull"`
	Name       string     `json:"name" bun:"name,type:text,notnull"`
	Category   string     `json:"category" bun:"category,type:text,notnull"`
	SourcePage SourcePage `json:"sourcePage" bun:"source_page,type:text,notnull"`
	Tags       string     `json:"tags" bun:"tags,type:text"`
	Data       string     `json:"data" bun:"data,type:text,notnull"`
	ExtraData  string     `json:"extraData" bun:"extra_data,type:text"`
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
