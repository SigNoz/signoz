package cmd

import (
	"log/slog"

	"github.com/spf13/cobra"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/instrumentation"
	"github.com/SigNoz/signoz/pkg/signoz"
	"github.com/SigNoz/signoz/pkg/sqlmigration"
	"github.com/SigNoz/signoz/pkg/sqlmigrator"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/version"
)

func RegisterMetastore(parentCmd *cobra.Command, logger *slog.Logger, sqlstoreProviderFactories func() factory.NamedMap[factory.ProviderFactory[sqlstore.SQLStore, sqlstore.Config]], sqlschemaProviderFactories func(sqlstore.SQLStore) factory.NamedMap[factory.ProviderFactory[sqlschema.SQLSchema, sqlschema.Config]]) {
	metastoreCmd := &cobra.Command{
		Use:               "metastore",
		Short:             "Run commands to interact with the Metastore",
		SilenceUsage:      true,
		SilenceErrors:     true,
		CompletionOptions: cobra.CompletionOptions{DisableDefaultCmd: true},
	}

	registerMigrate(metastoreCmd, logger, sqlstoreProviderFactories, sqlschemaProviderFactories)

	parentCmd.AddCommand(metastoreCmd)
}

func registerMigrate(parentCmd *cobra.Command, logger *slog.Logger, sqlstoreProviderFactories func() factory.NamedMap[factory.ProviderFactory[sqlstore.SQLStore, sqlstore.Config]], sqlschemaProviderFactories func(sqlstore.SQLStore) factory.NamedMap[factory.ProviderFactory[sqlschema.SQLSchema, sqlschema.Config]]) {
	migrateCmd := &cobra.Command{
		Use:               "migrate",
		Short:             "Run migrations for the Metastore",
		SilenceUsage:      true,
		SilenceErrors:     true,
		CompletionOptions: cobra.CompletionOptions{DisableDefaultCmd: true},
	}

	registerSync(migrateCmd, logger, sqlstoreProviderFactories, sqlschemaProviderFactories)

	parentCmd.AddCommand(migrateCmd)
}

func registerSync(parentCmd *cobra.Command, logger *slog.Logger, sqlstoreProviderFactories func() factory.NamedMap[factory.ProviderFactory[sqlstore.SQLStore, sqlstore.Config]], sqlschemaProviderFactories func(sqlstore.SQLStore) factory.NamedMap[factory.ProviderFactory[sqlschema.SQLSchema, sqlschema.Config]]) {
	syncCmd := &cobra.Command{
		Use:               "sync",
		Short:             "Runs 'sync' migrations for the metastore. Sync migrations are used to mutate schemas of the metastore. These migrations need to be successfully applied before bringing up the application.",
		SilenceUsage:      true,
		SilenceErrors:     true,
		CompletionOptions: cobra.CompletionOptions{DisableDefaultCmd: true},
	}

	registerSyncUp(syncCmd, logger, sqlstoreProviderFactories, sqlschemaProviderFactories)

	parentCmd.AddCommand(syncCmd)
}

func registerSyncUp(parentCmd *cobra.Command, logger *slog.Logger, sqlstoreProviderFactories func() factory.NamedMap[factory.ProviderFactory[sqlstore.SQLStore, sqlstore.Config]], sqlschemaProviderFactories func(sqlstore.SQLStore) factory.NamedMap[factory.ProviderFactory[sqlschema.SQLSchema, sqlschema.Config]]) {
	var configFiles []string

	syncUpCmd := &cobra.Command{
		Use:               "up",
		Short:             "Runs 'up' migrations for the metastore. Up migrations are used to apply new migrations to the metastore",
		SilenceUsage:      true,
		SilenceErrors:     true,
		CompletionOptions: cobra.CompletionOptions{DisableDefaultCmd: true},
		RunE: func(currCmd *cobra.Command, args []string) error {
			ctx := currCmd.Context()

			config, err := NewSigNozConfig(ctx, logger, configFiles)
			if err != nil {
				return err
			}

			instrumentation, err := instrumentation.New(ctx, config.Instrumentation, version.Info, "signoz")
			if err != nil {
				return err
			}

			providerSettings := instrumentation.ToProviderSettings()

			sqlstore, err := factory.NewProviderFromNamedMap(ctx, providerSettings, config.SQLStore, sqlstoreProviderFactories(), config.SQLStore.Provider)
			if err != nil {
				return err
			}

			sqlschema, err := factory.NewProviderFromNamedMap(ctx, providerSettings, config.SQLSchema, sqlschemaProviderFactories(sqlstore), config.SQLStore.Provider)
			if err != nil {
				return err
			}

			telemetrystore, err := factory.NewProviderFromNamedMap(ctx, providerSettings, config.TelemetryStore, signoz.NewTelemetryStoreProviderFactories(), config.TelemetryStore.Provider)
			if err != nil {
				return err
			}

			sqlmigrations, err := sqlmigration.New(ctx, providerSettings, config.SQLMigration, signoz.NewSQLMigrationProviderFactories(sqlstore, sqlschema, telemetrystore, providerSettings))
			if err != nil {
				return err
			}

			return sqlmigrator.New(ctx, providerSettings, sqlstore, sqlmigrations, config.SQLMigrator).Migrate(ctx)
		},
	}

	syncUpCmd.Flags().StringArrayVar(&configFiles, "config", nil, "path to a YAML configuration file (can be specified multiple times, later files override earlier ones)")
	parentCmd.AddCommand(syncUpCmd)
}
