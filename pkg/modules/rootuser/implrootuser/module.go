package implrootuser

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/rootuser"
	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	store    types.RootUserStore
	settings factory.ScopedProviderSettings
	config   user.RootUserConfig
}

func NewModule(store types.RootUserStore, providerSettings factory.ProviderSettings, config user.RootUserConfig) rootuser.Module {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/modules/rootuser/implrootuser")
	return &module{
		store:    store,
		settings: settings,
		config:   config,
	}
}

func (m *module) Authenticate(ctx context.Context, orgID valuer.UUID, email valuer.Email, password string) (*authtypes.Identity, error) {
	// get the root user by email and org id
	rootUser, err := m.store.GetByEmailAndOrgID(ctx, orgID, email)
	if err != nil {
		return nil, err
	}

	// verify the password
	if !rootUser.VerifyPassword(password) {
		return nil, errors.New(errors.TypeUnauthenticated, errors.CodeUnauthenticated, "invalid email or password")
	}

	// create a root user identity
	identity := authtypes.NewRootIdentity(rootUser.ID, orgID, rootUser.Email)

	return identity, nil
}

func (m *module) ExistsByOrgID(ctx context.Context, orgID valuer.UUID) (bool, error) {
	return m.store.ExistsByOrgID(ctx, orgID)
}

func (m *module) GetByEmailAndOrgID(ctx context.Context, orgID valuer.UUID, email valuer.Email) (*types.RootUser, error) {
	return m.store.GetByEmailAndOrgID(ctx, orgID, email)
}
