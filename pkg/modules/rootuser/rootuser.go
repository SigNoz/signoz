package rootuser

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	// Authenticate a root user by email and password
	Authenticate(ctx context.Context, orgID valuer.UUID, email valuer.Email, password string) (*authtypes.Identity, error)

	// Get the root user by email and orgID.
	GetByEmailAndOrgID(ctx context.Context, orgID valuer.UUID, email valuer.Email) (*types.RootUser, error)

	// Checks if a root user exists for an organization
	ExistsByOrgID(ctx context.Context, orgID valuer.UUID) (bool, error)
}

type Reconciler interface {
	// Reconcile the root users
	Reconcile(ctx context.Context) error
}
