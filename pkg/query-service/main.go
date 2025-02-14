package main

import (
	"context"
	"flag"
	"os"
	"os/signal"
	"syscall"
	"time"

	prommodel "github.com/prometheus/common/model"
	"go.signoz.io/signoz/pkg/config"
	"go.signoz.io/signoz/pkg/config/envprovider"
	"go.signoz.io/signoz/pkg/config/fileprovider"
	"go.signoz.io/signoz/pkg/query-service/app"
	"go.signoz.io/signoz/pkg/query-service/auth"
	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/version"
	"go.signoz.io/signoz/pkg/signoz"
	"go.signoz.io/signoz/pkg/types/authtypes"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func initZapLog() *zap.Logger {
	config := zap.NewProductionConfig()
	config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
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

	var useLogsNewSchema bool
	var useTraceNewSchema bool
	// the url used to build link in the alert messages in slack and other systems
	var ruleRepoURL, cacheConfigPath, fluxInterval, fluxIntervalForTraceDetail string
	var cluster string

	var preferSpanMetrics bool

	var maxIdleConns int
	var maxOpenConns int
	var dialTimeout time.Duration

	flag.BoolVar(&useLogsNewSchema, "use-logs-new-schema", false, "use logs_v2 schema for logs")
	flag.BoolVar(&useTraceNewSchema, "use-trace-new-schema", false, "use new schema for traces")
	flag.StringVar(&promConfigPath, "config", "./config/prometheus.yml", "(prometheus config to read metrics)")
	flag.StringVar(&skipTopLvlOpsPath, "skip-top-level-ops", "", "(config file to skip top level operations)")
	flag.BoolVar(&disableRules, "rules.disable", false, "(disable rule evaluation)")
	flag.BoolVar(&preferSpanMetrics, "prefer-span-metrics", false, "(prefer span metrics for service level metrics)")
	flag.StringVar(&ruleRepoURL, "rules.repo-url", constants.AlertHelpPage, "(host address used to build rule link in alert messages)")
	flag.StringVar(&cacheConfigPath, "experimental.cache-config", "", "(cache config to use)")
	flag.StringVar(&fluxInterval, "flux-interval", "5m", "(the interval to exclude data from being cached to avoid incorrect cache for data in motion)")
	flag.StringVar(&fluxIntervalForTraceDetail, "flux-interval-trace-detail", "2m", "(the interval to exclude data from being cached to avoid incorrect cache for trace data in motion)")
	flag.StringVar(&cluster, "cluster", "cluster", "(cluster name - defaults to 'cluster')")
	// Allow using the consistent naming with the signoz collector
	flag.StringVar(&cluster, "cluster-name", "cluster", "(cluster name - defaults to 'cluster')")
	flag.IntVar(&maxIdleConns, "max-idle-conns", 50, "(number of connections to maintain in the pool, only used with clickhouse if not set in ClickHouseUrl env var DSN.)")
	flag.IntVar(&maxOpenConns, "max-open-conns", 100, "(max connections for use at any time, only used with clickhouse if not set in ClickHouseUrl env var DSN.)")
	flag.DurationVar(&dialTimeout, "dial-timeout", 5*time.Second, "(the maximum time to establish a connection, only used with clickhouse if not set in ClickHouseUrl env var DSN.)")
	flag.Parse()

	loggerMgr := initZapLog()
	zap.ReplaceGlobals(loggerMgr)
	defer loggerMgr.Sync() // flushes buffer, if any

	logger := loggerMgr.Sugar()
	version.PrintVersion()

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

	signoz, err := signoz.New(context.Background(), config, signoz.NewProviderConfig())
	if err != nil {
		zap.L().Fatal("Failed to create signoz struct", zap.Error(err))
	}

	// Read the jwt secret key
	jwtSecret := os.Getenv("SIGNOZ_JWT_SECRET")

	if len(jwtSecret) == 0 {
		zap.L().Warn("No JWT secret key is specified.")
	} else {
		zap.L().Info("JWT secret key set successfully.")
	}

	jwt := authtypes.NewJWT(jwtSecret, 30*time.Minute, 30*24*time.Hour)

	serverOptions := &app.ServerOptions{
		Config:                     config,
		HTTPHostPort:               constants.HTTPHostPort,
		PromConfigPath:             promConfigPath,
		SkipTopLvlOpsPath:          skipTopLvlOpsPath,
		PreferSpanMetrics:          preferSpanMetrics,
		PrivateHostPort:            constants.PrivateHostPort,
		DisableRules:               disableRules,
		RuleRepoURL:                ruleRepoURL,
		CacheConfigPath:            cacheConfigPath,
		FluxInterval:               fluxInterval,
		FluxIntervalForTraceDetail: fluxIntervalForTraceDetail,
		Cluster:                    cluster,
		UseLogsNewSchema:           useLogsNewSchema,
		UseTraceNewSchema:          useTraceNewSchema,
		SigNoz:                     signoz,
		Jwt:                        jwt,
	}

	server, err := app.NewServer(serverOptions)
	if err != nil {
		logger.Fatal("Failed to create server", zap.Error(err))
	}

	if err := server.Start(); err != nil {
		logger.Fatal("Could not start servers", zap.Error(err))
	}

	if err := auth.InitAuthCache(context.Background()); err != nil {
		logger.Fatal("Failed to initialize auth cache", zap.Error(err))
	}

	signalsChannel := make(chan os.Signal, 1)
	signal.Notify(signalsChannel, os.Interrupt, syscall.SIGTERM)

	for {
		select {
		case status := <-server.HealthCheckStatus():
			logger.Info("Received HealthCheck status: ", zap.Int("status", int(status)))
		case <-signalsChannel:
			logger.Info("Received OS Interrupt Signal ... ")
			err := server.Stop()
			if err != nil {
				logger.Fatal("Failed to stop server", zap.Error(err))
			}
			logger.Info("Server stopped")
			return
		}
	}

}
