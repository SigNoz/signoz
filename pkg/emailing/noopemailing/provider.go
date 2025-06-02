package noopemailing

import (
	"context"

	"github.com/SigNoz/signoz/pkg/emailing"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/emailtypes"
)

type provider struct {
	settings factory.ScopedProviderSettings
}

func NewFactory() factory.ProviderFactory[emailing.Emailing, emailing.Config] {
	return factory.NewProviderFactory(factory.MustNewName("noop"), New)
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config emailing.Config) (emailing.Emailing, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/emailing/noopemailing")
	return &provider{
		settings: settings,
	}, nil
}

func (provider *provider) SendHTML(ctx context.Context, to string, subject string, templateName emailtypes.TemplateName, data map[string]any) error {
	provider.settings.Logger().WarnContext(ctx, "using noop provider, no email will be sent", "to", to, "subject", subject)
	return nil
}
