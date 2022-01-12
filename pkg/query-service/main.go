package main

import (
	"os"
	"os/signal"
	"syscall"

	"go.signoz.io/query-service/app"
	"go.signoz.io/query-service/constants"

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

	//comment
	loggerMgr := initZapLog()
	zap.ReplaceGlobals(loggerMgr)
	defer loggerMgr.Sync() // flushes buffer, if any

	logger := loggerMgr.Sugar()
	logger.Debug("START!")

	serverOptions := &app.ServerOptions{
		// HTTPHostPort:   v.GetString(app.HTTPHostPort),
		// DruidClientUrl: v.GetString(app.DruidClientUrl),

		HTTPHostPort: constants.HTTPHostPort,
		// DruidClientUrl: constants.DruidClientUrl,
	}

	server, err := app.NewServer(serverOptions)
	if err != nil {
		logger.Fatal("Failed to create server", zap.Error(err))
	}

	if err := server.Start(); err != nil {
		logger.Fatal("Could not start servers", zap.Error(err))
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
