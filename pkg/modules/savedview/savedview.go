package savedview

import (
	"context"
	"net/http"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/statsreporter"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	GetViewsForFilters(ctx context.Context, orgID string, sourcePage string, name string, category string) ([]*v3.SavedView, error)

	CreateView(ctx context.Context, orgID string, view v3.SavedView) (valuer.UUID, error)

	GetView(ctx context.Context, orgID string, uuid valuer.UUID) (*v3.SavedView, error)

	UpdateView(ctx context.Context, orgID string, uuid valuer.UUID, view v3.SavedView) error

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
