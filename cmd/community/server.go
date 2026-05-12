package main

import (
	"context"
	"log/slog"

	"github.com/spf13/cobra"

	"github.com/SigNoz/signoz/cmd"
	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/auditor"
	"github.com/SigNoz/signoz/pkg/authn"
	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/authz/openfgaauthz"
	"github.com/SigNoz/signoz/pkg/authz/openfgaschema"
	"github.com/SigNoz/signoz/pkg/authz/openfgaserver"
	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/gateway"
	"github.com/SigNoz/signoz/pkg/gateway/noopgateway"
	"github.com/SigNoz/signoz/pkg/global"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/licensing/nooplicensing"
	"github.com/SigNoz/signoz/pkg/meterreporter"
	"github.com/SigNoz/signoz/pkg/modules/cloudintegration"
	"github.com/SigNoz/signoz/pkg/modules/cloudintegration/implcloudintegration"
	"github.com/SigNoz/signoz/pkg/modules/dashboard"
	"github.com/SigNoz/signoz/pkg/modules/dashboard/impldashboard"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/retention"
	"github.com/SigNoz/signoz/pkg/modules/rulestatehistory"
	"github.com/SigNoz/signoz/pkg/modules/serviceaccount"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/query-service/app"
	"github.com/SigNoz/signoz/pkg/queryparser"
	"github.com/SigNoz/signoz/pkg/ruler"
	"github.com/SigNoz/signoz/pkg/ruler/signozruler"
	"github.com/SigNoz/signoz/pkg/signoz"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/version"
	"github.com/SigNoz/signoz/pkg/zeus"
	"github.com/SigNoz/signoz/pkg/zeus/noopzeus"
)

func registerServer(parentCmd *cobra.Command, logger *slog.Logger) {
	var configFiles []string

	serverCmd := &cobra.Command{
		Use:                "server",
		Short:              "Run the SigNoz server",
		FParseErrWhitelist: cobra.FParseErrWhitelist{UnknownFlags: true},
		RunE: func(currCmd *cobra.Command, args []string) error {
			config, err := cmd.NewSigNozConfig(currCmd.Context(), logger, configFiles)
			if err != nil {
				return err
			}

			return runServer(currCmd.Context(), config, logger)
		},
	}

	serverCmd.Flags().StringArrayVar(&configFiles, "config", nil, "path to a YAML configuration file (can be specified multiple times, later files override earlier ones)")
	parentCmd.AddCommand(serverCmd)
}

func runServer(ctx context.Context, config signoz.Config, logger *slog.Logger) error {
	// print the version
	version.Info.PrettyPrint(config.Version)

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
		signoz.NewWebProviderFactories(config.Global),
		func(sqlstore sqlstore.SQLStore) factory.NamedMap[factory.ProviderFactory[sqlschema.SQLSchema, sqlschema.Config]] {
			return signoz.NewSQLSchemaProviderFactories(sqlstore)
		},
		signoz.NewSQLStoreProviderFactories(),
		signoz.NewTelemetryStoreProviderFactories(),
		func(ctx context.Context, providerSettings factory.ProviderSettings, store authtypes.AuthNStore, licensing licensing.Licensing) (map[authtypes.AuthNProvider]authn.AuthN, error) {
			return signoz.NewAuthNs(ctx, providerSettings, store, licensing)
		},
		func(ctx context.Context, sqlstore sqlstore.SQLStore, config authz.Config, _ licensing.Licensing, _ []authz.OnBeforeRoleDelete) (factory.ProviderFactory[authz.AuthZ, authz.Config], error) {
			openfgaDataStore, err := openfgaserver.NewSQLStore(sqlstore, config)
			if err != nil {
				return nil, err
			}

			return openfgaauthz.NewProviderFactory(sqlstore, openfgaschema.NewSchema().Get(ctx), openfgaDataStore, authtypes.NewRegistry()), nil
		},
		func(store sqlstore.SQLStore, settings factory.ProviderSettings, analytics analytics.Analytics, orgGetter organization.Getter, queryParser queryparser.QueryParser, _ querier.Querier, _ licensing.Licensing) dashboard.Module {
			return impldashboard.NewModule(impldashboard.NewStore(store), settings, analytics, orgGetter, queryParser)
		},
		func(_ licensing.Licensing) factory.ProviderFactory[gateway.Gateway, gateway.Config] {
			return noopgateway.NewProviderFactory()
		},
		func(_ licensing.Licensing) factory.NamedMap[factory.ProviderFactory[auditor.Auditor, auditor.Config]] {
			return signoz.NewAuditorProviderFactories()
		},
		func(_ context.Context, _ factory.ProviderSettings, _ flagger.Flagger, _ licensing.Licensing, _ telemetrystore.TelemetryStore, _ retention.Getter, _ organization.Getter, _ zeus.Zeus) (factory.NamedMap[factory.ProviderFactory[meterreporter.Reporter, meterreporter.Config]], string) {
			return signoz.NewMeterReporterProviderFactories(), "noop"
		},
		func(ps factory.ProviderSettings, q querier.Querier, a analytics.Analytics) querier.Handler {
			return querier.NewHandler(ps, q, a)
		},
		func(_ sqlstore.SQLStore, _ global.Global, _ zeus.Zeus, _ gateway.Gateway, _ licensing.Licensing, _ serviceaccount.Module, _ cloudintegration.Config) (cloudintegration.Module, error) {
			return implcloudintegration.NewModule(), nil
		},
		func(c cache.Cache, am alertmanager.Alertmanager, ss sqlstore.SQLStore, ts telemetrystore.TelemetryStore, ms telemetrytypes.MetadataStore, p prometheus.Prometheus, og organization.Getter, rsh rulestatehistory.Module, q querier.Querier, qp queryparser.QueryParser) factory.NamedMap[factory.ProviderFactory[ruler.Ruler, ruler.Config]] {
			return factory.MustNewNamedMap(signozruler.NewFactory(c, am, ss, ts, ms, p, og, rsh, q, qp, nil, nil))
		},
	)
	if err != nil {
		logger.ErrorContext(ctx, "failed to create signoz", errors.Attr(err))
		return err
	}

	server, err := app.NewServer(config, signoz)
	if err != nil {
		logger.ErrorContext(ctx, "failed to create server", errors.Attr(err))
		return err
	}

	if err := server.Start(ctx); err != nil {
		logger.ErrorContext(ctx, "failed to start server", errors.Attr(err))
		return err
	}

	signoz.Start(ctx)

	if err := signoz.Wait(ctx); err != nil {
		logger.ErrorContext(ctx, "failed to start signoz", errors.Attr(err))
		return err
	}

	err = server.Stop(ctx)
	if err != nil {
		logger.ErrorContext(ctx, "failed to stop server", errors.Attr(err))
		return err
	}

	err = signoz.Stop(ctx)
	if err != nil {
		logger.ErrorContext(ctx, "failed to stop signoz", errors.Attr(err))
		return err
	}

	return nil
}
