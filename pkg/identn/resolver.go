package identn

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
)

// chain is the default IdentNResolver implementation that tries multiple
// resolvers in declared order.
type chain struct {
	identNs  []IdentN
	settings factory.ScopedProviderSettings
}

// NewChain creates a new IdentNResolver that tries resolvers in the order given.
func NewIdentNResolver(providerSettings factory.ProviderSettings, identNs ...IdentN) IdentNResolver {
	return &chain{
		identNs:  identNs,
		settings: factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/identn"),
	}
}

// GetIdentity iterates resolvers in order:
//   - Calls Test() on each. Skips if false.
//   - Calls GetIdentity() on the first matching resolver.
//   - Returns (claims, authType, identN, nil) on success.
//   - Returns (zero, zero, identN, err) if credentials were found but invalid.
//   - Returns (zero, zero, nil, nil) if no resolver matched (unauthenticated request).
func (c *chain) GetIdentity(r *http.Request) (authtypes.Claims, authtypes.AuthType, IdentN, error) {
	for _, identN := range c.identNs {
		if !identN.Test(r) {
			continue
		}

		c.settings.Logger().DebugContext(r.Context(), "identity resolver matched", "resolver", identN.Name())

		claims, authType, err := identN.GetIdentity(r)
		if err != nil {
			return authtypes.Claims{}, authtypes.AuthType{}, identN, err
		}

		return claims, authType, identN, nil
	}

	return authtypes.Claims{}, authtypes.AuthType{}, nil, nil
}
