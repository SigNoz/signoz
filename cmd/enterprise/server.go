package main

import (
	"context"
	"log/slog"
	"time"

	"github.com/SigNoz/signoz/cmd"
	"github.com/SigNoz/signoz/ee/authn/callbackauthn/oidccallbackauthn"
	"github.com/SigNoz/signoz/ee/authn/callbackauthn/samlcallbackauthn"
	"github.com/SigNoz/signoz/ee/authz/openfgaauthz"
	"github.com/SigNoz/signoz/ee/authz/openfgaschema"
	enterpriselicensing "github.com/SigNoz/signoz/ee/licensing"
	"github.com/SigNoz/signoz/ee/licensing/httplicensing"
	enterpriseapp "github.com/SigNoz/signoz/ee/query-service/app"
	"github.com/SigNoz/signoz/ee/sqlschema/postgressqlschema"
	"github.com/SigNoz/signoz/ee/sqlstore/postgressqlstore"
	enterprisezeus "github.com/SigNoz/signoz/ee/zeus"
	"github.com/SigNoz/signoz/ee/zeus/httpzeus"
	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/authn"
	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/signoz"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstorehook"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/version"
	"github.com/SigNoz/signoz/pkg/zeus"
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
	if err := sqlstoreFactories.Add(postgressqlstore.NewFactory(sqlstorehook.NewLoggingFactory(), sqlstorehook.NewInstrumentationFactory())); err != nil {
		logger.ErrorContext(ctx, "failed to add postgressqlstore factory", "error", err)
		return err
	}

	signoz, err := signoz.New(
		ctx,
		config,
		enterprisezeus.Config(),
		httpzeus.NewProviderFactory(),
		enterpriselicensing.Config(24*time.Hour, 3),
		func(sqlstore sqlstore.SQLStore, zeus zeus.Zeus, orgGetter organization.Getter, analytics analytics.Analytics) factory.ProviderFactory[licensing.Licensing, licensing.Config] {
			return httplicensing.NewProviderFactory(sqlstore, zeus, orgGetter, analytics)
		},
		signoz.NewEmailingProviderFactories(),
		signoz.NewCacheProviderFactories(),
		signoz.NewWebProviderFactories(),
		func(sqlstore sqlstore.SQLStore) factory.NamedMap[factory.ProviderFactory[sqlschema.SQLSchema, sqlschema.Config]] {
			existingFactories := signoz.NewSQLSchemaProviderFactories(sqlstore)
			if err := existingFactories.Add(postgressqlschema.NewFactory(sqlstore)); err != nil {
				panic(err)
			}

			return existingFactories
		},
		sqlstoreFactories,
		signoz.NewTelemetryStoreProviderFactories(),
		func(ctx context.Context, providerSettings factory.ProviderSettings, store authtypes.AuthNStore, licensing licensing.Licensing) (map[authtypes.AuthNProvider]authn.AuthN, error) {
			samlCallbackAuthN, err := samlcallbackauthn.New(ctx, store, licensing)
			if err != nil {
				return nil, err
			}

			oidcCallbackAuthN, err := oidccallbackauthn.New(store, licensing, providerSettings)
			if err != nil {
				return nil, err
			}

			authNs, err := signoz.NewAuthNs(ctx, providerSettings, store, licensing)
			if err != nil {
				return nil, err
			}

			authNs[authtypes.AuthNProviderSAML] = samlCallbackAuthN
			authNs[authtypes.AuthNProviderOIDC] = oidcCallbackAuthN

			return authNs, nil
		},
		func(ctx context.Context, sqlstore sqlstore.SQLStore) factory.ProviderFactory[authz.AuthZ, authz.Config] {
			return openfgaauthz.NewProviderFactory(sqlstore, openfgaschema.NewSchema().Get(ctx))
		},
	)
	if err != nil {
		logger.ErrorContext(ctx, "failed to create signoz", "error", err)
		return err
	}

	server, err := enterpriseapp.NewServer(config, signoz)
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
