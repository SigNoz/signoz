package sqlmigration

import (
	"context"
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type migrateAuthDomainPayload struct {
	sqlstore sqlstore.SQLStore
}

type authDomainPayloadRaw struct {
	bun.BaseModel `bun:"table:auth_domain"`

	ID   string `bun:"id"`
	Data string `bun:"data"`
}

// auth config type -> old sso type
var legacyConfigKeyByType = map[string]string{
	"saml":        "samlConfig",
	"oidc":        "oidcConfig",
	"google_auth": "googleAuthConfig",
}

func NewMigrateAuthDomainPayloadFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("migrate_auth_domain_payload"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &migrateAuthDomainPayload{sqlstore: sqlstore}, nil
		},
	)
}

func (migration *migrateAuthDomainPayload) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *migrateAuthDomainPayload) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	var rows []*authDomainPayloadRaw
	if err := tx.NewSelect().Model(&rows).Scan(ctx); err != nil {
		return err
	}

	for _, row := range rows {
		var oldData map[string]json.RawMessage
		if err := json.Unmarshal([]byte(row.Data), &oldData); err != nil {
			return err
		}

		// idempotency - we skip the ones which already migrated
		if _, hasProvider := oldData["provider"]; hasProvider {
			continue
		}
		if _, hasSSOType := oldData["ssoType"]; !hasSSOType {
			continue
		}

		var ssoType string
		if err := json.Unmarshal(oldData["ssoType"], &ssoType); err != nil {
			return err
		}

		provider := map[string]json.RawMessage{
			"type": oldData["ssoType"],
		}

		// get from old data and set config in provider
		if configKey, ok := legacyConfigKeyByType[ssoType]; ok {
			if cfg, ok := oldData[configKey]; ok {
				provider["config"] = cfg
			}
		}

		providerRaw, err := json.Marshal(provider)
		if err != nil {
			return err
		}

		updatedData := map[string]json.RawMessage{
			"provider": providerRaw,
		}
		if v, ok := oldData["ssoEnabled"]; ok {
			updatedData["ssoEnabled"] = v
		}
		if v, ok := oldData["roleMapping"]; ok {
			updatedData["roleMapping"] = v
		}

		updatedDataRaw, err := json.Marshal(updatedData)
		if err != nil {
			return err
		}

		row.Data = string(updatedDataRaw)

		if _, err := tx.NewUpdate().Model(row).Column("data").Where("id = ?", row.ID).Exec(ctx); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (migration *migrateAuthDomainPayload) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
