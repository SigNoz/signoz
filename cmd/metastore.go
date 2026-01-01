package cmd

import (
	"log/slog"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/instrumentation"
	"github.com/SigNoz/signoz/pkg/signoz"
	"github.com/SigNoz/signoz/pkg/sqlmigration"
	"github.com/SigNoz/signoz/pkg/sqlmigrator"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/version"
	"github.com/spf13/cobra"
)

// TODO(grandwizard28): DRY this code
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
	syncUpCmd := &cobra.Command{
		Use:               "sync",
		Short:             "Runs 'sync' migrations for the metastore. Sync migrations are used to mutate schemas of the metastore. These migrations need to be successfully applied before bringing up the application.",
		SilenceUsage:      true,
		SilenceErrors:     true,
		CompletionOptions: cobra.CompletionOptions{DisableDefaultCmd: true},
	}

	registerSyncUp(syncUpCmd, logger, sqlstoreProviderFactories, sqlschemaProviderFactories)

	parentCmd.AddCommand(syncUpCmd)
}

func registerSyncUp(parentCmd *cobra.Command, logger *slog.Logger, sqlstoreProviderFactories func() factory.NamedMap[factory.ProviderFactory[sqlstore.SQLStore, sqlstore.Config]], sqlschemaProviderFactories func(sqlstore.SQLStore) factory.NamedMap[factory.ProviderFactory[sqlschema.SQLSchema, sqlschema.Config]]) {
	syncUpCmd := &cobra.Command{
		Use:               "up",
		Short:             "Runs 'up' migrations for the metastore. Up migrations are used to apply new migrations to the metastore",
		SilenceUsage:      true,
		SilenceErrors:     true,
		CompletionOptions: cobra.CompletionOptions{DisableDefaultCmd: true},
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()

			config, err := NewSigNozConfig(ctx, logger, signoz.DeprecatedFlags{})
			if err != nil {
				return err
			}

			// Initialize instrumentation
			instrumentation, err := instrumentation.New(ctx, config.Instrumentation, version.Info, "signoz")
			if err != nil {
				return err
			}

			providerSettings := instrumentation.ToProviderSettings()

			// Initialize sqlstore from the available sqlstore provider factories
			sqlstore, err := factory.NewProviderFromNamedMap(
				ctx,
				providerSettings,
				config.SQLStore,
				sqlstoreProviderFactories(),
				config.SQLStore.Provider,
			)
			if err != nil {
				return err
			}

			// Initialize sqlschema from the available sqlschema provider factories
			sqlschema, err := factory.NewProviderFromNamedMap(
				ctx,
				providerSettings,
				config.SQLSchema,
				sqlschemaProviderFactories(sqlstore),
				config.SQLStore.Provider,
			)
			if err != nil {
				return err
			}

			// Run migrations on the sqlstore
			sqlmigrations, err := sqlmigration.New(
				ctx,
				providerSettings,
				config.SQLMigration,
				signoz.NewSQLMigrationProviderFactories(sqlstore, sqlschema),
			)
			if err != nil {
				return err
			}

			err = sqlmigrator.New(ctx, providerSettings, sqlstore, sqlmigrations, config.SQLMigrator).Migrate(ctx)
			if err != nil {
				return err
			}

			return nil
		},
	}

	parentCmd.AddCommand(syncUpCmd)
}
