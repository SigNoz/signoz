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

	rows, err := tx.QueryContext(ctx,
		`SELECT id, config FROM cloud_integration WHERE provider = ? AND removed_at is NULL`,
		cloudintegrationtypes.CloudProviderTypeAWS.StringValue(),
	)
	if err != nil {
		return err
	}
	defer rows.Close()

	var idsToUpdate []string

	for rows.Next() {
		var id, cfgStr string
		if err := rows.Scan(&id, &cfgStr); err != nil {
			return err
		}

		var cfg cloudintegrationtypes.AWSAccountConfig
		if err := json.Unmarshal([]byte(cfgStr), &cfg); err != nil {
			continue
		}

		if !containsAllRegion(cfg.Regions) {
			continue
		}

		idsToUpdate = append(idsToUpdate, id)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	rows.Close()

	if len(idsToUpdate) == 0 {
		return tx.Commit()
	}

	newCfg := cloudintegrationtypes.AWSAccountConfig{Regions: allValidAWSRegions()}
	newBytes, err := json.Marshal(&newCfg)
	if err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx,
		`UPDATE cloud_integration SET config = ? WHERE id IN (?)`,
		string(newBytes), bun.In(idsToUpdate),
	); err != nil {
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
	out := make([]string, 0, len(cloudintegrationtypes.ValidAWSRegions))
	for r := range cloudintegrationtypes.ValidAWSRegions {
		out = append(out, r)
	}
	sort.Strings(out)
	return out
}
