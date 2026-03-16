package identity

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
)

// chain is the default Identity implementation that tries multiple
// resolvers in declared order.
type chain struct {
	resolvers []Resolver
	settings  factory.ScopedProviderSettings
}

// NewChain creates a new Identity that tries resolvers in the order given.
func NewChain(providerSettings factory.ProviderSettings, resolvers ...Resolver) Identity {
	return &chain{
		resolvers: resolvers,
		settings:  factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/identity"),
	}
}

// Authenticate iterates resolvers in order:
//   - Calls Test() on each. Skips if false.
//   - Calls Authenticate() on the first matching resolver.
//   - Returns (claims, authType, resolver, nil) on success.
//   - Returns (zero, zero, resolver, err) if credentials were found but invalid.
//   - Returns (zero, zero, nil, nil) if no resolver matched (unauthenticated request).
func (c *chain) Authenticate(r *http.Request) (authtypes.Claims, ctxtypes.AuthType, Resolver, error) {
	for _, resolver := range c.resolvers {
		if !resolver.Test(r) {
			continue
		}

		c.settings.Logger().DebugContext(r.Context(), "identity resolver matched", "resolver", resolver.Name())

		claims, authType, err := resolver.Authenticate(r)
		if err != nil {
			return authtypes.Claims{}, ctxtypes.AuthType{}, resolver, err
		}

		return claims, authType, resolver, nil
	}

	return authtypes.Claims{}, ctxtypes.AuthType{}, nil, nil
}
