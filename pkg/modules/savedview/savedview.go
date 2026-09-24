package savedview

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/statsreporter"
	"github.com/SigNoz/signoz/pkg/types/savedviewtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	GetViewsForFilters(ctx context.Context, orgID string, source savedviewtypes.Source, name string) ([]*savedviewtypes.SavedView, error)

	CreateView(ctx context.Context, orgID string, view savedviewtypes.PostableSavedView) (valuer.UUID, error)

	GetView(ctx context.Context, orgID string, uuid valuer.UUID) (*savedviewtypes.SavedView, error)

	UpdateView(ctx context.Context, orgID string, uuid valuer.UUID, view savedviewtypes.UpdatableSavedView) error

	DeleteView(ctx context.Context, orgID string, uuid valuer.UUID) error

	statsreporter.StatsCollector
}

type Handler interface {
	// Creates the saved view
	Create(http.ResponseWriter, *http.Request)

	// Gets the saved view
	Get(http.ResponseWriter, *http.Request)

	// Updates the saved view
	Update(http.ResponseWriter, *http.Request)

	// Deletes the saved view. Shared by both API generations -- delete has no
	// request/response body to reshape.
	Delete(http.ResponseWriter, *http.Request)

	// Lists the saved views
	List(http.ResponseWriter, *http.Request)

	// CreateV2 is the /api/v2/saved_views typed-spec variant of Create.
	CreateV2(http.ResponseWriter, *http.Request)

	// GetV2 is the /api/v2/saved_views typed-spec variant of Get.
	GetV2(http.ResponseWriter, *http.Request)

	// UpdateV2 is the /api/v2/saved_views typed-spec variant of Update.
	UpdateV2(http.ResponseWriter, *http.Request)

	// ListV2 is the /api/v2/saved_views typed-spec variant of List.
	ListV2(http.ResponseWriter, *http.Request)
}
