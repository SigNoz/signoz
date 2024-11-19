package main

import (
	"context"
	"os"
	"slices"

	"github.com/spf13/cobra"
	"go.opentelemetry.io/collector/confmap"
	"go.opentelemetry.io/collector/confmap/provider/fileprovider"
	signozconfig "go.signoz.io/signoz/pkg/config"
	"go.signoz.io/signoz/pkg/confmap/provider/signozenvprovider"
	"go.signoz.io/signoz/pkg/instrumentation"
	"go.signoz.io/signoz/pkg/query-service/auth"
	"go.signoz.io/signoz/pkg/version"
	"go.signoz.io/signoz/pkg/web"
	"go.uber.org/zap"
)

func main() {
	var config config

	app := &cobra.Command{
		Use:           "signoz",
		Short:         "An open-source observability platform native to OpenTelemetry with logs, traces and metrics in a single application.",
		Version:       version.Info.Version,
		SilenceUsage:  true,
		SilenceErrors: false,
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()

			return run(ctx, config)
		},
		PostRunE: func(cmd *cobra.Command, args []string) error {
			return nil
		},
	}

	// register all flags
	config.registerFlags(app)

	// register the Name in version as per the command name
	version.Info.Name = app.Use

	if err := app.Execute(); err != nil {
		os.Exit(1)
	}
}

func run(
	ctx context.Context,
	cfg config,
) error {
	// Create the master config first. The master config will be used to initialize/create
	// all other components
	if len(cfg.uris) == 0 || !slices.Contains(cfg.uris, "signozenv:") {
		cfg.uris = append(cfg.uris, "signozenv:")
	}

	config, err := signozconfig.New(ctx, signozconfig.ProviderSettings{
		ResolverSettings: confmap.ResolverSettings{
			URIs: cfg.uris,
			ProviderFactories: []confmap.ProviderFactory{
				signozenvprovider.NewFactory(),
				fileprovider.NewFactory(),
			},
		},
	})
	if err != nil {
		return err
	}

	// Print the current environment
	if config.Version.Banner.Enabled {
		version.Info.PrettyPrint()
	}

	// Instrument the application, here we finally get the logger
	instr, err := instrumentation.New(ctx, version.Info, config.Instrumentation)
	if err != nil {
		return err
	}

	// Remove this function once the new config is completely rolled out
	signozconfig.EnsureBackwardsCompatibility(ctx, instr, config)

	// To support backward compatibility, we are going to initialize the global zap logger
	zap.ReplaceGlobals(instr.Logger.Named("go.signoz.io/signoz/cmd/signoz"))

	_, err = web.New(instr.Logger, config.Web)
	if err != nil {
		return err
	}

	auth.JwtSecret = config.Auth.Jwt.Secret
	if len(auth.JwtSecret) == 0 {
		instr.Logger.Warn("no jwt secret key is specified", zap.Any("context", ctx))
	}

	return nil
}
