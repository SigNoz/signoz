package impersonationidentn

import (
	"context"
	"net/http"
	"sync"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/identn"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
)

type provider struct {
	config     identn.Config
	settings   factory.ScopedProviderSettings
	orgGetter  organization.Getter
	userGetter user.Getter
	userConfig user.Config

	mu       sync.RWMutex
	identity *authtypes.Identity
}

func NewFactory(orgGetter organization.Getter, userGetter user.Getter, userConfig user.Config) factory.ProviderFactory[identn.IdentN, identn.Config] {
	return factory.NewProviderFactory(factory.MustNewName(authtypes.IdentNProviderImpersonation.StringValue()), func(ctx context.Context, providerSettings factory.ProviderSettings, config identn.Config) (identn.IdentN, error) {
		return New(ctx, providerSettings, config, orgGetter, userGetter, userConfig)
	})
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config identn.Config, orgGetter organization.Getter, userGetter user.Getter, userConfig user.Config) (identn.IdentN, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/identn/impersonationidentn")

	settings.Logger().WarnContext(ctx, "impersonation identity provider is enabled, all requests will impersonate the root user")

	if !userConfig.Root.Enabled {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "root user is not enabled, impersonation identity provider will not be able to resolve any identity")
	}

	return &provider{
		config:     config,
		settings:   settings,
		orgGetter:  orgGetter,
		userGetter: userGetter,
		userConfig: userConfig,
	}, nil
}

func (provider *provider) Name() authtypes.IdentNProvider {
	return authtypes.IdentNProviderImpersonation
}

func (provider *provider) Test(_ *http.Request) bool {
	return true
}

func (provider *provider) GetIdentity(req *http.Request) (*authtypes.Identity, error) {
	ctx := req.Context()

	provider.mu.RLock()
	if provider.identity != nil {
		provider.mu.RUnlock()
		return provider.identity, nil
	}
	provider.mu.RUnlock()

	provider.mu.Lock()
	defer provider.mu.Unlock()

	// Re-check after acquiring write lock; another goroutine may have resolved it.
	if provider.identity != nil {
		return provider.identity, nil
	}

	org, _, err := provider.orgGetter.GetByIDOrName(ctx, provider.userConfig.Root.Org.ID, provider.userConfig.Root.Org.Name)
	if err != nil {
		return nil, err
	}

	rootUser, _, err := provider.userGetter.GetRootUserByOrgID(ctx, org.ID)
	if err != nil {
		return nil, err
	}

	provider.identity = authtypes.NewPrincipalUserIdentity(
		rootUser.ID,
		rootUser.OrgID,
		rootUser.Email,
		authtypes.IdentNProviderImpersonation,
	)

	return provider.identity, nil
}
