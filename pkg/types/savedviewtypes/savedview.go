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

// GettableSavedView is a saved query for the explore page, as returned to
// clients. It is a composite query with a source page name and user defined
// tags, plus the id and audit fields the server assigns on create. The
// source page name is used to identify the page that initiated the query.
// The source page could be "traces", "logs", "metrics".
//
// This same type serves both /api/v1/explorer/views and
// /api/v2/saved_views -- the query is always v5 (CompositeQuery), so there
// is nothing version-specific left to split between the two.
type GettableSavedView struct {
	ID             valuer.UUID     `json:"id" required:"true"`
	Name           string          `json:"name" required:"true"`
	Category       string          `json:"category" required:"true"`
	CreatedAt      time.Time       `json:"createdAt" required:"true"`
	CreatedBy      string          `json:"createdBy" required:"true"`
	UpdatedAt      time.Time       `json:"updatedAt" required:"true"`
	UpdatedBy      string          `json:"updatedBy" required:"true"`
	SourcePage     string          `json:"sourcePage" required:"true"`
	Tags           []string        `json:"tags" required:"true" nullable:"true"`
	CompositeQuery *CompositeQuery `json:"compositeQuery" required:"true"`
	// ExtraData is JSON encoded data used by frontend to store additional data
	ExtraData string `json:"extraData" required:"true"`
}

// PostableSavedView is the request body accepted by the create and update
// saved view endpoints. Unlike GettableSavedView, it carries no id or
// server-populated audit fields (createdAt/createdBy/updatedAt/updatedBy) --
// clients never supply those, the server assigns them.
type PostableSavedView struct {
	Name           string          `json:"name" required:"true"`
	Category       string          `json:"category" required:"true"`
	SourcePage     string          `json:"sourcePage" required:"true"`
	Tags           []string        `json:"tags" required:"true" nullable:"true"`
	CompositeQuery *CompositeQuery `json:"compositeQuery" required:"true"`
	// ExtraData is JSON encoded data used by frontend to store additional data
	ExtraData string `json:"extraData" required:"true"`
}

// UpdatableSavedView is accepted by the update saved view endpoint. A saved
// view is always replaced in full, so it has the same shape as
// PostableSavedView.
type UpdatableSavedView = PostableSavedView

func (p *PostableSavedView) Validate() error {
	if p.CompositeQuery == nil {
		return errors.NewInvalidInputf(ErrCodeSavedViewInvalidInput, "composite query is required")
	}

	return p.CompositeQuery.Validate()
}

// ListSavedViewsParams describes the query params accepted by the saved
// views list endpoint. It exists purely to document the endpoint's query
// params in the generated OpenAPI spec -- the handler parses these directly
// off the request URL.
type ListSavedViewsParams struct {
	SourcePage string `query:"sourcePage"`
	Name       string `query:"name"`
	Category   string `query:"category"`
}

// StorableSavedView is the bun-persisted row shape for the saved_views
// table. CompositeQuery is stored JSON-encoded in Data.
type StorableSavedView struct {
	bun.BaseModel `bun:"table:saved_views"`

	types.Identifiable
	types.TimeAuditable
	types.UserAuditable
	OrgID      string `json:"orgId" bun:"org_id,notnull"`
	Name       string `json:"name" bun:"name,type:text,notnull"`
	Category   string `json:"category" bun:"category,type:text,notnull"`
	SourcePage string `json:"sourcePage" bun:"source_page,type:text,notnull"`
	Tags       string `json:"tags" bun:"tags,type:text"`
	Data       string `json:"data" bun:"data,type:text,notnull"`
	ExtraData  string `json:"extraData" bun:"extra_data,type:text"`
}

func NewStatsFromSavedViews(savedViews []*StorableSavedView) map[string]any {
	stats := make(map[string]any)
	for _, savedView := range savedViews {
		key := "savedview.source." + strings.ToLower(string(savedView.SourcePage)) + ".count"
		if _, ok := stats[key]; !ok {
			stats[key] = int64(1)
		} else {
			stats[key] = stats[key].(int64) + 1
		}
	}

	stats["savedview.count"] = int64(len(savedViews))
	return stats
}
