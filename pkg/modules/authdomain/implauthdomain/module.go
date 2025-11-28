package implauthdomain

import (
	"context"

	"github.com/SigNoz/signoz/pkg/authn"
	"github.com/SigNoz/signoz/pkg/modules/authdomain"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	store  authtypes.AuthDomainStore
	authNs map[authtypes.AuthNProvider]authn.AuthN
}

func NewModule(store authtypes.AuthDomainStore, authNs map[authtypes.AuthNProvider]authn.AuthN) authdomain.Module {
	return &module{store: store, authNs: authNs}
}

func (module *module) Create(ctx context.Context, domain *authtypes.AuthDomain) error {
	return module.store.Create(ctx, domain)
}

func (module *module) Get(ctx context.Context, id valuer.UUID) (*authtypes.AuthDomain, error) {
	return module.store.Get(ctx, id)
}

func (module *module) GetAuthNProviderInfo(ctx context.Context, domain *authtypes.AuthDomain) *authtypes.AuthNProviderInfo {
	if callbackAuthN, ok := module.authNs[domain.AuthDomainConfig().AuthNProvider].(authn.CallbackAuthN); ok {
		return callbackAuthN.ProviderInfo(ctx, domain)
	}
	return &authtypes.AuthNProviderInfo{}
}

func (module *module) GetByOrgIDAndID(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*authtypes.AuthDomain, error) {
	return module.store.GetByOrgIDAndID(ctx, orgID, id)
}

func (module *module) GetByNameAndOrgID(ctx context.Context, name string, orgID valuer.UUID) (*authtypes.AuthDomain, error) {
	return module.store.GetByNameAndOrgID(ctx, name, orgID)
}

func (module *module) Delete(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error {
	return module.store.Delete(ctx, orgID, id)
}

func (module *module) ListByOrgID(ctx context.Context, orgID valuer.UUID) ([]*authtypes.AuthDomain, error) {
	return module.store.ListByOrgID(ctx, orgID)
}

func (module *module) Update(ctx context.Context, domain *authtypes.AuthDomain) error {
	return module.store.Update(ctx, domain)
}
