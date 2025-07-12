package sqlmigration

import (
	"context"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type CustomRetentionTTLSetting struct {
	bun.BaseModel `bun:"table:custom_retention_ttl_setting"`
	types.Identifiable
	types.TimeAuditable
	TransactionID  string `bun:"transaction_id,type:text,notnull"`
	TableName      string `bun:"table_name,type:text,notnull"`
	DefaultTTLDays int    `bun:"default_ttl_days,notnull,default:15"`
	ResourceRules  string `bun:"resource_rules,type:text"`
	Status         string `bun:"status,type:text,notnull"`
	OrgID          string `json:"-" bun:"org_id,notnull"`
}

type addCustomRetentionSetting struct {
	sqlstore sqlstore.SQLStore
}

func NewAddCustomRetentionSettingFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_custom_retention_ttl"), func(ctx context.Context, providerSettings factory.ProviderSettings, config Config) (SQLMigration, error) {
		return newAddCustomRetentionSetting(ctx, providerSettings, config, sqlstore)
	})
}

func newAddCustomRetentionSetting(_ context.Context, _ factory.ProviderSettings, _ Config, sqlstore sqlstore.SQLStore) (SQLMigration, error) {
	return &addCustomRetentionSetting{sqlstore: sqlstore}, nil
}

func (migration *addCustomRetentionSetting) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}
	return nil
}

func (migration *addCustomRetentionSetting) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	_, err = tx.NewCreateTable().
		Model(new(CustomRetentionTTLSetting)).
		ForeignKey(`("org_id") REFERENCES "organizations" ("id") ON DELETE CASCADE`).
		IfNotExists().
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

func (migration *addCustomRetentionSetting) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
