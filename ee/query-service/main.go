package main

import (
	"context"
	"flag"
	"os"
	"time"

	"github.com/SigNoz/signoz/ee/query-service/app"
	"github.com/SigNoz/signoz/ee/sqlstore/postgressqlstore"
	"github.com/SigNoz/signoz/pkg/config"
	"github.com/SigNoz/signoz/pkg/config/envprovider"
	"github.com/SigNoz/signoz/pkg/config/fileprovider"
	"github.com/SigNoz/signoz/pkg/query-service/auth"
	baseconst "github.com/SigNoz/signoz/pkg/query-service/constants"
	"github.com/SigNoz/signoz/pkg/signoz"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstorehook"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/version"

	prommodel "github.com/prometheus/common/model"

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

func init() {
	prommodel.NameValidationScheme = prommodel.UTF8Validation
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

	flag.BoolVar(&useLogsNewSchema, "use-logs-new-schema", false, "use logs_v2 schema for logs")
	flag.BoolVar(&useTraceNewSchema, "use-trace-new-schema", false, "use new schema for traces")
	flag.StringVar(&promConfigPath, "config", "./config/prometheus.yml", "(prometheus config to read metrics)")
	flag.StringVar(&skipTopLvlOpsPath, "skip-top-level-ops", "", "(config file to skip top level operations)")
	flag.BoolVar(&disableRules, "rules.disable", false, "(disable rule evaluation)")
	flag.BoolVar(&preferSpanMetrics, "prefer-span-metrics", false, "(prefer span metrics for service level metrics)")
	flag.IntVar(&maxIdleConns, "max-idle-conns", 50, "(number of connections to maintain in the pool.)")
	flag.IntVar(&maxOpenConns, "max-open-conns", 100, "(max connections for use at any time.)")
	flag.DurationVar(&dialTimeout, "dial-timeout", 5*time.Second, "(the maximum time to establish a connection.)")
	flag.StringVar(&ruleRepoURL, "rules.repo-url", baseconst.AlertHelpPage, "(host address used to build rule link in alert messages)")
	flag.StringVar(&cacheConfigPath, "experimental.cache-config", "", "(cache config to use)")
	flag.StringVar(&fluxInterval, "flux-interval", "5m", "(the interval to exclude data from being cached to avoid incorrect cache for data in motion)")
	flag.StringVar(&fluxIntervalForTraceDetail, "flux-interval-trace-detail", "2m", "(the interval to exclude data from being cached to avoid incorrect cache for trace data in motion)")
	flag.StringVar(&cluster, "cluster", "cluster", "(cluster name - defaults to 'cluster')")
	flag.StringVar(&gatewayUrl, "gateway-url", "", "(url to the gateway)")
	flag.BoolVar(&useLicensesV3, "use-licenses-v3", false, "use licenses_v3 schema for licenses")
	flag.Parse()

	loggerMgr := initZapLog()
	zap.ReplaceGlobals(loggerMgr)
	defer loggerMgr.Sync() // flushes buffer, if any

	config, err := signoz.NewConfig(context.Background(), config.ResolverConfig{
		Uris: []string{"env:"},
		ProviderFactories: []config.ProviderFactory{
			envprovider.NewFactory(),
			fileprovider.NewFactory(),
		},
	}, signoz.DeprecatedFlags{
		MaxIdleConns: maxIdleConns,
		MaxOpenConns: maxOpenConns,
		DialTimeout:  dialTimeout,
	})
	if err != nil {
		zap.L().Fatal("Failed to create config", zap.Error(err))
	}

	version.Info.PrettyPrint(config.Version)

	sqlStoreFactories := signoz.NewSQLStoreProviderFactories()
	sqlStoreFactories.Add(postgressqlstore.NewFactory(sqlstorehook.NewLoggingFactory()))

	signoz, err := signoz.New(
		context.Background(),
		config,
		signoz.NewCacheProviderFactories(),
		signoz.NewWebProviderFactories(),
		sqlStoreFactories,
		signoz.NewTelemetryStoreProviderFactories(),
	)
	if err != nil {
		zap.L().Fatal("Failed to create signoz struct", zap.Error(err))
	}

	jwtSecret := os.Getenv("SIGNOZ_JWT_SECRET")

	if len(jwtSecret) == 0 {
		zap.L().Warn("No JWT secret key is specified.")
	} else {
		zap.L().Info("JWT secret key set successfully.")
	}

	jwt := authtypes.NewJWT(jwtSecret, 30*time.Minute, 30*24*time.Hour)

	serverOptions := &app.ServerOptions{
		Config:                     config,
		SigNoz:                     signoz,
		HTTPHostPort:               baseconst.HTTPHostPort,
		PromConfigPath:             promConfigPath,
		SkipTopLvlOpsPath:          skipTopLvlOpsPath,
		PreferSpanMetrics:          preferSpanMetrics,
		PrivateHostPort:            baseconst.PrivateHostPort,
		DisableRules:               disableRules,
		RuleRepoURL:                ruleRepoURL,
		CacheConfigPath:            cacheConfigPath,
		FluxInterval:               fluxInterval,
		FluxIntervalForTraceDetail: fluxIntervalForTraceDetail,
		Cluster:                    cluster,
		GatewayUrl:                 gatewayUrl,
		UseLogsNewSchema:           useLogsNewSchema,
		UseTraceNewSchema:          useTraceNewSchema,
		Jwt:                        jwt,
	}

	server, err := app.NewServer(serverOptions)
	if err != nil {
		zap.L().Fatal("Failed to create server", zap.Error(err))
	}

	if err := server.Start(); err != nil {
		zap.L().Fatal("Could not start server", zap.Error(err))
	}

	if err := auth.InitAuthCache(context.Background()); err != nil {
		zap.L().Fatal("Failed to initialize auth cache", zap.Error(err))
	}

	signoz.Start(context.Background())

	if err := signoz.Wait(context.Background()); err != nil {
		zap.L().Fatal("Failed to start signoz", zap.Error(err))
	}

	err = server.Stop()
	if err != nil {
		zap.L().Fatal("Failed to stop server", zap.Error(err))
	}

	err = signoz.Stop(context.Background())
	if err != nil {
		zap.L().Fatal("Failed to stop signoz", zap.Error(err))
	}
}
