package systemdashboard

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	// Reconcile provisions the org's missing system dashboards and upgrades the
	// unmodified ones to the shipped version. It never touches a dashboard whose
	// row carries a foreign write and it never deletes.
	Reconcile(ctx context.Context, orgID valuer.UUID) error

	// Get addresses the dashboard by its bare definition name; the reserved
	// prefix is a storage concern the API never exposes.
	Get(ctx context.Context, orgID valuer.UUID, name string) (*dashboardtypes.DashboardV2, error)

	// ResolveID maps a system dashboard's name to its id, so routes addressed by
	// name can be authz-checked and audited against the id tuples carry.
	ResolveID(ctx context.Context, orgID valuer.UUID, name string) (valuer.UUID, error)
}

type Handler interface {
	Get(http.ResponseWriter, *http.Request)
}
