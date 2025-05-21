package noopemailing

import (
	"context"

	"github.com/SigNoz/signoz/pkg/emailing"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/emailtypes"
)

type provider struct{}

func NewFactory() factory.ProviderFactory[emailing.Emailing, emailing.Config] {
	return factory.NewProviderFactory(factory.MustNewName("noop"), New)
}

func New(ctx context.Context, settings factory.ProviderSettings, config emailing.Config) (emailing.Emailing, error) {
	return &provider{}, nil
}

func (provider *provider) SendHTML(ctx context.Context, to string, subject string, templateName emailtypes.TemplateName, data map[string]any) error {
	return nil
}
