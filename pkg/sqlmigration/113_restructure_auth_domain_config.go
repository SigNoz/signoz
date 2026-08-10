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

type restructureAuthDomainConfig struct {
	sqlstore sqlstore.SQLStore
	logger   *slog.Logger
}

type restructureAuthDomainRow struct {
	bun.BaseModel `bun:"table:auth_domain"`

	ID   string `bun:"id"`
	Data string `bun:"data"`
}

// The legacy document keyed the discriminator as ssoType with the chosen
// provider's config in a sibling field; the restructured document is
// {enabled, config: {kind, spec}, roleMapping} with renamed saml spec keys.
var legacySSOTypeToKind = map[string]string{
	"google_auth": "google",
	"saml":        "saml",
	"oidc":        "oidc",
}

var legacySSOTypeToConfigKey = map[string]string{
	"google_auth": "googleAuthConfig",
	"saml":        "samlConfig",
	"oidc":        "oidcConfig",
}

var legacySamlKeyToKey = map[string]string{
	"samlEntity": "entityId",
	"samlIdp":    "location",
	"samlCert":   "certificate",
}

func NewRestructureAuthDomainConfigFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("restructure_auth_domain_config"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &restructureAuthDomainConfig{sqlstore: sqlstore, logger: ps.Logger}, nil
		},
	)
}

func (migration *restructureAuthDomainConfig) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *restructureAuthDomainConfig) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	rows := make([]*restructureAuthDomainRow, 0)
	if err := tx.NewSelect().Model(&rows).Scan(ctx); err != nil {
		return err
	}

	for _, row := range rows {
		legacy := make(map[string]json.RawMessage)
		if err := json.Unmarshal([]byte(row.Data), &legacy); err != nil {
			migration.logger.WarnContext(ctx, "skipping auth domain with unreadable data", slog.String("auth_domain_id", row.ID), errors.Attr(err))
			continue
		}

		ssoTypeRaw, ok := legacy["ssoType"]
		if !ok {
			continue
		}

		var ssoType string
		if err := json.Unmarshal(ssoTypeRaw, &ssoType); err != nil {
			migration.logger.WarnContext(ctx, "skipping auth domain with unreadable ssoType", slog.String("auth_domain_id", row.ID), errors.Attr(err))
			continue
		}

		// Documents written before the provider enum became a valuer.String spell
		// the discriminator uppercase ("SAML", "GOOGLE_AUTH"); reads lowercase it
		// through valuer.NewString, so those rows still carry the original casing
		// on disk. Every lookup and spec rewrite below keys off this value.
		ssoType = strings.ToLower(strings.TrimSpace(ssoType))

		kind, ok := legacySSOTypeToKind[ssoType]
		if !ok {
			migration.logger.WarnContext(ctx, "skipping auth domain with unknown ssoType", slog.String("auth_domain_id", row.ID), slog.String("sso_type", ssoType))
			continue
		}

		spec, ok := legacy[legacySSOTypeToConfigKey[ssoType]]
		if !ok || string(spec) == "null" {
			migration.logger.WarnContext(ctx, "skipping auth domain with missing provider config", slog.String("auth_domain_id", row.ID), slog.String("sso_type", ssoType))
			continue
		}

		if ssoType == "saml" {
			samlSpec := make(map[string]json.RawMessage)
			if err := json.Unmarshal(spec, &samlSpec); err != nil {
				migration.logger.WarnContext(ctx, "skipping auth domain with unreadable saml config", slog.String("auth_domain_id", row.ID), errors.Attr(err))
				continue
			}

			for legacyKey, key := range legacySamlKeyToKey {
				if value, ok := samlSpec[legacyKey]; ok {
					samlSpec[key] = value
					delete(samlSpec, legacyKey)
				}
			}

			if spec, err = json.Marshal(samlSpec); err != nil {
				return err
			}
		}

		if ssoType == "google_auth" {
			googleSpec := make(map[string]json.RawMessage)
			if err := json.Unmarshal(spec, &googleSpec); err != nil {
				migration.logger.WarnContext(ctx, "skipping auth domain with unreadable google config", slog.String("auth_domain_id", row.ID), errors.Attr(err))
				continue
			}

			delete(googleSpec, "redirectURI")

			if spec, err = json.Marshal(googleSpec); err != nil {
				return err
			}
		}

		kindRaw, err := json.Marshal(kind)
		if err != nil {
			return err
		}

		config, err := json.Marshal(map[string]json.RawMessage{
			"kind": kindRaw,
			"spec": spec,
		})
		if err != nil {
			return err
		}

		restructured := map[string]json.RawMessage{
			"enabled": json.RawMessage("false"),
			"config":  config,
		}
		if enabled, ok := legacy["ssoEnabled"]; ok {
			restructured["enabled"] = enabled
		}
		if roleMapping, ok := legacy["roleMapping"]; ok && string(roleMapping) != "null" {
			restructured["roleMapping"] = roleMapping
		}

		newData, err := json.Marshal(restructured)
		if err != nil {
			return err
		}

		if _, err := tx.NewUpdate().
			Model((*restructureAuthDomainRow)(nil)).
			Set("data = ?", string(newData)).
			Where("id = ?", row.ID).
			Exec(ctx); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (migration *restructureAuthDomainConfig) Down(context.Context, *bun.DB) error {
	return nil
}
