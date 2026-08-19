package sqlmigration

import (
	"context"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type scrubEmailChannelTransport struct {
	sqlstore sqlstore.SQLStore
	logger   *slog.Logger
}

type alertmanagerConfigScrubRow struct {
	bun.BaseModel `bun:"table:alertmanager_config"`

	ID     string `bun:"id"`
	Config string `bun:"config"`
}

type notificationChannelScrubRow struct {
	bun.BaseModel `bun:"table:notification_channel"`

	ID   string `bun:"id"`
	Data string `bun:"data"`
}

var emailTransportKeys = []string{
	"from",
	"hello",
	"smarthost",
	"auth_username",
	"auth_password",
	"auth_password_file",
	"auth_secret",
	"auth_secret_file",
	"auth_identity",
	"require_tls",
	"tls_config",
	"force_implicit_tls",
}

var globalSMTPKeys = []string{
	"smtp_from",
	"smtp_hello",
	"smtp_smarthost",
	"smtp_auth_username",
	"smtp_auth_password",
	"smtp_auth_password_file",
	"smtp_auth_secret",
	"smtp_auth_secret_file",
	"smtp_auth_identity",
	"smtp_require_tls",
	"smtp_tls_config",
	"smtp_force_implicit_tls",
}

func NewScrubEmailChannelTransportFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("scrub_email_channel_transport"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &scrubEmailChannelTransport{sqlstore: sqlstore, logger: ps.Logger}, nil
		},
	)
}

func (migration *scrubEmailChannelTransport) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}
	return nil
}

func (migration *scrubEmailChannelTransport) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	if err := migration.scrubConfigs(ctx, tx); err != nil {
		return err
	}

	if err := migration.scrubChannels(ctx, tx); err != nil {
		return err
	}

	return tx.Commit()
}

func (migration *scrubEmailChannelTransport) scrubConfigs(ctx context.Context, tx bun.Tx) error {
	rows := make([]*alertmanagerConfigScrubRow, 0)
	if err := tx.NewSelect().Model(&rows).Scan(ctx); err != nil {
		return err
	}

	for _, row := range rows {
		cfg := make(map[string]json.RawMessage)
		if err := json.Unmarshal([]byte(row.Config), &cfg); err != nil {
			migration.logger.WarnContext(ctx, "skipping alertmanager config with unreadable config", slog.String("config_id", row.ID), errors.Attr(err))
			continue
		}

		changed := false

		if globalRaw, ok := cfg["global"]; ok && string(globalRaw) != "null" {
			global := make(map[string]json.RawMessage)
			if err := json.Unmarshal(globalRaw, &global); err != nil {
				migration.logger.WarnContext(ctx, "skipping alertmanager config with unreadable global", slog.String("config_id", row.ID), errors.Attr(err))
				continue
			}
			if deleteKeys(global, globalSMTPKeys) {
				newGlobal, err := json.Marshal(global)
				if err != nil {
					migration.logger.WarnContext(ctx, "skipping alertmanager config, cannot marshal global", slog.String("config_id", row.ID), errors.Attr(err))
					continue
				}
				cfg["global"] = newGlobal
				changed = true
			}
		}

		if receiversRaw, ok := cfg["receivers"]; ok && string(receiversRaw) != "null" {
			receivers := make([]map[string]json.RawMessage, 0)
			if err := json.Unmarshal(receiversRaw, &receivers); err != nil {
				migration.logger.WarnContext(ctx, "skipping alertmanager config with unreadable receivers", slog.String("config_id", row.ID), errors.Attr(err))
				continue
			}

			receiversChanged := false
			unreadable := false
			for _, receiver := range receivers {
				scrubbed, err := scrubEmailConfigs(receiver)
				if err != nil {
					migration.logger.WarnContext(ctx, "skipping alertmanager config with unreadable email configs", slog.String("config_id", row.ID), errors.Attr(err))
					unreadable = true
					break
				}
				receiversChanged = receiversChanged || scrubbed
			}
			if unreadable {
				continue
			}

			if receiversChanged {
				newReceivers, err := json.Marshal(receivers)
				if err != nil {
					migration.logger.WarnContext(ctx, "skipping alertmanager config, cannot marshal receivers", slog.String("config_id", row.ID), errors.Attr(err))
					continue
				}
				cfg["receivers"] = newReceivers
				changed = true
			}
		}

		if !changed {
			continue
		}

		newConfig, err := json.Marshal(cfg)
		if err != nil {
			migration.logger.WarnContext(ctx, "skipping alertmanager config, cannot marshal config", slog.String("config_id", row.ID), errors.Attr(err))
			continue
		}

		if _, err := tx.NewUpdate().
			Model((*alertmanagerConfigScrubRow)(nil)).
			Set("config = ?", string(newConfig)).
			Set("hash = ?", fmt.Sprintf("%x", md5.Sum(newConfig))).
			Where("id = ?", row.ID).
			Exec(ctx); err != nil {
			return err
		}
	}

	return nil
}

func (migration *scrubEmailChannelTransport) scrubChannels(ctx context.Context, tx bun.Tx) error {
	rows := make([]*notificationChannelScrubRow, 0)
	if err := tx.NewSelect().Model(&rows).Where("type = ?", "email").Scan(ctx); err != nil {
		return err
	}

	for _, row := range rows {
		receiver := make(map[string]json.RawMessage)
		if err := json.Unmarshal([]byte(row.Data), &receiver); err != nil {
			migration.logger.WarnContext(ctx, "skipping notification channel with unreadable data", slog.String("channel_id", row.ID), errors.Attr(err))
			continue
		}

		scrubbed, err := scrubEmailConfigs(receiver)
		if err != nil {
			migration.logger.WarnContext(ctx, "skipping notification channel with unreadable email configs", slog.String("channel_id", row.ID), errors.Attr(err))
			continue
		}
		if !scrubbed {
			continue
		}

		newData, err := json.Marshal(receiver)
		if err != nil {
			migration.logger.WarnContext(ctx, "skipping notification channel, cannot marshal data", slog.String("channel_id", row.ID), errors.Attr(err))
			continue
		}

		if _, err := tx.NewUpdate().
			Model((*notificationChannelScrubRow)(nil)).
			Set("data = ?", string(newData)).
			Where("id = ?", row.ID).
			Exec(ctx); err != nil {
			return err
		}
	}

	return nil
}

func scrubEmailConfigs(receiver map[string]json.RawMessage) (bool, error) {
	emailConfigsRaw, ok := receiver["email_configs"]
	if !ok || string(emailConfigsRaw) == "null" {
		return false, nil
	}

	emailConfigs := make([]map[string]json.RawMessage, 0)
	if err := json.Unmarshal(emailConfigsRaw, &emailConfigs); err != nil {
		return false, err
	}

	changed := false
	for _, emailConfig := range emailConfigs {
		changed = deleteKeys(emailConfig, emailTransportKeys) || changed
	}

	if !changed {
		return false, nil
	}

	newEmailConfigs, err := json.Marshal(emailConfigs)
	if err != nil {
		return false, err
	}
	receiver["email_configs"] = newEmailConfigs

	return true, nil
}

func deleteKeys(m map[string]json.RawMessage, keys []string) bool {
	deleted := false
	for _, key := range keys {
		if _, ok := m[key]; ok {
			delete(m, key)
			deleted = true
		}
	}

	return deleted
}

func (migration *scrubEmailChannelTransport) Down(context.Context, *bun.DB) error {
	return nil
}
