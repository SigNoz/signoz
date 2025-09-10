package cmd

import (
	"context"
	"log/slog"
	"os"

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

func NewJWTSecret(ctx context.Context, logger *slog.Logger) string {
	jwtSecret := os.Getenv("SIGNOZ_JWT_SECRET")
	if len(jwtSecret) == 0 {
		logger.ErrorContext(ctx, "🚨 CRITICAL SECURITY ISSUE: No JWT secret key specified!", "error", "SIGNOZ_JWT_SECRET environment variable is not set. This has dire consequences for the security of the application. Without a JWT secret, user sessions are vulnerable to tampering and unauthorized access. Please set the SIGNOZ_JWT_SECRET environment variable immediately. For more information, please refer to https://github.com/SigNoz/signoz/issues/8400.")
	}

	return jwtSecret
}
