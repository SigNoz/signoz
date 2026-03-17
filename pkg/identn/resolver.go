package identn

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/factory"
)

type identNResolver struct {
	identNs  []IdentN
	settings factory.ScopedProviderSettings
}

func NewIdentNResolver(providerSettings factory.ProviderSettings, identNs ...IdentN) IdentNResolver {
	enabledIdentNs := []IdentN{}

	for _, identN := range identNs {
		if identN.Enabled() {
			enabledIdentNs = append(enabledIdentNs, identN)
		}
	}

	return &identNResolver{
		identNs:  enabledIdentNs,
		settings: factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/identn"),
	}
}

// GetIdentN returns the first IdentN whose Test() returns true.
// Returns nil if no resolver matched.
func (c *identNResolver) GetIdentN(r *http.Request) IdentN {
	for _, idn := range c.identNs {
		if idn.Test(r) {
			c.settings.Logger().DebugContext(r.Context(), "identN matched", "provider", idn.Name())
			return idn
		}
	}
	return nil
}
