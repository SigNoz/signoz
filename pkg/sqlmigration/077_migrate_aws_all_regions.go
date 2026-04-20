package sqlmigration

import (
	"context"
	"encoding/json"
	"slices"
	"sort"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/cloudintegrationtypes"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type migrateAWSAllRegions struct {
	sqlstore sqlstore.SQLStore
}

type cloudIntegrationAWSMigrationRow struct {
	bun.BaseModel `bun:"table:cloud_integration"`

	ID     string `bun:"id"`
	Config string `bun:"config"`
}

func NewMigrateAWSAllRegionsFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("migrate_aws_all_regions"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &migrateAWSAllRegions{sqlstore: sqlstore}, nil
		},
	)
}

func (migration *migrateAWSAllRegions) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}
	return nil
}

func (migration *migrateAWSAllRegions) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	var accounts []*cloudIntegrationAWSMigrationRow
	err = tx.NewSelect().
		Model(&accounts).
		Where("provider = ?", cloudintegrationtypes.CloudProviderTypeAWS).
		Where("removed_at IS NULL").
		Scan(ctx)
	if err != nil {
		return err
	}

	type awsConfig struct {
		Regions []string `json:"regions"`
	}

	var idsToUpdate []string
	for _, account := range accounts {
		var cfg awsConfig
		if err := json.Unmarshal([]byte(account.Config), &cfg); err != nil {
			continue
		}
		if containsAllRegion(cfg.Regions) {
			idsToUpdate = append(idsToUpdate, account.ID)
		}
	}

	if len(idsToUpdate) == 0 {
		return tx.Commit()
	}

	newBytes, err := json.Marshal(map[string]any{"regions": allValidAWSRegions()})
	if err != nil {
		return err
	}

	_, err = tx.NewUpdate().
		TableExpr("cloud_integration").
		Set("config = ?", string(newBytes)).
		Where("id IN (?)", bun.In(idsToUpdate)).
		Exec(ctx)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (migration *migrateAWSAllRegions) Down(context.Context, *bun.DB) error {
	return nil
}

func containsAllRegion(regions []string) bool {
	return slices.Contains(regions, "all")
}

func allValidAWSRegions() []string {
	awsRegions := cloudintegrationtypes.SupportedRegions[cloudintegrationtypes.CloudProviderTypeAWS]
	out := make([]string, 0, len(awsRegions))
	for _, r := range awsRegions {
		out = append(out, r.StringValue())
	}
	sort.Strings(out)
	return out
}
