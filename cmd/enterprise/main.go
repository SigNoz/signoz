package main

import (
	"context"
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

	// TODO(grandwizard28): DRY this code
	sqlstoreFactories := signoz.NewSQLStoreProviderFactories()
	if err := sqlstoreFactories.Add(postgressqlstore.NewFactory(sqlstorehook.NewLoggingFactory())); err != nil {
		logger.ErrorContext(context.TODO(), "failed to add postgressqlstore factory", "error", err)
		panic(err)
	}

	cmd.RegisterSQL(cmd.RootCmd, logger, func(sqlstore sqlstore.SQLStore) factory.NamedMap[factory.ProviderFactory[sqlschema.SQLSchema, sqlschema.Config]] {
		existingFactories := signoz.NewSQLSchemaProviderFactories(sqlstore)
		if err := existingFactories.Add(postgressqlschema.NewFactory(sqlstore)); err != nil {
			panic(err)
		}

		return existingFactories
	}, sqlstoreFactories)

	cmd.Execute(logger)
}
