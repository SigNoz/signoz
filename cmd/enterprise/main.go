package main

import (
	"log/slog"

	"github.com/SigNoz/signoz/cmd"
	"github.com/SigNoz/signoz/ee/sqlschema/postgressqlschema"
	"github.com/SigNoz/signoz/ee/sqlstore/postgressqlstore"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/instrumentation"
	"github.com/SigNoz/signoz/pkg/signoz"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstorehook"
)

func main() {
	// initialize logger for logging in the cmd/ package. This logger is different from the logger used in the application.
	logger := instrumentation.NewLogger(instrumentation.Config{Logs: instrumentation.LogsConfig{Level: slog.LevelInfo}})

	// register a list of commands to the root command
	registerServer(cmd.RootCmd, logger)
	cmd.RegisterGenerate(cmd.RootCmd, logger)
	cmd.RegisterMetastore(
		cmd.RootCmd,
		logger,
		func() factory.NamedMap[factory.ProviderFactory[sqlstore.SQLStore, sqlstore.Config]] {
			factories := signoz.NewSQLStoreProviderFactories()
			if err := factories.Add(postgressqlstore.NewFactory(sqlstorehook.NewLoggingFactory())); err != nil {
				panic(err)
			}

			return factories
		},
		func(sqlstore sqlstore.SQLStore) factory.NamedMap[factory.ProviderFactory[sqlschema.SQLSchema, sqlschema.Config]] {
			factories := signoz.NewSQLSchemaProviderFactories(sqlstore)
			if err := factories.Add(postgressqlschema.NewFactory(sqlstore)); err != nil {
				panic(err)
			}

			return factories
		},
	)

	cmd.Execute(logger)
}
