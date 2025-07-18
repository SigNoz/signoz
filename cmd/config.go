package cmd

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"github.com/SigNoz/signoz/pkg/config"
	"github.com/SigNoz/signoz/pkg/config/envprovider"
	"github.com/SigNoz/signoz/pkg/config/fileprovider"
	"github.com/SigNoz/signoz/pkg/signoz"
)

func NewSigNozConfig(ctx context.Context, flags signoz.DeprecatedFlags) (signoz.Config, error) {
	config, err := signoz.NewConfig(
		ctx,
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

func NewJWTSecret(_ context.Context, _ *slog.Logger) string {
	jwtSecret := os.Getenv("SIGNOZ_JWT_SECRET")
	if len(jwtSecret) == 0 {
		fmt.Println("🚨 CRITICAL SECURITY ISSUE: No JWT secret key specified!")
		fmt.Println("SIGNOZ_JWT_SECRET environment variable is not set. This has dire consequences for the security of the application.")
		fmt.Println("Without a JWT secret, user sessions are vulnerable to tampering and unauthorized access.")
		fmt.Println("Please set the SIGNOZ_JWT_SECRET environment variable immediately.")
		fmt.Println("For more information, please refer to https://github.com/SigNoz/signoz/issues/8400.")
	}

	return jwtSecret
}
