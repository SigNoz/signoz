package main

import (
	"context"
	"flag"
	"os"
	"os/signal"
	"syscall"

	"go.signoz.io/signoz/ee/query-service/app"
	"go.signoz.io/signoz/pkg/query-service/auth"
	baseconst "go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/version"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func initZapLog() *zap.Logger {
	config := zap.NewDevelopmentConfig()
	config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	config.EncoderConfig.TimeKey = "timestamp"
	config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	logger, _ := config.Build()
	return logger
}

func main() {
	var promConfigPath string

	// disables rule execution but allows change to the rule definition
	var disableRules bool

	// the url used to build link in the alert messages in slack and other systems
	var ruleRepoURL string

	// path of default otel config used by opamp
	var defaultOtelConfig string

	flag.StringVar(&promConfigPath, "config", "../../pkg/query-service/config/prometheus.yml", "(prometheus config to read metrics)")
	flag.BoolVar(&disableRules, "rules.disable", false, "(disable rule evaluation)")
	flag.StringVar(&ruleRepoURL, "rules.repo-url", baseconst.AlertHelpPage, "(host address used to build rule link in alert messages)")
	flag.StringVar(&defaultOtelConfig, "opamp.defaultOtelConfig", "../../pkg/query-service/config/otel-default.yml", "(default otel config used by opamp)")
	flag.Parse()

	loggerMgr := initZapLog()
	zap.ReplaceGlobals(loggerMgr)
	defer loggerMgr.Sync() // flushes buffer, if any

	logger := loggerMgr.Sugar()
	version.PrintVersion()

	serverOptions := &app.ServerOptions{
		HTTPHostPort:      baseconst.HTTPHostPort,
		PromConfigPath:    promConfigPath,
		PrivateHostPort:   baseconst.PrivateHostPort,
		DisableRules:      disableRules,
		RuleRepoURL:       ruleRepoURL,
		DefaultOtelConfig: defaultOtelConfig,
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
		}
	}
}
