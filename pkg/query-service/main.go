package main

import (
	"context"
	"flag"
	"os"
	"time"

	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/config"
	"github.com/SigNoz/signoz/pkg/config/envprovider"
	"github.com/SigNoz/signoz/pkg/config/fileprovider"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/licensing/nooplicensing"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/query-service/app"
	"github.com/SigNoz/signoz/pkg/query-service/constants"
	"github.com/SigNoz/signoz/pkg/signoz"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/version"
	"github.com/SigNoz/signoz/pkg/zeus"
	"github.com/SigNoz/signoz/pkg/zeus/noopzeus"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

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

	var useLogsNewSchema bool
	var useTraceNewSchema bool
	// the url used to build link in the alert messages in slack and other systems
	var ruleRepoURL, cacheConfigPath, fluxInterval, fluxIntervalForTraceDetail string
	var cluster string

	var preferSpanMetrics bool

	var maxIdleConns int
	var maxOpenConns int
	var dialTimeout time.Duration

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
	// Deprecated
	flag.BoolVar(&preferSpanMetrics, "prefer-span-metrics", false, "(prefer span metrics for service level metrics)")
	// Deprecated
	flag.StringVar(&ruleRepoURL, "rules.repo-url", constants.AlertHelpPage, "(host address used to build rule link in alert messages)")
	// Deprecated
	flag.StringVar(&cacheConfigPath, "experimental.cache-config", "", "(cache config to use)")
	// Deprecated
	flag.StringVar(&fluxInterval, "flux-interval", "5m", "(the interval to exclude data from being cached to avoid incorrect cache for data in motion)")
	// Deprecated
	flag.StringVar(&fluxIntervalForTraceDetail, "flux-interval-trace-detail", "2m", "(the interval to exclude data from being cached to avoid incorrect cache for trace data in motion)")
	// Deprecated
	flag.StringVar(&cluster, "cluster", "cluster", "(cluster name - defaults to 'cluster')")
	// Deprecated
	flag.StringVar(&cluster, "cluster-name", "cluster", "(cluster name - defaults to 'cluster')")
	// Deprecated
	flag.IntVar(&maxIdleConns, "max-idle-conns", 50, "(number of connections to maintain in the pool, only used with clickhouse if not set in ClickHouseUrl env var DSN.)")
	// Deprecated
	flag.IntVar(&maxOpenConns, "max-open-conns", 100, "(max connections for use at any time, only used with clickhouse if not set in ClickHouseUrl env var DSN.)")
	// Deprecated
	flag.DurationVar(&dialTimeout, "dial-timeout", 5*time.Second, "(the maximum time to establish a connection, only used with clickhouse if not set in ClickHouseUrl env var DSN.)")
	flag.Parse()

	loggerMgr := initZapLog()
	zap.ReplaceGlobals(loggerMgr)
	defer loggerMgr.Sync() // flushes buffer, if any

	logger := loggerMgr.Sugar()

	config, err := signoz.NewConfig(context.Background(), config.ResolverConfig{
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
		PreferSpanMetrics:          preferSpanMetrics,
		Cluster:                    cluster,
	})
	if err != nil {
		zap.L().Fatal("Failed to create config", zap.Error(err))
	}

	version.Info.PrettyPrint(config.Version)

	// Read the jwt secret key
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
		zeus.Config{},
		noopzeus.NewProviderFactory(),
		licensing.Config{},
		func(_ sqlstore.SQLStore, _ zeus.Zeus, _ organization.Getter, _ analytics.Analytics) factory.ProviderFactory[licensing.Licensing, licensing.Config] {
			return nooplicensing.NewFactory()
		},
		signoz.NewEmailingProviderFactories(),
		signoz.NewCacheProviderFactories(),
		signoz.NewWebProviderFactories(),
		signoz.NewSQLStoreProviderFactories(),
		signoz.NewTelemetryStoreProviderFactories(),
	)
	if err != nil {
		zap.L().Fatal("Failed to create signoz", zap.Error(err))
	}

	server, err := app.NewServer(config, signoz, jwt)
	if err != nil {
		logger.Fatal("Failed to create server", zap.Error(err))
	}

	if err := server.Start(context.Background()); err != nil {
		logger.Fatal("Could not start servers", zap.Error(err))
	}

	signoz.Start(context.Background())

	if err := signoz.Wait(context.Background()); err != nil {
		zap.L().Fatal("Failed to start signoz", zap.Error(err))
	}

	err = server.Stop(context.Background())
	if err != nil {
		zap.L().Fatal("Failed to stop server", zap.Error(err))
	}

	err = signoz.Stop(context.Background())
	if err != nil {
		zap.L().Fatal("Failed to stop signoz", zap.Error(err))
	}

}
