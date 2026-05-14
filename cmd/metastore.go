package cmd

import (
	"context"
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

type SQLStoreProviderFactories func() factory.NamedMap[factory.ProviderFactory[sqlstore.SQLStore, sqlstore.Config]]
type SQLSchemaProviderFactories func(sqlstore.SQLStore) factory.NamedMap[factory.ProviderFactory[sqlschema.SQLSchema, sqlschema.Config]]

func RegisterMetastore(parentCmd *cobra.Command, logger *slog.Logger, sqlstoreProviderFactories SQLStoreProviderFactories, sqlschemaProviderFactories SQLSchemaProviderFactories) {
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

func registerMigrate(parentCmd *cobra.Command, logger *slog.Logger, sqlstoreProviderFactories SQLStoreProviderFactories, sqlschemaProviderFactories SQLSchemaProviderFactories) {
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

func registerSync(parentCmd *cobra.Command, logger *slog.Logger, sqlstoreProviderFactories SQLStoreProviderFactories, sqlschemaProviderFactories SQLSchemaProviderFactories) {
	syncCmd := &cobra.Command{
		Use:               "sync",
		Short:             "Runs 'sync' migrations for the metastore. Sync migrations are used to mutate schemas of the metastore. These migrations need to be successfully applied before bringing up the application.",
		SilenceUsage:      true,
		SilenceErrors:     true,
		CompletionOptions: cobra.CompletionOptions{DisableDefaultCmd: true},
	}

	registerSyncUp(syncCmd, logger, sqlstoreProviderFactories, sqlschemaProviderFactories)
	registerSyncCheck(syncCmd, logger, sqlstoreProviderFactories, sqlschemaProviderFactories)

	parentCmd.AddCommand(syncCmd)
}

func registerSyncUp(parentCmd *cobra.Command, logger *slog.Logger, sqlstoreProviderFactories SQLStoreProviderFactories, sqlschemaProviderFactories SQLSchemaProviderFactories) {
	var configFiles []string

	syncUpCmd := &cobra.Command{
		Use:                "up",
		Short:              "Runs 'up' migrations for the metastore. Up migrations are used to apply new migrations to the metastore",
		FParseErrWhitelist: cobra.FParseErrWhitelist{UnknownFlags: true},
		RunE: func(currCmd *cobra.Command, args []string) error {
			config, err := NewSigNozConfig(currCmd.Context(), logger, configFiles)
			if err != nil {
				return err
			}

			return runSyncUp(currCmd.Context(), config, sqlstoreProviderFactories, sqlschemaProviderFactories)
		},
	}

	syncUpCmd.Flags().StringArrayVar(&configFiles, "config", nil, "path to a YAML configuration file (can be specified multiple times, later files override earlier ones)")
	parentCmd.AddCommand(syncUpCmd)
}

func registerSyncCheck(parentCmd *cobra.Command, logger *slog.Logger, sqlstoreProviderFactories SQLStoreProviderFactories, sqlschemaProviderFactories SQLSchemaProviderFactories) {
	var configFiles []string

	syncCheckCmd := &cobra.Command{
		Use:                "check",
		Short:              "Runs a check for 'sync' migrations on the metastore. Returns a non-zero exit code if any migrations are pending.",
		FParseErrWhitelist: cobra.FParseErrWhitelist{UnknownFlags: true},
		RunE: func(currCmd *cobra.Command, args []string) error {
			config, err := NewSigNozConfig(currCmd.Context(), logger, configFiles)
			if err != nil {
				return err
			}

			return runSyncCheck(currCmd.Context(), config, sqlstoreProviderFactories, sqlschemaProviderFactories)
		},
	}

	syncCheckCmd.Flags().StringArrayVar(&configFiles, "config", nil, "path to a YAML configuration file (can be specified multiple times, later files override earlier ones)")
	parentCmd.AddCommand(syncCheckCmd)
}

func runSyncUp(ctx context.Context, config signoz.Config, sqlstoreProviderFactories SQLStoreProviderFactories, sqlschemaProviderFactories SQLSchemaProviderFactories) error {
	migrator, err := newSyncMigrator(ctx, config, sqlstoreProviderFactories, sqlschemaProviderFactories)
	if err != nil {
		return err
	}

	return migrator.Migrate(ctx)
}

func runSyncCheck(ctx context.Context, config signoz.Config, sqlstoreProviderFactories SQLStoreProviderFactories, sqlschemaProviderFactories SQLSchemaProviderFactories) error {
	migrator, err := newSyncMigrator(ctx, config, sqlstoreProviderFactories, sqlschemaProviderFactories)
	if err != nil {
		return err
	}

	return migrator.Check(ctx)
}

func newSyncMigrator(ctx context.Context, config signoz.Config, sqlstoreProviderFactories SQLStoreProviderFactories, sqlschemaProviderFactories SQLSchemaProviderFactories) (sqlmigrator.SQLMigrator, error) {
	instrumentation, err := instrumentation.New(ctx, config.Instrumentation, version.Info, "signoz")
	if err != nil {
		return nil, err
	}

	providerSettings := instrumentation.ToProviderSettings()

	sqlstore, err := factory.NewProviderFromNamedMap(ctx, providerSettings, config.SQLStore, sqlstoreProviderFactories(), config.SQLStore.Provider)
	if err != nil {
		return nil, err
	}

	sqlschema, err := factory.NewProviderFromNamedMap(ctx, providerSettings, config.SQLSchema, sqlschemaProviderFactories(sqlstore), config.SQLStore.Provider)
	if err != nil {
		return nil, err
	}

	telemetrystore, err := factory.NewProviderFromNamedMap(ctx, providerSettings, config.TelemetryStore, signoz.NewTelemetryStoreProviderFactories(), config.TelemetryStore.Provider)
	if err != nil {
		return nil, err
	}

	sqlmigrations, err := sqlmigration.New(ctx, providerSettings, config.SQLMigration, signoz.NewSQLMigrationProviderFactories(sqlstore, sqlschema, telemetrystore, providerSettings))
	if err != nil {
		return nil, err
	}

	return sqlmigrator.New(ctx, providerSettings, sqlstore, sqlmigrations, config.SQLMigrator), nil
}
