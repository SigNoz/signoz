package identn

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
)

type identNResolver struct {
	identNs  []IdentN
	settings factory.ScopedProviderSettings
}

func NewIdentNResolver(ctx context.Context, providerSettings factory.ProviderSettings, identNConfig Config, identNFactories factory.NamedMap[factory.ProviderFactory[IdentN, Config]]) (IdentNResolver, error) {
	identNs := []IdentN{}

	if identNConfig.Impersonation.Enabled {
		identNFactory, err := identNFactories.Get(authtypes.IdentNProviderImpersonation.StringValue())
		if err != nil {
			return nil, err
		}

		identN, err := identNFactory.New(ctx, providerSettings, identNConfig)
		if err != nil {
			return nil, err
		}

		identNs = append(identNs, identN)
	}

	if identNConfig.Tokenizer.Enabled {
		identNFactory, err := identNFactories.Get(authtypes.IdentNProviderTokenizer.StringValue())
		if err != nil {
			return nil, err
		}

		identN, err := identNFactory.New(ctx, providerSettings, identNConfig)
		if err != nil {
			return nil, err
		}

		identNs = append(identNs, identN)
	}

	if identNConfig.APIKeyConfig.Enabled {
		identNFactory, err := identNFactories.Get(authtypes.IdentNProviderAPIKey.StringValue())
		if err != nil {
			return nil, err
		}

		identN, err := identNFactory.New(ctx, providerSettings, identNConfig)
		if err != nil {
			return nil, err
		}

		identNs = append(identNs, identN)
	}

	return &identNResolver{
		identNs:  identNs,
		settings: factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/identn"),
	}, nil
}

// GetIdentN returns the first IdentN whose Test() returns true.
// Returns nil if no resolver matched.
func (c *identNResolver) GetIdentN(r *http.Request) IdentN {
	for _, idn := range c.identNs {
		if idn.Test(r) {
			c.settings.Logger().DebugContext(r.Context(), "identN matched", slog.Any("provider", idn.Name()))
			return idn
		}
	}
	return nil
}
