package main

import (
	"os"
	"os/signal"
	"syscall"

	"github.com/spf13/viper"
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

func initViper() *viper.Viper {

	v := viper.New()

	v.SetConfigName("config") // name of config file (without extension)
	v.SetConfigType("yaml")   // REQUIRED if the config file does not have the extension in the name
	// v.AddConfigPath("/etc/appname/")   // path to look for the config file in
	// v.AddConfigPath("$HOME/.appname")  // call multiple times to add many search paths
	v.AddConfigPath(".") // optionally look for config in the working directory

	if err := v.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			// Config file not found; ignore error if desired
			zap.S().Warn("Config File not found")

		} else {
			// Config file was found but another error was produced
			zap.S().Warn("Config file was found but another error was produced")
		}
	}

	// Config file found and successfully parsed
	return v

}

func main() {

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
