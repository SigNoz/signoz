package main

import (
	"context"
	"log/slog"

	"github.com/SigNoz/signoz/cmd"
	"github.com/SigNoz/signoz/ee/authz/openfgaauthz"
	"github.com/SigNoz/signoz/ee/authz/openfgaschema"
	"github.com/SigNoz/signoz/ee/sqlstore/postgressqlstore"
	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/authn"
	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/licensing/nooplicensing"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/query-service/app"
	"github.com/SigNoz/signoz/pkg/signoz"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstorehook"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/version"
	"github.com/SigNoz/signoz/pkg/zeus"
	"github.com/SigNoz/signoz/pkg/zeus/noopzeus"
	"github.com/spf13/cobra"
)

func registerServer(parentCmd *cobra.Command, logger *slog.Logger) {
	var flags signoz.DeprecatedFlags

	serverCmd := &cobra.Command{
		Use:                "server",
		Short:              "Run the SigNoz server",
		FParseErrWhitelist: cobra.FParseErrWhitelist{UnknownFlags: true},
		RunE: func(currCmd *cobra.Command, args []string) error {
			config, err := cmd.NewSigNozConfig(currCmd.Context(), logger, flags)
			if err != nil {
				return err
			}

			return runServer(currCmd.Context(), config, logger)
		},
	}

	flags.RegisterFlags(serverCmd)
	parentCmd.AddCommand(serverCmd)
}

func runServer(ctx context.Context, config signoz.Config, logger *slog.Logger) error {
	// print the version
	version.Info.PrettyPrint(config.Version)

	// add enterprise sqlstore factories to the community sqlstore factories
	sqlstoreFactories := signoz.NewSQLStoreProviderFactories()
	if err := sqlstoreFactories.Add(postgressqlstore.NewFactory(sqlstorehook.NewLoggingFactory())); err != nil {
		logger.ErrorContext(ctx, "failed to add postgressqlstore factory", "error", err)
		return err
	}

	signoz, err := signoz.New(
		ctx,
		config,
		zeus.Config{},
		noopzeus.NewProviderFactory(),
		licensing.Config{},
		func(_ sqlstore.SQLStore, _ zeus.Zeus, _ organization.Getter, _ analytics.Analytics) factory.ProviderFactory[licensing.Licensing, licensing.Config] {
			return nooplicensing.NewFactory()
		},
		signoz.NewEmailingProviderFactories(),
		signoz.NewCacheProviderFactories(),
		signoz.NewWebProviderFactories(),
		func(sqlstore sqlstore.SQLStore) factory.NamedMap[factory.ProviderFactory[sqlschema.SQLSchema, sqlschema.Config]] {
			return signoz.NewSQLSchemaProviderFactories(sqlstore)
		},
		signoz.NewSQLStoreProviderFactories(),
		signoz.NewTelemetryStoreProviderFactories(),
		func(ctx context.Context, providerSettings factory.ProviderSettings, store authtypes.AuthNStore, licensing licensing.Licensing) (map[authtypes.AuthNProvider]authn.AuthN, error) {
			return signoz.NewAuthNs(ctx, providerSettings, store, licensing)
		},
		func(ctx context.Context, sqlstore sqlstore.SQLStore) factory.ProviderFactory[authz.AuthZ, authz.Config] {
			return openfgaauthz.NewProviderFactory(sqlstore, openfgaschema.NewSchema().Get(ctx))
		},
	)
	if err != nil {
		logger.ErrorContext(ctx, "failed to create signoz", "error", err)
		return err
	}

	server, err := app.NewServer(config, signoz)
	if err != nil {
		logger.ErrorContext(ctx, "failed to create server", "error", err)
		return err
	}

	if err := server.Start(ctx); err != nil {
		logger.ErrorContext(ctx, "failed to start server", "error", err)
		return err
	}

	signoz.Start(ctx)

	if err := signoz.Wait(ctx); err != nil {
		logger.ErrorContext(ctx, "failed to start signoz", "error", err)
		return err
	}

	err = server.Stop(ctx)
	if err != nil {
		logger.ErrorContext(ctx, "failed to stop server", "error", err)
		return err
	}

	err = signoz.Stop(ctx)
	if err != nil {
		logger.ErrorContext(ctx, "failed to stop signoz", "error", err)
		return err
	}

	return nil
}
