package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type updateRules struct {
	store sqlstore.SQLStore
}

type StorablePlannedMaintenanceRule struct {
	bun.BaseModel `bun:"table:planned_maintenance_rule"`
	types.Identifiable
	PlannedMaintenanceID valuer.UUID `bun:"planned_maintenance_id,type:text"`
	RuleID               valuer.UUID `bun:"rule_id,type:text"`
}

type Rule struct {
	bun.BaseModel `bun:"table:rule"`
	types.Identifiable
	types.TimeAuditable
	types.UserAuditable
	Deleted int    `bun:"deleted,notnull,default:0"`
	Data    string `bun:"data,type:text,notnull"`
	OrgID   string `bun:"org_id,type:text"`
}

type StorablePlannedMaintenance struct {
	bun.BaseModel `bun:"table:planned_maintenance_new"`
	types.Identifiable
	types.TimeAuditable
	types.UserAuditable
	Name        string              `bun:"name,type:text,notnull"`
	Description string              `bun:"description,type:text"`
	Schedule    *ruletypes.Schedule `bun:"schedule,type:text,notnull"`
	OrgID       string              `bun:"org_id,type:text"`
}

func NewUpdateRulesFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.
		NewProviderFactory(
			factory.MustNewName("update_reset_rules"),
			func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
				return newUpdateRules(ctx, ps, c, sqlstore)
			})
}

func newUpdateRules(_ context.Context, _ factory.ProviderSettings, _ Config, store sqlstore.SQLStore) (SQLMigration, error) {
	return &updateRules{store: store}, nil
}

func (migration *updateRules) Register(migrations *migrate.Migrations) error {
	if err := migrations.
		Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *updateRules) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.
		BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer tx.Rollback()

	_, err = migration.
		store.
		BunDB().
		NewCreateTable().
		IfNotExists().
		Model(new(StorablePlannedMaintenanceRule)).
		Exec(ctx)
	if err != nil {
		return err
	}

	_, err = migration.
		store.
		BunDB().
		NewCreateTable().
		IfNotExists().
		Model(new(Rule)).
		Exec(ctx)
	if err != nil {
		return err
	}

	_, err = migration.
		store.
		BunDB().
		NewCreateTable().
		IfNotExists().
		Model(new(StorablePlannedMaintenance)).
		Exec(ctx)
	if err != nil {
		return err
	}

	err = tx.Commit()
	if err != nil {
		return err
	}

	return nil
}

func (migration *updateRules) Down(context.Context, *bun.DB) error {
	return nil
}
