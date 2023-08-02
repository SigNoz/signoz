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
	"go.signoz.io/signoz/pkg/query-service/constants"
	baseconst "go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/version"
	"google.golang.org/grpc"

	zapotlpencoder "github.com/SigNoz/zap_otlp/zap_otlp_encoder"
	zapotlpsync "github.com/SigNoz/zap_otlp/zap_otlp_sync"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func initZapLog(enableQueryServiceLogOTLPExport bool) *zap.Logger {
	config := zap.NewDevelopmentConfig()
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	config.EncoderConfig.EncodeDuration = zapcore.StringDurationEncoder
	otlpEncoder := zapotlpencoder.NewOTLPEncoder(config.EncoderConfig)
	consoleEncoder := zapcore.NewConsoleEncoder(config.EncoderConfig)
	defaultLogLevel := zapcore.DebugLevel
	config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	config.EncoderConfig.TimeKey = "timestamp"
	config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder

	res := resource.NewWithAttributes(
		semconv.SchemaURL,
		semconv.ServiceNameKey.String("query-service"),
	)

	core := zapcore.NewTee(
		zapcore.NewCore(consoleEncoder, os.Stdout, defaultLogLevel),
	)

	if enableQueryServiceLogOTLPExport == true {
		conn, err := grpc.DialContext(ctx, constants.OTLPTarget, grpc.WithBlock(), grpc.WithInsecure(), grpc.WithTimeout(time.Second*30))
		if err != nil {
			log.Println("failed to connect to otlp collector to export query service logs with error:", err)
		} else {
			logExportBatchSizeInt, err := strconv.Atoi(baseconst.LogExportBatchSize)
			if err != nil {
				logExportBatchSizeInt = 1000
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

	var enableQueryServiceLogOTLPExport bool
	var preferDelta bool
	var preferSpanMetrics bool

	flag.StringVar(&promConfigPath, "config", "./config/prometheus.yml", "(prometheus config to read metrics)")
	flag.StringVar(&skipTopLvlOpsPath, "skip-top-level-ops", "", "(config file to skip top level operations)")
	flag.BoolVar(&disableRules, "rules.disable", false, "(disable rule evaluation)")
	flag.BoolVar(&preferDelta, "prefer-delta", false, "(prefer delta over cumulative metrics)")
	flag.BoolVar(&preferSpanMetrics, "prefer-span-metrics", false, "(prefer span metrics for service level metrics)")
	flag.StringVar(&ruleRepoURL, "rules.repo-url", baseconst.AlertHelpPage, "(host address used to build rule link in alert messages)")
	flag.BoolVar(&enableQueryServiceLogOTLPExport, "enable.query.service.log.otlp.export", false, "(enable query service log otlp export)")
	flag.Parse()

	loggerMgr := initZapLog(enableQueryServiceLogOTLPExport)
	zap.ReplaceGlobals(loggerMgr)
	defer loggerMgr.Sync() // flushes buffer, if any

	logger := loggerMgr.Sugar()
	version.PrintVersion()

	serverOptions := &app.ServerOptions{
		HTTPHostPort:      baseconst.HTTPHostPort,
		PromConfigPath:    promConfigPath,
		SkipTopLvlOpsPath: skipTopLvlOpsPath,
		PreferDelta:       preferDelta,
		PreferSpanMetrics: preferSpanMetrics,
		PrivateHostPort:   baseconst.PrivateHostPort,
		DisableRules:      disableRules,
		RuleRepoURL:       ruleRepoURL,
	}

	// Read the jwt secret key
	auth.JwtSecret = os.Getenv("SIGNOZ_JWT_SECRET")

	if len(auth.JwtSecret) == 0 {
		zap.S().Warn("No JWT secret key is specified.")
	} else {
		zap.S().Info("No JWT secret key set successfully.")
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
			logger.Fatal("Received OS Interrupt Signal ... ")
			server.Stop()
		}
	}
}
