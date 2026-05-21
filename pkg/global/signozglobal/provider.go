package signozglobal

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/global"
	"github.com/SigNoz/signoz/pkg/identn"
	"github.com/SigNoz/signoz/pkg/types/globaltypes"
)

type provider struct {
	config       global.Config
	identNConfig identn.Config
	settings     factory.ScopedProviderSettings
}

func NewFactory(identNConfig identn.Config) factory.ProviderFactory[global.Global, global.Config] {
	return factory.NewProviderFactory(factory.MustNewName("signoz"), func(ctx context.Context, providerSettings factory.ProviderSettings, config global.Config) (global.Global, error) {
		return newProvider(ctx, providerSettings, config, identNConfig)
	})
}

func newProvider(_ context.Context, providerSettings factory.ProviderSettings, config global.Config, identNConfig identn.Config) (global.Global, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/global/signozglobal")
	return &provider{
		config:       config,
		identNConfig: identNConfig,
		settings:     settings,
	}, nil
}

func (provider *provider) GetConfig(context.Context) *globaltypes.Config {
	var mcpURL *string
	if provider.config.MCPURL != nil {
		s := provider.config.MCPURL.String()
		mcpURL = &s
	}

	var aiAssistantURL *string
	if provider.config.AIAssistantURL != nil {
		s := provider.config.AIAssistantURL.String()
		aiAssistantURL = &s
	}

	return globaltypes.NewConfig(
		globaltypes.NewEndpoint(
			provider.config.ExternalURL.String(),
			provider.config.IngestionURL.String(),
			mcpURL,
			aiAssistantURL,
		),
		globaltypes.NewIdentNConfig(
			globaltypes.TokenizerConfig{Enabled: provider.identNConfig.Tokenizer.Enabled},
			globaltypes.APIKeyConfig{Enabled: provider.identNConfig.APIKeyConfig.Enabled},
			globaltypes.ImpersonationConfig{Enabled: provider.identNConfig.Impersonation.Enabled},
		),
	)
}
