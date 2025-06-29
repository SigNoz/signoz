package sqlmigration

import (
	"context"
	"errors"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

// SQLMigration is the interface for a single migration. The following naming conventions are used while creating tables:
//   - Primary keys are named as `pk_<table_name>`.
//   - Foreign key constraints are named as `fk_<table_name>_<column_name>`.
//   - Unique constraints are named as `uk_<table_name>_<column_names>`. The column names are separated by underscores.
//   - Check constraints are named as `ck_<table_name>_<name>`. The name is the name of the check constraint.
//   - Indexes are named as `ix_<table_name>_<column_names>`. The column names are separated by underscores.

type SQLMigration interface {
	// Register registers the migration with the given migrations. Each migration needs to be registered
	//in a dedicated `*.go` file so that the correct migration semantics can be detected.
	Register(*migrate.Migrations) error

	// Up runs the migration.
	Up(context.Context, *bun.DB) error

	// Down rolls back the migration.
	Down(context.Context, *bun.DB) error
}

var (
	ErrNoExecute = errors.New("no execute")
)

var (
	OrgReference                = "org"
	UserReference               = "user"
	UserReferenceNoCascade      = "user_no_cascade"
	FactorPasswordReference     = "factor_password"
	CloudIntegrationReference   = "cloud_integration"
	AgentConfigVersionReference = "agent_config_version"
)

func New(
	ctx context.Context,
	settings factory.ProviderSettings,
	config Config,
	factories factory.NamedMap[factory.ProviderFactory[SQLMigration, Config]],
) (*migrate.Migrations, error) {
	migrations := migrate.NewMigrations()

	for _, factory := range factories.GetInOrder() {
		migration, err := factory.New(ctx, settings, config)
		if err != nil {
			return nil, err
		}

		err = migration.Register(migrations)
		if err != nil {
			return nil, err
		}
	}

	return migrations, nil
}

func MustNew(
	ctx context.Context,
	settings factory.ProviderSettings,
	config Config,
	factories factory.NamedMap[factory.ProviderFactory[SQLMigration, Config]],
) *migrate.Migrations {
	migrations, err := New(ctx, settings, config, factories)
	if err != nil {
		panic(err)
	}
	return migrations
}
