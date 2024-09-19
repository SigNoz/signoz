package main

import (
	"context"
	"flag"
	"log"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"go.opentelemetry.io/otel/sdk/resource"
	semconv "go.opentelemetry.io/otel/semconv/v1.4.0"
	"go.signoz.io/signoz/ee/query-service/app"
	"go.signoz.io/signoz/pkg/query-service/auth"
	baseconst "go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/migrate"
	"go.signoz.io/signoz/pkg/query-service/version"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	zapotlpencoder "github.com/SigNoz/zap_otlp/zap_otlp_encoder"
	zapotlpsync "github.com/SigNoz/zap_otlp/zap_otlp_sync"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func initZapLog(enableQueryServiceLogOTLPExport bool) *zap.Logger {
	config := zap.NewProductionConfig()
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	config.EncoderConfig.EncodeDuration = zapcore.MillisDurationEncoder
	config.EncoderConfig.EncodeLevel = zapcore.CapitalLevelEncoder
	config.EncoderConfig.TimeKey = "timestamp"
	config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder

	otlpEncoder := zapotlpencoder.NewOTLPEncoder(config.EncoderConfig)
	consoleEncoder := zapcore.NewJSONEncoder(config.EncoderConfig)
	defaultLogLevel := zapcore.InfoLevel

	res := resource.NewWithAttributes(
		semconv.SchemaURL,
		semconv.ServiceNameKey.String("query-service"),
	)

	core := zapcore.NewTee(
		zapcore.NewCore(consoleEncoder, os.Stdout, defaultLogLevel),
	)

	if enableQueryServiceLogOTLPExport {
		ctx, cancel := context.WithTimeout(ctx, time.Second*30)
		defer cancel()
		conn, err := grpc.DialContext(ctx, baseconst.OTLPTarget, grpc.WithBlock(), grpc.WithTransportCredentials(insecure.NewCredentials()))
		if err != nil {
			log.Fatalf("failed to establish connection: %v", err)
		} else {
			logExportBatchSizeInt, err := strconv.Atoi(baseconst.LogExportBatchSize)
			if err != nil {
				logExportBatchSizeInt = 512
			}
			ws := zapcore.AddSync(zapotlpsync.NewOtlpSyncer(conn, zapotlpsync.Options{
				BatchSize:      logExportBatchSizeInt,
				ResourceSchema: semconv.SchemaURL,
				Resource:       res,
			}))
			core = zapcore.NewTee(
				zapcore.NewCore(consoleEncoder, os.Stdout, defaultLogLevel),
				zapcore.NewCore(otlpEncoder, zapcore.NewMultiWriteSyncer(ws), defaultLogLevel),
			)
		}
	}
	logger := zap.New(core, zap.AddCaller(), zap.AddStacktrace(zapcore.ErrorLevel))

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
	var cacheConfigPath, fluxInterval string
	var enableQueryServiceLogOTLPExport bool
	var preferSpanMetrics bool

	var maxIdleConns int
	var maxOpenConns int
	var dialTimeout time.Duration
	var gatewayUrl string

	flag.BoolVar(&useLogsNewSchema, "use-logs-new-schema", false, "use logs_v2 schema for logs")
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
	flag.BoolVar(&enableQueryServiceLogOTLPExport, "enable.query.service.log.otlp.export", false, "(enable query service log otlp export)")
	flag.StringVar(&cluster, "cluster", "cluster", "(cluster name - defaults to 'cluster')")
	flag.StringVar(&gatewayUrl, "gateway-url", "", "(url to the gateway)")

	flag.Parse()

	loggerMgr := initZapLog(enableQueryServiceLogOTLPExport)

	zap.ReplaceGlobals(loggerMgr)
	defer loggerMgr.Sync() // flushes buffer, if any

	version.PrintVersion()

	serverOptions := &app.ServerOptions{
		HTTPHostPort:      baseconst.HTTPHostPort,
		PromConfigPath:    promConfigPath,
		SkipTopLvlOpsPath: skipTopLvlOpsPath,
		PreferSpanMetrics: preferSpanMetrics,
		PrivateHostPort:   baseconst.PrivateHostPort,
		DisableRules:      disableRules,
		RuleRepoURL:       ruleRepoURL,
		MaxIdleConns:      maxIdleConns,
		MaxOpenConns:      maxOpenConns,
		DialTimeout:       dialTimeout,
		CacheConfigPath:   cacheConfigPath,
		FluxInterval:      fluxInterval,
		Cluster:           cluster,
		GatewayUrl:        gatewayUrl,
		UseLogsNewSchema:  useLogsNewSchema,
	}

	// Read the jwt secret key
	auth.JwtSecret = os.Getenv("SIGNOZ_JWT_SECRET")

	if len(auth.JwtSecret) == 0 {
		zap.L().Warn("No JWT secret key is specified.")
	} else {
		zap.L().Info("JWT secret key set successfully.")
	}

	if err := migrate.Migrate(baseconst.RELATIONAL_DATASOURCE_PATH); err != nil {
		zap.L().Error("Failed to migrate", zap.Error(err))
	} else {
		zap.L().Info("Migration successful")
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

	signalsChannel := make(chan os.Signal, 1)
	signal.Notify(signalsChannel, os.Interrupt, syscall.SIGTERM)

	for {
		select {
		case status := <-server.HealthCheckStatus():
			zap.L().Info("Received HealthCheck status: ", zap.Int("status", int(status)))
		case <-signalsChannel:
			zap.L().Fatal("Received OS Interrupt Signal ... ")
			server.Stop()
		}
	}
}
