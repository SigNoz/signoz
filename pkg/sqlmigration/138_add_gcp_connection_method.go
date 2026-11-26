package sqlmigration

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addGCPConnectionMethod struct {
	logger *slog.Logger
}

type gcpConnectionMethodMigrationRow struct {
	bun.BaseModel `bun:"table:cloud_integration"`

	ID     string `bun:"id"`
	Config string `bun:"config"`
}

func NewAddGCPConnectionMethodFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_gcp_connection_method"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &addGCPConnectionMethod{logger: ps.Logger}, nil
	})
}

func (migration *addGCPConnectionMethod) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *addGCPConnectionMethod) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	var accounts []*gcpConnectionMethodMigrationRow
	if err := tx.NewSelect().
		Model(&accounts).
		Where("provider = ?", "gcp").
		Scan(ctx); err != nil {
		return err
	}

	for _, account := range accounts {
		// Preserve config fields that are not known to this migration.
		var config map[string]json.RawMessage
		if err := json.Unmarshal([]byte(account.Config), &config); err != nil {
			migration.logger.WarnContext(ctx, "skipping GCP account with unreadable config", slog.String("account_id", account.ID), errors.Attr(err))
			continue
		}
		if config == nil {
			migration.logger.WarnContext(ctx, "skipping GCP account with null config", slog.String("account_id", account.ID))
			continue
		}
		if _, exists := config["connectionMethod"]; exists {
			continue
		}

		config["connectionMethod"] = json.RawMessage(`"manual"`)
		encoded, err := json.Marshal(config)
		if err != nil {
			return err
		}

		if _, err := tx.NewUpdate().
			Model((*gcpConnectionMethodMigrationRow)(nil)).
			Set("config = ?", string(encoded)).
			Where("id = ?", account.ID).
			Exec(ctx); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (migration *addGCPConnectionMethod) Down(context.Context, *bun.DB) error {
	return nil
}
