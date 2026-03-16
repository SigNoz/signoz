package identn

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
)

type identNResolver struct {
	identNs  []IdentN
	settings factory.ScopedProviderSettings
}

func NewIdentNResolver(providerSettings factory.ProviderSettings, identNs ...IdentN) IdentNResolver {
	return &identNResolver{
		identNs:  identNs,
		settings: factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/identn"),
	}
}

func (c *identNResolver) GetIdentity(r *http.Request) (*authtypes.Identity, IdentN, error) {
	for _, identN := range c.identNs {
		if !identN.Test(r) {
			continue
		}

		identity, err := identN.GetIdentity(r)
		if err != nil {
			return nil, identN, err
		}

		return identity, identN, nil
	}

	return nil, nil, nil
}
