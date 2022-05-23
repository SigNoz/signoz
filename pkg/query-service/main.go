package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"go.signoz.io/query-service/app"
	"go.signoz.io/query-service/auth"
	qsconfig "go.signoz.io/query-service/config"
	"go.signoz.io/query-service/constants"
	"go.signoz.io/query-service/version"

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

	loggerMgr := initZapLog()
	zap.ReplaceGlobals(loggerMgr)
	defer loggerMgr.Sync() // flushes buffer, if any

	logger := loggerMgr.Sugar()
	version.PrintVersion()

	var promConfigPath = flag.String("config", "./config/prometheus.yml", "(prometheus config to read metrics)")
	var qsConfigPath = flag.String("qsdb.config-file", "", "(Config file used by Query Service)")
	var qsDbType = flag.String("qsdb.engine", string(qsconfig.PG), "(Database used by Query Service. Values: sql or pg)")
	var qsDbPath = flag.String("qsdb.path", "./signoz.db", "(Data file path for QS when sql*lite is used")
	var qsDbHost = flag.String("qsdb.host", "localhost", "(Host for postgres DB)")
	var qsDbPort = flag.Int("qsdb.port", 5432, "(Port for postgres DB)")
	var qsDbName = flag.String("qsdb.name", "postgres", "(Name of Postgres DB)")
	var qsDbUser = flag.String("qsdb.user", "postgres", "(User name for Postgres DB)")
	var qsDbPassword = flag.String("qsdb.password", "", "(Password for Postgres DB)")
	var qsDbPasswordFile = flag.String("qsdb.passwordFile", "", "(Password file for Postgres DB)")
	var qsDbSSLMode = flag.String("qsdb.ssl", "disable", "(SSL Mode option for Postgres db)")
	// todo(amol): move storage clickhouse url as flags?
	flag.Parse()

	// Load query service config from file or parse from command line
	qsConf := &qsconfig.QsConfig{}
	var err error
	if *qsConfigPath != "" {
		qsConf, err = qsconfig.LoadQsConfigFromFile(*qsConfigPath)
		if err != nil {
			logger.Fatal(fmt.Sprintf("failed to load config file (%s) for query service: %s", *qsConfigPath, err))
		}
	}

	if *qsDbType == string(qsconfig.PG) {
		qsConf.DB = &qsconfig.DBConfig{
			Engine: qsconfig.PG,
			PG: &qsconfig.PGConfig{
				Host:     *qsDbHost,
				Port:     int64(*qsDbPort),
				DBname:   *qsDbName,
				User:     *qsDbUser,
				Password: *qsDbPassword,
				SSLmode:  *qsDbSSLMode,
			},
		}

		if *qsDbPasswordFile != "" {
			err := qsConf.DB.PG.LoadPassword(*qsDbPasswordFile)
			if err != nil {
				logger.Fatal(fmt.Sprintf("failed to load postgres db password from file %s", *qsDbPasswordFile))
			}
		}
	} else if *qsDbType == string(qsconfig.SQLLITE) {
		qsConf.DB = &qsconfig.DBConfig{
			Engine: qsconfig.SQLLITE,
			SQL: &qsconfig.SQLConfig{
				Path: *qsDbPath,
			},
		}
	} else {
		logger.Fatal(fmt.Sprintf("invalid option for qsdb.engine %s. Use either sql or postgres", *qsDbType))
	}

	serverOptions := &app.ServerOptions{
		// HTTPHostPort:   v.GetString(app.HTTPHostPort),
		// DruidClientUrl: v.GetString(app.DruidClientUrl),
		PromConfigPath: *promConfigPath,
		HTTPHostPort:   constants.HTTPHostPort,
		// DruidClientUrl: constants.DruidClientUrl,
		QsConfig: qsConf,
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
