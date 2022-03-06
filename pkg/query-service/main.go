package main

import (
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"

	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/github"

	"go.signoz.io/query-service/app"
	"go.signoz.io/query-service/constants"
	"go.signoz.io/query-service/version"

	"github.com/spf13/cobra"
	"github.com/spf13/pflag"
	"github.com/spf13/viper"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

const (
	defaultConfigFilename = "signoz-config"
	envPrefix             = "SIGNOZ"
)

func initZapLog() *zap.Logger {
	config := zap.NewDevelopmentConfig()
	config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	config.EncoderConfig.TimeKey = "timestamp"
	config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	logger, _ := config.Build()
	return logger
}

func NewRootCommand() *cobra.Command {
	storage := ""
	datasource := ""

	rootCmd := &cobra.Command{
		Use:   "query-service",
		Short: "Query Service for SigNoz",
		Long: `
To specify the datastore, use the --storage flag:
query-service --storage clickhouse

To specify a data source, use the --datasource flag:
query-service --datasource <URI>
		`,
		PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
			return initializeConfig(cmd)
		},
		Run: func(cmd *cobra.Command, args []string) {
			setup(storage, datasource)
		},
	}

	rootCmd.Flags().StringVarP(&storage, "storage", "s", "", "Datastore for SigNoz (clickhouse, druid, etc.)")
	rootCmd.Flags().StringVarP(&datasource, "datasource", "d", "", "Data source URI for the specified datastore")

	return rootCmd
}

func initializeConfig(cmd *cobra.Command) error {
	v := viper.New()
	v.SetConfigName(defaultConfigFilename)
	v.AddConfigPath(".")

	if err := v.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return err
		}
	}

	v.SetEnvPrefix(envPrefix)
	v.AutomaticEnv()
	bindFlags(cmd, v)

	return nil
}

func bindFlags(cmd *cobra.Command, v *viper.Viper) {
	cmd.Flags().VisitAll(func(f *pflag.Flag) {
		if strings.Contains(f.Name, "-") {
			envVarSuffix := strings.ToUpper(strings.ReplaceAll(f.Name, "-", "_"))
			v.BindEnv(f.Name, fmt.Sprintf("%s_%s", envPrefix, envVarSuffix))
		}

		if !f.Changed && v.IsSet(f.Name) {
			val := v.Get(f.Name)
			cmd.Flags().Set(f.Name, fmt.Sprintf("%v", val))
		}
	})
}

func setup(storage string, datasource string) {
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

	server, err := app.NewServer(serverOptions, storage, datasource)
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

func main() {
	cmd := NewRootCommand()
	if err := cmd.Execute(); err != nil {
		os.Exit(1)
	}
}
