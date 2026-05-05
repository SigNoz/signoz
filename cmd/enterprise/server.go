package main

import (
	"context"
	"log/slog"
	"time"

	"github.com/spf13/cobra"

	"github.com/SigNoz/signoz/cmd"
	"github.com/SigNoz/signoz/ee/auditor/otlphttpauditor"
	"github.com/SigNoz/signoz/ee/authn/callbackauthn/oidccallbackauthn"
	"github.com/SigNoz/signoz/ee/authn/callbackauthn/samlcallbackauthn"
	"github.com/SigNoz/signoz/ee/authz/openfgaauthz"
	"github.com/SigNoz/signoz/ee/authz/openfgaschema"
	"github.com/SigNoz/signoz/ee/authz/openfgaserver"
	"github.com/SigNoz/signoz/ee/gateway/httpgateway"
	enterpriselicensing "github.com/SigNoz/signoz/ee/licensing"
	"github.com/SigNoz/signoz/ee/licensing/httplicensing"
	"github.com/SigNoz/signoz/ee/modules/cloudintegration/implcloudintegration"
	"github.com/SigNoz/signoz/ee/modules/cloudintegration/implcloudintegration/implcloudprovider"
	"github.com/SigNoz/signoz/ee/modules/dashboard/impldashboard"
	eequerier "github.com/SigNoz/signoz/ee/querier"
	enterpriseapp "github.com/SigNoz/signoz/ee/query-service/app"
	eerules "github.com/SigNoz/signoz/ee/query-service/rules"
	"github.com/SigNoz/signoz/ee/sqlschema/postgressqlschema"
	"github.com/SigNoz/signoz/ee/sqlstore/postgressqlstore"
	enterprisezeus "github.com/SigNoz/signoz/ee/zeus"
	"github.com/SigNoz/signoz/ee/zeus/httpzeus"
	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/auditor"
	"github.com/SigNoz/signoz/pkg/authn"
	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/gateway"
	"github.com/SigNoz/signoz/pkg/global"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/modules/cloudintegration"
	pkgcloudintegration "github.com/SigNoz/signoz/pkg/modules/cloudintegration/implcloudintegration"
	"github.com/SigNoz/signoz/pkg/modules/dashboard"
	pkgimpldashboard "github.com/SigNoz/signoz/pkg/modules/dashboard/impldashboard"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/rulestatehistory"
	"github.com/SigNoz/signoz/pkg/modules/serviceaccount"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/queryparser"
	"github.com/SigNoz/signoz/pkg/ruler"
	"github.com/SigNoz/signoz/pkg/ruler/signozruler"
	"github.com/SigNoz/signoz/pkg/signoz"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstorehook"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/cloudintegrationtypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/version"
	"github.com/SigNoz/signoz/pkg/zeus"
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

	// add enterprise sqlstore factories to the community sqlstore factories
	sqlstoreFactories := signoz.NewSQLStoreProviderFactories()
	if err := sqlstoreFactories.Add(postgressqlstore.NewFactory(sqlstorehook.NewLoggingFactory(), sqlstorehook.NewInstrumentationFactory())); err != nil {
		logger.ErrorContext(ctx, "failed to add postgressqlstore factory", errors.Attr(err))
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
		signoz.NewWebProviderFactories(config.Global),
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
		func(ctx context.Context, sqlstore sqlstore.SQLStore, config authz.Config, licensing licensing.Licensing, onBeforeRoleDelete []authz.OnBeforeRoleDelete) (factory.ProviderFactory[authz.AuthZ, authz.Config], error) {
			openfgaDataStore, err := openfgaserver.NewSQLStore(sqlstore, config)
			if err != nil {
				return nil, err
			}
			return openfgaauthz.NewProviderFactory(sqlstore, openfgaschema.NewSchema().Get(ctx), openfgaDataStore, licensing, onBeforeRoleDelete, authtypes.NewRegistry()), nil
		},
		func(store sqlstore.SQLStore, settings factory.ProviderSettings, analytics analytics.Analytics, orgGetter organization.Getter, queryParser queryparser.QueryParser, querier querier.Querier, licensing licensing.Licensing) dashboard.Module {
			return impldashboard.NewModule(pkgimpldashboard.NewStore(store), settings, analytics, orgGetter, queryParser, querier, licensing)
		},
		func(licensing licensing.Licensing) factory.ProviderFactory[gateway.Gateway, gateway.Config] {
			return httpgateway.NewProviderFactory(licensing)
		},
		func(licensing licensing.Licensing) factory.NamedMap[factory.ProviderFactory[auditor.Auditor, auditor.Config]] {
			factories := signoz.NewAuditorProviderFactories()
			if err := factories.Add(otlphttpauditor.NewFactory(licensing, version.Info)); err != nil {
				panic(err)
			}
			return factories
		},
		func(ps factory.ProviderSettings, q querier.Querier, a analytics.Analytics) querier.Handler {
			communityHandler := querier.NewHandler(ps, q, a)
			return eequerier.NewHandler(ps, q, communityHandler)
		},
		func(sqlStore sqlstore.SQLStore, global global.Global, zeus zeus.Zeus, gateway gateway.Gateway, licensing licensing.Licensing, serviceAccount serviceaccount.Module, config cloudintegration.Config) (cloudintegration.Module, error) {
			defStore := pkgcloudintegration.NewServiceDefinitionStore()
			awsCloudProviderModule, err := implcloudprovider.NewAWSCloudProvider(defStore)
			if err != nil {
				return nil, err
			}
			azureCloudProviderModule := implcloudprovider.NewAzureCloudProvider(defStore)
			cloudProvidersMap := map[cloudintegrationtypes.CloudProviderType]cloudintegration.CloudProviderModule{
				cloudintegrationtypes.CloudProviderTypeAWS:   awsCloudProviderModule,
				cloudintegrationtypes.CloudProviderTypeAzure: azureCloudProviderModule,
			}

			return implcloudintegration.NewModule(pkgcloudintegration.NewStore(sqlStore), global, zeus, gateway, licensing, serviceAccount, cloudProvidersMap, config)
		},
		func(c cache.Cache, am alertmanager.Alertmanager, ss sqlstore.SQLStore, ts telemetrystore.TelemetryStore, ms telemetrytypes.MetadataStore, p prometheus.Prometheus, og organization.Getter, rsh rulestatehistory.Module, q querier.Querier, qp queryparser.QueryParser) factory.NamedMap[factory.ProviderFactory[ruler.Ruler, ruler.Config]] {
			return factory.MustNewNamedMap(signozruler.NewFactory(c, am, ss, ts, ms, p, og, rsh, q, qp, eerules.PrepareTaskFunc, eerules.TestNotification))
		},
	)
	if err != nil {
		logger.ErrorContext(ctx, "failed to create signoz", errors.Attr(err))
		return err
	}

	server, err := enterpriseapp.NewServer(config, signoz)
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
