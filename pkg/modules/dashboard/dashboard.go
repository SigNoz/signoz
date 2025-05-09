package dashboard

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	Create(context.Context, valuer.UUID, map[string]any, string) error

	Get(context.Context, valuer.UUID, valuer.UUID) (*dashboardtypes.Dashboard, error)

	GetByMetricNames(context.Context, valuer.UUID, []string) ([]*dashboardtypes.Dashboard, error)

	List(context.Context, valuer.UUID) ([]*dashboardtypes.Dashboard, error)

	Update(context.Context, *dashboardtypes.Dashboard) error

	Delete(context.Context, valuer.UUID, valuer.UUID) error
}
