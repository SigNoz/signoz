package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/SigNoz/signoz-otel-collector/migrationmanager"
	"github.com/spf13/pflag"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func init() {
	// init zap logger
	config := zap.NewProductionConfig()
	config.EncoderConfig.EncodeLevel = zapcore.LowercaseLevelEncoder
	config.EncoderConfig.TimeKey = "timestamp"
	config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	logger, err := config.Build()
	if err != nil {
		log.Fatalf("Failed to initialize zap logger %v", err)
	}
	// replace global logger
	// TODO(dhawal1248): move away from global logger
	zap.ReplaceGlobals(logger)
}

func main() {
	logger := zap.L().With(zap.String("component", "migrate cli"))
	f := pflag.NewFlagSet("Schema Migrator CLI Options", pflag.ExitOnError)

	f.Usage = func() {
		fmt.Println(f.FlagUsages())
		os.Exit(1)
	}

	f.String("dsn", "", "Clickhouse DSN")
	f.String("cluster-name", "cluster", "Cluster name to use while running migrations")
	f.Bool("disable-duration-sort-feature", false, "Flag to disable the duration sort feature. Defaults to false.")
	f.Bool("disable-timestamp-sort-feature", false, "Flag to disable the timestamp sort feature. Defaults to false.")
	f.Bool("verbose", false, "Flag to enable verbose logging. Defaults to false.")

	err := f.Parse(os.Args[1:])
	if err != nil {
		logger.Fatal("Failed to parse args", zap.Error(err))
	}

	dsn, err := f.GetString("dsn")
	if err != nil {
		logger.Fatal("Failed to get dsn from args", zap.Error(err))
	}

	clusterName, err := f.GetString("cluster-name")
	if err != nil {
		logger.Fatal("Failed to get cluster name from args", zap.Error(err))
	}

	disableDurationSortFeature, err := f.GetBool("disable-duration-sort-feature")
	if err != nil {
		logger.Fatal("Failed to get disable duration sort feature flag from args", zap.Error(err))
	}

	disableTimestampSortFeature, err := f.GetBool("disable-timestamp-sort-feature")
	if err != nil {
		logger.Fatal("Failed to get disable timestamp sort feature flag from args", zap.Error(err))
	}

	verboseLoggingEnabled, err := f.GetBool("verbose")
	if err != nil {
		logger.Fatal("Failed to get verbose flag from args", zap.Error(err))
	}

	if dsn == "" {
		logger.Fatal("dsn is a required field")
	}

	// set cluster env so that golang-migrate can use it
	// the value of this env would replace all occurences of {{.SIGNOZ_CLUSTER}} in the migration files
	// TODO: remove this log after dirtry migration issue is fixed
	logger.Info("Setting env var SIGNOZ_CLUSTER", zap.String("cluster-name", clusterName))
	err = os.Setenv("SIGNOZ_CLUSTER", clusterName)
	if err != nil {
		logger.Fatal("Failed to set env var SIGNOZ_CLUSTER", zap.Error(err))
	}
	// TODO: remove this section after dirtry migration issue is fixed
	clusterNameFromEnv := ""
	for _, kvp := range os.Environ() {
		kvParts := strings.SplitN(kvp, "=", 2)
		if kvParts[0] == "SIGNOZ_CLUSTER" {
			clusterNameFromEnv = kvParts[1]
			break
		}
	}
	if clusterName == "" {
		logger.Fatal("Failed to set env var SIGNOZ_CLUSTER")
	}
	logger.Info("Successfully set env var SIGNOZ_CLUSTER ", zap.String("cluster-name", clusterNameFromEnv))

	manager, err := migrationmanager.New(dsn, clusterName, disableDurationSortFeature, disableTimestampSortFeature, verboseLoggingEnabled)
	if err != nil {
		logger.Fatal("Failed to create migration manager", zap.Error(err))
	}
	defer manager.Close()

	err = manager.Migrate(context.Background())
	if err != nil {
		logger.Fatal("Failed to run migrations", zap.Error(err))
	}
}
