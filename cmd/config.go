package cmd

import (
	"context"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/config"
	"github.com/SigNoz/signoz/pkg/config/envprovider"
	"github.com/SigNoz/signoz/pkg/config/fileprovider"
	"github.com/SigNoz/signoz/pkg/signoz"
)

func NewSigNozConfig(ctx context.Context, logger *slog.Logger, flags signoz.DeprecatedFlags) (signoz.Config, error) {
	config, err := signoz.NewConfig(
		ctx,
		logger,
		config.ResolverConfig{
			Uris: []string{"env:"},
			ProviderFactories: []config.ProviderFactory{
				envprovider.NewFactory(),
				fileprovider.NewFactory(),
			},
		},
		flags,
	)
	if err != nil {
		return signoz.Config{}, err
	}

	return config, nil
}
