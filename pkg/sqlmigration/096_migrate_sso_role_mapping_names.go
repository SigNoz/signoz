package sqlmigration

import (
	"context"
	"encoding/json"
	"log/slog"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type migrateSSORoleMappingNames struct {
	sqlstore sqlstore.SQLStore
	logger   *slog.Logger
}

type authDomainRow struct {
	bun.BaseModel `bun:"table:auth_domain"`

	ID   string `bun:"id"`
	Data string `bun:"data"`
}

var legacyRoleToManagedRoleName = map[string]string{
	"ADMIN":  "signoz-admin",
	"EDITOR": "signoz-editor",
	"VIEWER": "signoz-viewer",
}

type ssoRoleMapping struct {
	DefaultRole      string            `json:"defaultRole"`
	GroupMappings    map[string]string `json:"groupMappings"`
	UseRoleAttribute bool              `json:"useRoleAttribute"`
}

func NewMigrateSSORoleMappingNamesFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("migrate_sso_role_mapping_names"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &migrateSSORoleMappingNames{sqlstore: sqlstore, logger: ps.Logger}, nil
		},
	)
}

func (migration *migrateSSORoleMappingNames) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *migrateSSORoleMappingNames) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	rows := make([]*authDomainRow, 0)
	if err := tx.NewSelect().Model(&rows).Scan(ctx); err != nil {
		return err
	}

	for _, row := range rows {
		config := make(map[string]json.RawMessage)
		if err := json.Unmarshal([]byte(row.Data), &config); err != nil {
			migration.logger.WarnContext(ctx, "skipping auth domain with unreadable data", slog.String("auth_domain_id", row.ID), errors.Attr(err))
			continue
		}

		roleMappingRaw, ok := config["roleMapping"]
		if !ok || string(roleMappingRaw) == "null" {
			continue
		}

		var roleMapping ssoRoleMapping
		if err := json.Unmarshal(roleMappingRaw, &roleMapping); err != nil {
			migration.logger.WarnContext(ctx, "skipping auth domain with unreadable role mapping", slog.String("auth_domain_id", row.ID), errors.Attr(err))
			continue
		}

		changed := false
		if managed, ok := legacyRoleToManagedRoleName[strings.ToUpper(roleMapping.DefaultRole)]; ok {
			roleMapping.DefaultRole = managed
			changed = true
		}
		for group, role := range roleMapping.GroupMappings {
			if managed, ok := legacyRoleToManagedRoleName[strings.ToUpper(role)]; ok {
				roleMapping.GroupMappings[group] = managed
				changed = true
			}
		}

		if !changed {
			continue
		}

		newRoleMapping, err := json.Marshal(roleMapping)
		if err != nil {
			return err
		}
		config["roleMapping"] = newRoleMapping

		newData, err := json.Marshal(config)
		if err != nil {
			return err
		}

		if _, err := tx.NewUpdate().
			Model((*authDomainRow)(nil)).
			Set("data = ?", string(newData)).
			Where("id = ?", row.ID).
			Exec(ctx); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (migration *migrateSSORoleMappingNames) Down(context.Context, *bun.DB) error {
	return nil
}
