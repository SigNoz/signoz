package main

import (
	"fmt"
	"os"
	"os/signal"
	"syscall"

	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/github"

	"go.signoz.io/query-service/app"
	"go.signoz.io/query-service/constants"
	"go.signoz.io/query-service/version"

	"github.com/spf13/viper"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

type AppConfig struct {
	Storage string
}

var configs *AppConfig

func initZapLog() *zap.Logger {
	config := zap.NewDevelopmentConfig()
	config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	config.EncoderConfig.TimeKey = "timestamp"
	config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	logger, _ := config.Build()
	return logger
}

func loadConfig() *AppConfig {
	viper.AutomaticEnv()

	err := viper.ReadInConfig()
	if err != nil {
		fmt.Printf("%v", err)
	}

	conf := &AppConfig{}
	err = viper.Unmarshal(conf)
	if err != nil {
		fmt.Printf("%v", err)
	}

	return conf
}

func main() {
	configs = loadConfig()

	loggerMgr := initZapLog()
	zap.ReplaceGlobals(loggerMgr)
	defer loggerMgr.Sync() // flushes buffer, if any

	logger := loggerMgr.Sugar()
	version.PrintVersion()

	serverOptions := &app.ServerOptions{
		// HTTPHostPort:   v.GetString(app.HTTPHostPort),
		// DruidClientUrl: v.GetString(app.DruidClientUrl),

		HTTPHostPort: constants.HTTPHostPort,
		// DruidClientUrl: constants.DruidClientUrl,
	}

	server, err := app.NewServer(serverOptions, configs.Storage)
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
