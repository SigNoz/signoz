package cmd

import (
	"context"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/config"
	"github.com/SigNoz/signoz/pkg/config/envprovider"
	"github.com/SigNoz/signoz/pkg/config/fileprovider"
	"github.com/SigNoz/signoz/pkg/signoz"
)

func NewSigNozConfig(ctx context.Context, logger *slog.Logger, configFiles []string) (signoz.Config, error) {
	uris := make([]string, 0, len(configFiles)+1)
	for _, f := range configFiles {
		uris = append(uris, "file:"+f)
	}
	uris = append(uris, "env:")

	config, err := signoz.NewConfig(
		ctx,
		logger,
		config.ResolverConfig{
			Uris: uris,
			ProviderFactories: []config.ProviderFactory{
				envprovider.NewFactory(),
				fileprovider.NewFactory(),
			},
		},
	)
	if err != nil {
		return signoz.Config{}, err
	}

	return config, nil
}
