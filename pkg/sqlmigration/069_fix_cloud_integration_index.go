package sqlmigration

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type fixCloudIntegrationUniqueIndex struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewFixCloudIntegrationUniqueIndexFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("fix_cloud_integration_index"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &fixCloudIntegrationUniqueIndex{
				sqlstore:  sqlstore,
				sqlschema: sqlschema,
			}, nil
		},
	)
}

func (migration *fixCloudIntegrationUniqueIndex) Register(migrations *migrate.Migrations) error {
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

func (migration *fixCloudIntegrationUniqueIndex) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	// Step 1: Drop the wrong index on (id, provider, org_id)
	dropSqls := migration.sqlschema.Operator().DropIndex(
		(&sqlschema.UniqueIndex{
			TableName:   "cloud_integration",
			ColumnNames: []sqlschema.ColumnName{"id", "provider", "org_id"},
		}).Named("unique_cloud_integration"),
	)
	for _, sql := range dropSqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	// Step 2: Fetch all active rows with non-null account_id, ordered for grouping
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

		// Step 3: Merge config from losers into keeper
		if err = mergeCloudIntegrationConfigs(ctx, tx, group); err != nil {
			return err
		}

		// Step 4: Reassign orphaned cloud_integration_service rows
		for _, loser := range group.losers {
			// Delete services from loser that would conflict with keeper's services (same type)
			_, err = tx.NewDelete().
				TableExpr("cloud_integration_service").
				Where("cloud_integration_id = ?", loser.ID).
				Where("type IN (?)",
					tx.NewSelect().
						TableExpr("cloud_integration_service").
						Column("type").
						Where("cloud_integration_id = ?", group.keeper.ID),
				).
				Exec(ctx)
			if err != nil {
				return err
			}

			// Reassign remaining services to the keeper
			_, err = tx.ExecContext(ctx,
				"UPDATE cloud_integration_service SET cloud_integration_id = ? WHERE cloud_integration_id = ?",
				group.keeper.ID, loser.ID,
			)
			if err != nil {
				return err
			}

			loserIDs = append(loserIDs, loser.ID)
		}
	}

	// Step 5: Soft-delete all loser rows
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

	// Step 6: Create correct partial unique index on (account_id, provider, org_id) WHERE removed_at IS NULL
	createSqls := migration.sqlschema.Operator().CreateIndex(
		&sqlschema.PartialUniqueIndex{
			TableName:   "cloud_integration",
			ColumnNames: []sqlschema.ColumnName{"account_id", "provider", "org_id"},
			Where:       "removed_at IS NULL",
		},
	)
	for _, sql := range createSqls {
		if _, err = tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (migration *fixCloudIntegrationUniqueIndex) Down(ctx context.Context, db *bun.DB) error {
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
