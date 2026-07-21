package savedviewtypes

import (
	"fmt"
	"time"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// SavedView is a saved query for the explore page. It is a composite query
// with a source page name and user defined tags. The source page name is
// used to identify the page that initiated the query. The source page
// could be "traces", "logs", "metrics".
//
// CompositeQuery already carries both the legacy builderQueries/chQueries/
// promQueries shape and the v5 Queries envelope (each field omitempty), so
// this same type serves both /api/v1/explorer/views and /api/v2/saved_views.
type SavedView struct {
	ID             valuer.UUID        `json:"id,omitempty"`
	Name           string             `json:"name" required:"true"`
	Category       string             `json:"category" required:"true"`
	CreatedAt      time.Time          `json:"createdAt" required:"true"`
	CreatedBy      string             `json:"createdBy" required:"true"`
	UpdatedAt      time.Time          `json:"updatedAt" required:"true"`
	UpdatedBy      string             `json:"updatedBy" required:"true"`
	SourcePage     string             `json:"sourcePage" required:"true"`
	Tags           []string           `json:"tags" required:"true" nullable:"true"`
	CompositeQuery *v3.CompositeQuery `json:"compositeQuery" required:"true"`
	// ExtraData is JSON encoded data used by frontend to store additional data
	ExtraData string `json:"extraData" required:"true"`
}

func (eq *SavedView) Validate() error {
	if eq.CompositeQuery == nil {
		return fmt.Errorf("composite query is required")
	}

	return eq.CompositeQuery.Validate()
}
