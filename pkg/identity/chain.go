package identity

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
)

// Chain tries multiple resolvers in declared order.
// It calls Test() on each resolver, then Authenticate() on the first match.
// If Authenticate() fails, the chain stops (credentials were found but invalid).
type Chain struct {
	resolvers []Resolver
	settings  factory.ScopedProviderSettings
}

// NewChain creates a new resolver chain. Resolvers are tried in the order given.
func NewChain(providerSettings factory.ProviderSettings, resolvers ...Resolver) *Chain {
	return &Chain{
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
func (c *Chain) Authenticate(ctx context.Context, r *http.Request) (authtypes.Claims, ctxtypes.AuthType, Resolver, error) {
	for _, resolver := range c.resolvers {
		if !resolver.Test(ctx, r) {
			continue
		}

		c.settings.Logger().DebugContext(ctx, "identity resolver matched", "resolver", resolver.Name())

		claims, authType, err := resolver.Authenticate(ctx, r)
		if err != nil {
			return authtypes.Claims{}, ctxtypes.AuthType{}, resolver, err
		}

		return claims, authType, resolver, nil
	}

	return authtypes.Claims{}, ctxtypes.AuthType{}, nil, nil
}
