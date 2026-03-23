package sqlmigration

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type updateCloudIntegrationUniqueIndex struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewUpdateCloudIntegrationUniqueIndexFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("update_cloud_integration_index"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &updateCloudIntegrationUniqueIndex{
				sqlstore:  sqlstore,
				sqlschema: sqlschema,
			}, nil
		},
	)
}

func (migration *updateCloudIntegrationUniqueIndex) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

type cloudIntegrationRow struct {
	bun.BaseModel `bun:"table:cloud_integration"`

	ID        string    `bun:"id"`
	AccountID string    `bun:"account_id"`
	Provider  string    `bun:"provider"`
	OrgID     string    `bun:"org_id"`
	Config    string    `bun:"config"`
	UpdatedAt time.Time `bun:"updated_at"`
}

type cloudIntegrationAccountConfig struct {
	Regions []string `json:"regions"`
}

// duplicateGroup holds the keeper (first element) and losers (rest) for a duplicate (account_id, provider, org_id) group.
type duplicateGroup struct {
	keeper *cloudIntegrationRow
	losers []*cloudIntegrationRow
}

func (migration *updateCloudIntegrationUniqueIndex) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	sqls := [][]byte{}

	// Step 1: Drop the wrong index on (id, provider, org_id)
	dropSqls := migration.sqlschema.Operator().DropIndex(
		(&sqlschema.UniqueIndex{
			TableName:   "cloud_integration",
			ColumnNames: []sqlschema.ColumnName{"id", "provider", "org_id"},
		}).Named("unique_cloud_integration"),
	)
	sqls = append(sqls, dropSqls...)

	// Step 2: Normalize empty-string account_id to NULL
	// Older table structure could store "" instead of NULL for unconnected accounts.
	// Empty strings would violate the partial unique index since '' = '' (unlike NULL != NULL).
	_, err = tx.NewUpdate().
		TableExpr("cloud_integration").
		Set("account_id = NULL").
		Where("account_id = ''").
		Exec(ctx)
	if err != nil {
		return err
	}

	// Step 3: Fetch all active rows with non-null account_id, ordered for grouping
	var activeRows []*cloudIntegrationRow
	err = tx.NewSelect().
		Model(&activeRows).
		Where("removed_at IS NULL").
		Where("account_id IS NOT NULL").
		OrderExpr("account_id, provider, org_id, updated_at DESC").
		Scan(ctx)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return err
	}

	// Group by (account_id, provider, org_id)
	groups := groupCloudIntegrationRows(activeRows)

	now := time.Now()
	var loserIDs []string

	for _, group := range groups {
		if len(group.losers) == 0 {
			continue
		}

		// Step 4: Merge config from losers into keeper
		if err = mergeCloudIntegrationConfigs(ctx, tx, group); err != nil {
			return err
		}

		// Step 5: Reassign non-conflicting cloud_integration_service rows to keeper
		for _, loser := range group.losers {
			_, err = tx.NewUpdate().
				TableExpr("cloud_integration_service").
				Set("cloud_integration_id = ?", group.keeper.ID).
				Where("cloud_integration_id = ?", loser.ID).
				Where("type NOT IN (?)",
					tx.NewSelect().
						TableExpr("cloud_integration_service").
						Column("type").
						Where("cloud_integration_id = ?", group.keeper.ID),
				).
				Exec(ctx)
			if err != nil {
				return err
			}

			loserIDs = append(loserIDs, loser.ID)
		}
	}

	// Step 6: Soft-delete all loser rows
	if len(loserIDs) > 0 {
		_, err = tx.NewUpdate().
			TableExpr("cloud_integration").
			Set("removed_at = ?", now).
			Set("updated_at = ?", now).
			Where("id IN (?)", bun.In(loserIDs)).
			Exec(ctx)
		if err != nil {
			return err
		}
	}

	// Step 7: Create the correct partial unique index on (account_id, provider, org_id) WHERE removed_at IS NULL
	createSqls := migration.sqlschema.Operator().CreateIndex(
		&sqlschema.PartialUniqueIndex{
			TableName:   "cloud_integration",
			ColumnNames: []sqlschema.ColumnName{"account_id", "provider", "org_id"},
			Where:       "removed_at IS NULL",
		},
	)
	sqls = append(sqls, createSqls...)

	for _, sql := range sqls {
		if _, err = tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (migration *updateCloudIntegrationUniqueIndex) Down(ctx context.Context, db *bun.DB) error {
	return nil
}

// groupCloudIntegrationRows groups rows by (account_id, provider, org_id).
// Rows must be pre-sorted by account_id, provider, org_id, updated_at DESC
// so the first row in each group is the keeper (most recently updated).
func groupCloudIntegrationRows(rows []*cloudIntegrationRow) []duplicateGroup {
	if len(rows) == 0 {
		return nil
	}

	var groups []duplicateGroup
	var current duplicateGroup
	current.keeper = rows[0]

	for i := 1; i < len(rows); i++ {
		row := rows[i]
		if row.AccountID == current.keeper.AccountID &&
			row.Provider == current.keeper.Provider &&
			row.OrgID == current.keeper.OrgID {
			current.losers = append(current.losers, row)
		} else {
			groups = append(groups, current)
			current = duplicateGroup{keeper: row}
		}
	}
	groups = append(groups, current)

	return groups
}

// mergeCloudIntegrationConfigs unions the EnabledRegions from all rows in the group into the keeper's config and updates
func mergeCloudIntegrationConfigs(ctx context.Context, tx bun.Tx, group duplicateGroup) error {
	regionSet := make(map[string]struct{})

	// Parse keeper's config
	parseRegions(group.keeper.Config, regionSet)

	// Parse each loser's config
	for _, loser := range group.losers {
		parseRegions(loser.Config, regionSet)
	}

	// Build merged config
	mergedRegions := make([]string, 0, len(regionSet))
	for region := range regionSet {
		mergedRegions = append(mergedRegions, region)
	}

	merged := cloudIntegrationAccountConfig{Regions: mergedRegions}
	mergedJSON, err := json.Marshal(merged)
	if err != nil {
		return err
	}

	// Update keeper's config
	_, err = tx.NewUpdate().
		TableExpr("cloud_integration").
		Set("config = ?", string(mergedJSON)).
		Where("id = ?", group.keeper.ID).
		Exec(ctx)
	return err
}

// parseRegions unmarshals a config JSON string and adds its regions to the set.
func parseRegions(configJSON string, regionSet map[string]struct{}) {
	if configJSON == "" {
		return
	}

	var config cloudIntegrationAccountConfig
	if err := json.Unmarshal([]byte(configJSON), &config); err != nil {
		return
	}

	for _, region := range config.Regions {
		regionSet[region] = struct{}{}
	}
}
