package savedview

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/statsreporter"
	"github.com/SigNoz/signoz/pkg/types/savedviewtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	GetViewsForFilters(ctx context.Context, orgID string, sourcePage string, name string, category string) ([]*savedviewtypes.SavedView, error)

	CreateView(ctx context.Context, orgID string, view savedviewtypes.SavedView) (valuer.UUID, error)

	GetView(ctx context.Context, orgID string, uuid valuer.UUID) (*savedviewtypes.SavedView, error)

	UpdateView(ctx context.Context, orgID string, uuid valuer.UUID, view savedviewtypes.SavedView) error

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

	// Deletes the saved view
	Delete(http.ResponseWriter, *http.Request)

	// Lists the saved views
	List(http.ResponseWriter, *http.Request)
}
