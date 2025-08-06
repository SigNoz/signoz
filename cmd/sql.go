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
func RegisterSQL(parentCmd *cobra.Command, logger *slog.Logger, sqlSchemaProviderFactories func(sqlstore.SQLStore) factory.NamedMap[factory.ProviderFactory[sqlschema.SQLSchema, sqlschema.Config]], sqlstoreProviderFactories factory.NamedMap[factory.ProviderFactory[sqlstore.SQLStore, sqlstore.Config]]) {
	sqlCmd := &cobra.Command{
		Use:   "sql",
		Short: "Run commands to interact with the SQL",
	}

	migrateCmd := &cobra.Command{
		Use:   "migrate",
		Short: "Run migrations for the SQL database",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()

			config, err := NewSigNozConfig(ctx, signoz.DeprecatedFlags{})
			if err != nil {
				return err
			}

			// Initialize instrumentation
			instrumentation, err := instrumentation.New(ctx, config.Instrumentation, version.Info, "signoz")
			if err != nil {
				return err
			}

			// Get the provider settings from instrumentation
			providerSettings := instrumentation.ToProviderSettings()

			// Initialize sqlstore from the available sqlstore provider factories
			sqlstore, err := factory.NewProviderFromNamedMap(
				ctx,
				providerSettings,
				config.SQLStore,
				sqlstoreProviderFactories,
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
				sqlSchemaProviderFactories(sqlstore),
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

	rollbackCmd := &cobra.Command{
		Use:   "rollback",
		Short: "Rollback the last migration",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()

			config, err := NewSigNozConfig(ctx, signoz.DeprecatedFlags{})
			if err != nil {
				return err
			}

			// Initialize instrumentation
			instrumentation, err := instrumentation.New(ctx, config.Instrumentation, version.Info, "signoz")
			if err != nil {
				return err
			}

			// Get the provider settings from instrumentation
			providerSettings := instrumentation.ToProviderSettings()

			// Initialize sqlstore from the available sqlstore provider factories
			sqlstore, err := factory.NewProviderFromNamedMap(
				ctx,
				providerSettings,
				config.SQLStore,
				sqlstoreProviderFactories,
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
				sqlSchemaProviderFactories(sqlstore),
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

			err = sqlmigrator.New(ctx, providerSettings, sqlstore, sqlmigrations, config.SQLMigrator).Rollback(ctx)
			if err != nil {
				return err
			}

			return nil
		},
	}

	sqlCmd.AddCommand(migrateCmd)
	sqlCmd.AddCommand(rollbackCmd)
	parentCmd.AddCommand(sqlCmd)
}
