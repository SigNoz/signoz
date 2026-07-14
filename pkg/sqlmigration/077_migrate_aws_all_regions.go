package sqlmigration

import (
	"context"
	"encoding/json"
	"slices"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

var awsRegions = []string{
	"af-south-1", "ap-east-1", "ap-northeast-1", "ap-northeast-2", "ap-northeast-3", "ap-south-1", "ap-south-2", "ap-southeast-1", "ap-southeast-2", "ap-southeast-3",
	"ap-southeast-4", "ap-southeast-5", "ca-central-1", "ca-west-1", "eu-central-1", "eu-central-2", "eu-north-1", "eu-south-1", "eu-south-2", "eu-west-1", "eu-west-2", "eu-west-3",
	"il-central-1", "me-central-1", "me-south-1", "sa-east-1", "us-east-1", "us-east-2", "us-west-1", "us-west-2",
}

var awsCloudProvider = valuer.NewString("aws")

type migrateAWSAllRegions struct {
	sqlstore sqlstore.SQLStore
}

type cloudIntegrationAWSMigrationRow struct {
	bun.BaseModel `bun:"table:cloud_integration"`

	ID     string `bun:"id"`
	Config string `bun:"config"`
}

type awsConfig struct {
	Regions []string `json:"regions"`
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

	accounts := make([]*cloudIntegrationAWSMigrationRow, 0)
	err = tx.NewSelect().
		Model(&accounts).
		Where("provider = ?", awsCloudProvider.StringValue()).
		Where("removed_at IS NULL").
		Scan(ctx)
	if err != nil {
		return err
	}

	idsToUpdate := make([]string, 0)
	for _, account := range accounts {
		var cfg awsConfig
		if err := json.Unmarshal([]byte(account.Config), &cfg); err != nil {
			continue
		}
		if slices.Contains(cfg.Regions, "all") {
			idsToUpdate = append(idsToUpdate, account.ID)
		}
	}

	if len(idsToUpdate) == 0 {
		return tx.Commit()
	}

	configBytes, err := migration.getAllRegionsConfig()
	if err != nil {
		return err
	}

	_, err = tx.NewUpdate().
		TableExpr("cloud_integration").
		Set("config = ?", string(configBytes)).
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

func (migration *migrateAWSAllRegions) getAllRegionsConfig() ([]byte, error) {
	cfg := awsConfig{Regions: awsRegions}
	newBytes, err := json.Marshal(cfg)
	if err != nil {
		return nil, err
	}

	return newBytes, nil
}
