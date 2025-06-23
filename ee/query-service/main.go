package main

import (
	"context"
	"flag"
	"os"
	"time"

	"github.com/SigNoz/signoz/ee/licensing"
	"github.com/SigNoz/signoz/ee/licensing/httplicensing"
	"github.com/SigNoz/signoz/ee/query-service/app"
	"github.com/SigNoz/signoz/ee/sqlstore/postgressqlstore"
	"github.com/SigNoz/signoz/ee/zeus"
	"github.com/SigNoz/signoz/ee/zeus/httpzeus"
	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/config"
	"github.com/SigNoz/signoz/pkg/config/envprovider"
	"github.com/SigNoz/signoz/pkg/config/fileprovider"
	"github.com/SigNoz/signoz/pkg/factory"
	pkglicensing "github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	baseconst "github.com/SigNoz/signoz/pkg/query-service/constants"
	"github.com/SigNoz/signoz/pkg/signoz"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstorehook"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/version"
	pkgzeus "github.com/SigNoz/signoz/pkg/zeus"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// Deprecated: Please use the logger from pkg/instrumentation.
func initZapLog() *zap.Logger {
	config := zap.NewProductionConfig()
	config.EncoderConfig.TimeKey = "timestamp"
	config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	logger, _ := config.Build()
	return logger
}

func main() {
	var promConfigPath, skipTopLvlOpsPath string

	// disables rule execution but allows change to the rule definition
	var disableRules bool

	// the url used to build link in the alert messages in slack and other systems
	var ruleRepoURL string
	var cluster string

	var useLogsNewSchema bool
	var useTraceNewSchema bool
	var cacheConfigPath, fluxInterval, fluxIntervalForTraceDetail string
	var preferSpanMetrics bool

	var maxIdleConns int
	var maxOpenConns int
	var dialTimeout time.Duration
	var gatewayUrl string
	var useLicensesV3 bool

	// Deprecated
	flag.BoolVar(&useLogsNewSchema, "use-logs-new-schema", false, "use logs_v2 schema for logs")
	// Deprecated
	flag.BoolVar(&useTraceNewSchema, "use-trace-new-schema", false, "use new schema for traces")
	// Deprecated
	flag.StringVar(&promConfigPath, "config", "./config/prometheus.yml", "(prometheus config to read metrics)")
	// Deprecated
	flag.StringVar(&skipTopLvlOpsPath, "skip-top-level-ops", "", "(config file to skip top level operations)")
	// Deprecated
	flag.BoolVar(&disableRules, "rules.disable", false, "(disable rule evaluation)")
	flag.BoolVar(&preferSpanMetrics, "prefer-span-metrics", false, "(prefer span metrics for service level metrics)")
	// Deprecated
	flag.IntVar(&maxIdleConns, "max-idle-conns", 50, "(number of connections to maintain in the pool.)")
	// Deprecated
	flag.IntVar(&maxOpenConns, "max-open-conns", 100, "(max connections for use at any time.)")
	// Deprecated
	flag.DurationVar(&dialTimeout, "dial-timeout", 5*time.Second, "(the maximum time to establish a connection.)")
	// Deprecated
	flag.StringVar(&ruleRepoURL, "rules.repo-url", baseconst.AlertHelpPage, "(host address used to build rule link in alert messages)")
	// Deprecated
	flag.StringVar(&cacheConfigPath, "experimental.cache-config", "", "(cache config to use)")
	flag.StringVar(&fluxInterval, "flux-interval", "5m", "(the interval to exclude data from being cached to avoid incorrect cache for data in motion)")
	flag.StringVar(&fluxIntervalForTraceDetail, "flux-interval-trace-detail", "2m", "(the interval to exclude data from being cached to avoid incorrect cache for trace data in motion)")
	flag.StringVar(&cluster, "cluster", "cluster", "(cluster name - defaults to 'cluster')")
	flag.StringVar(&gatewayUrl, "gateway-url", "", "(url to the gateway)")
	// Deprecated
	flag.BoolVar(&useLicensesV3, "use-licenses-v3", false, "use licenses_v3 schema for licenses")
	flag.Parse()

	loggerMgr := initZapLog()
	zap.ReplaceGlobals(loggerMgr)
	defer loggerMgr.Sync() // flushes buffer, if any
	ctx := context.Background()

	config, err := signoz.NewConfig(ctx, config.ResolverConfig{
		Uris: []string{"env:"},
		ProviderFactories: []config.ProviderFactory{
			envprovider.NewFactory(),
			fileprovider.NewFactory(),
		},
	}, signoz.DeprecatedFlags{
		MaxIdleConns:               maxIdleConns,
		MaxOpenConns:               maxOpenConns,
		DialTimeout:                dialTimeout,
		Config:                     promConfigPath,
		FluxInterval:               fluxInterval,
		FluxIntervalForTraceDetail: fluxIntervalForTraceDetail,
		Cluster:                    cluster,
		GatewayUrl:                 gatewayUrl,
	})
	if err != nil {
		zap.L().Fatal("Failed to create config", zap.Error(err))
	}

	version.Info.PrettyPrint(config.Version)

	sqlStoreFactories := signoz.NewSQLStoreProviderFactories()
	if err := sqlStoreFactories.Add(postgressqlstore.NewFactory(sqlstorehook.NewLoggingFactory())); err != nil {
		zap.L().Fatal("Failed to add postgressqlstore factory", zap.Error(err))
	}

	jwtSecret := os.Getenv("SIGNOZ_JWT_SECRET")

	if len(jwtSecret) == 0 {
		zap.L().Warn("No JWT secret key is specified.")
	} else {
		zap.L().Info("JWT secret key set successfully.")
	}

	jwt := authtypes.NewJWT(jwtSecret, 30*time.Minute, 30*24*time.Hour)

	signoz, err := signoz.New(
		context.Background(),
		config,
		jwt,
		zeus.Config(),
		httpzeus.NewProviderFactory(),
		licensing.Config(24*time.Hour, 3),
		func(sqlstore sqlstore.SQLStore, zeus pkgzeus.Zeus, orgGetter organization.Getter, analytics analytics.Analytics) factory.ProviderFactory[pkglicensing.Licensing, pkglicensing.Config] {
			return httplicensing.NewProviderFactory(sqlstore, zeus, orgGetter, analytics)
		},
		signoz.NewEmailingProviderFactories(),
		signoz.NewCacheProviderFactories(),
		signoz.NewWebProviderFactories(),
		sqlStoreFactories,
		signoz.NewTelemetryStoreProviderFactories(),
	)
	if err != nil {
		zap.L().Fatal("Failed to create signoz", zap.Error(err))
	}

	server, err := app.NewServer(config, signoz, jwt)
	if err != nil {
		zap.L().Fatal("Failed to create server", zap.Error(err))
	}

	if err := server.Start(ctx); err != nil {
		zap.L().Fatal("Could not start server", zap.Error(err))
	}

	signoz.Start(ctx)

	if err := signoz.Wait(ctx); err != nil {
		zap.L().Fatal("Failed to start signoz", zap.Error(err))
	}

	err = server.Stop(ctx)
	if err != nil {
		zap.L().Fatal("Failed to stop server", zap.Error(err))
	}

	err = signoz.Stop(ctx)
	if err != nil {
		zap.L().Fatal("Failed to stop signoz", zap.Error(err))
	}
}
