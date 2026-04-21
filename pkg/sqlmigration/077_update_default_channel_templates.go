package sqlmigration

import (
	"context"
	"crypto/md5"
	_ "embed"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/prometheus/alertmanager/config"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

//go:embed templates/old_slack_text.tmpl
var oldSlackTextTemplate string

//go:embed templates/new_slack_text.tmpl
var newSlackTextTemplate string

//go:embed templates/old_slack_title.tmpl
var oldSlackTitleTemplate string

//go:embed templates/new_slack_title.tmpl
var newSlackTitleTemplate string

//go:embed templates/old_pagerduty_description.tmpl
var oldPagerdutyDescriptionTemplate string

//go:embed templates/new_pagerduty_description.tmpl
var newPagerdutyDescriptionTemplate string

//go:embed templates/old_opsgenie_description.tmpl
var oldOpsgenieDescriptionTemplate string

//go:embed templates/new_opsgenie_description.tmpl
var newOpsgenieDescriptionTemplate string

//go:embed templates/old_email_html.tmpl
var oldEmailHTMLTemplate string

//go:embed templates/new_email_html.tmpl
var newEmailHTMLTemplate string

type notificationChannelRow struct {
	bun.BaseModel `bun:"table:notification_channel"`

	ID        string    `bun:"id,pk"`
	CreatedAt time.Time `bun:"created_at"`
	UpdatedAt time.Time `bun:"updated_at"`
	Name      string    `bun:"name"`
	Type      string    `bun:"type"`
	Data      string    `bun:"data"`
	OrgID     string    `bun:"org_id"`
}

type alertmanagerConfigRow struct {
	bun.BaseModel `bun:"table:alertmanager_config"`

	ID        string    `bun:"id,pk"`
	CreatedAt time.Time `bun:"created_at"`
	UpdatedAt time.Time `bun:"updated_at"`
	Config    string    `bun:"config"`
	Hash      string    `bun:"hash"`
	OrgID     string    `bun:"org_id"`
}

func computeConfigHash(raw string) string {
	sum := md5.Sum([]byte(raw))
	return fmt.Sprintf("%x", sum)
}

func normalizeTemplate(s string) string {
	return strings.TrimSpace(s)
}

type migrateDefaultChannelTemplates struct {
	sqlstore sqlstore.SQLStore
	logger   *slog.Logger
}

func NewChannelTemplatesMigratorFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("update_channel_templates"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &migrateDefaultChannelTemplates{
				sqlstore: sqlstore,
				logger:   ps.Logger,
			}, nil
		},
	)
}

func (m *migrateDefaultChannelTemplates) Register(migrations *migrate.Migrations) error {
	return migrations.Register(m.Up, m.Down)
}

func (m *migrateDefaultChannelTemplates) Down(context.Context, *bun.DB) error { return nil }

// patchReceiver walks the receiver's *Configs slices and performs exact-match
// substitution on template fields. Returns true if any field was modified.
func patchReceiver(receiver *config.Receiver) bool {
	changed := false

	for _, cfg := range receiver.SlackConfigs {
		if cfg == nil {
			continue
		}
		if normalizeTemplate(cfg.Title) == normalizeTemplate(oldSlackTitleTemplate) {
			cfg.Title = newSlackTitleTemplate
			changed = true
		}
		if normalizeTemplate(cfg.Text) == normalizeTemplate(oldSlackTextTemplate) {
			cfg.Text = newSlackTextTemplate
			changed = true
		}
	}

	for _, cfg := range receiver.MSTeamsV2Configs {
		if cfg == nil {
			continue
		}
		if normalizeTemplate(cfg.Title) == normalizeTemplate(oldSlackTitleTemplate) {
			cfg.Title = newSlackTitleTemplate
			changed = true
		}
		if normalizeTemplate(cfg.Text) == normalizeTemplate(oldSlackTextTemplate) {
			cfg.Text = newSlackTextTemplate
			changed = true
		}
	}

	for _, cfg := range receiver.PagerdutyConfigs {
		if cfg == nil {
			continue
		}
		if normalizeTemplate(cfg.Description) == normalizeTemplate(oldPagerdutyDescriptionTemplate) {
			cfg.Description = newPagerdutyDescriptionTemplate
			changed = true
		}
	}

	for _, cfg := range receiver.OpsGenieConfigs {
		if cfg == nil {
			continue
		}
		if normalizeTemplate(cfg.Description) == normalizeTemplate(oldOpsgenieDescriptionTemplate) {
			cfg.Description = newOpsgenieDescriptionTemplate
			changed = true
		}
	}

	for _, cfg := range receiver.EmailConfigs {
		if cfg == nil {
			continue
		}
		if normalizeTemplate(cfg.HTML) == normalizeTemplate(oldEmailHTMLTemplate) {
			cfg.HTML = newEmailHTMLTemplate
			changed = true
		}
	}

	return changed
}

func (m *migrateDefaultChannelTemplates) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	// Rewrite notification_channel rows that match the old default template
	var channels []*notificationChannelRow
	if err := tx.NewSelect().Model(&channels).Scan(ctx); err != nil {
		return err
	}

	for _, channel := range channels {
		var receiver config.Receiver
		if err := json.Unmarshal([]byte(channel.Data), &receiver); err != nil {
			m.logger.WarnContext(ctx, "skipping notification_channel update: failed to unmarshal data",
				slog.String("id", channel.ID), slog.String("name", channel.Name), slog.String("org_id", channel.OrgID), slog.Any("error", err))
			continue
		}

		if !patchReceiver(&receiver) {
			m.logger.InfoContext(ctx, "notification_channel template modified, skipping",
				slog.String("id", channel.ID), slog.String("name", channel.Name), slog.String("org_id", channel.OrgID))
			continue
		}

		data, err := json.Marshal(receiver)
		if err != nil {
			return err
		}

		channel.Data = string(data)
		channel.UpdatedAt = time.Now().UTC()

		if _, err := tx.NewUpdate().
			Model(channel).
			Set("data = ?", channel.Data).
			Set("updated_at = ?", channel.UpdatedAt).
			WherePK().
			Exec(ctx); err != nil {
			return err
		}

		m.logger.InfoContext(ctx, "patched notification_channel",
			slog.String("id", channel.ID), slog.String("name", channel.Name), slog.String("org_id", channel.OrgID))
	}

	// Update the embedded receivers in alertmanager_config
	var configs []*alertmanagerConfigRow
	if err := tx.NewSelect().Model(&configs).Scan(ctx); err != nil {
		return err
	}

	for _, row := range configs {
		var alertmanagerConfig config.Config
		if err := json.Unmarshal([]byte(row.Config), &alertmanagerConfig); err != nil {
			m.logger.WarnContext(ctx, "skipping alertmanager_config: failed to unmarshal config",
				slog.String("id", row.ID), slog.String("org_id", row.OrgID), slog.Any("error", err))
			continue
		}

		changed := false
		for i := range alertmanagerConfig.Receivers {
			if patchReceiver(&alertmanagerConfig.Receivers[i]) {
				changed = true
			}
		}

		if !changed {
			m.logger.InfoContext(ctx, "alertmanager_config template up-to-date, skipping",
				slog.String("id", row.ID), slog.String("org_id", row.OrgID))
			continue
		}

		rawConfig, err := json.Marshal(&alertmanagerConfig)
		if err != nil {
			return err
		}

		row.Config = string(rawConfig)
		row.Hash = computeConfigHash(row.Config)
		row.UpdatedAt = time.Now().UTC()

		if _, err := tx.NewUpdate().
			Model(row).
			Set("config = ?", row.Config).
			Set("hash = ?", row.Hash).
			Set("updated_at = ?", row.UpdatedAt).
			WherePK().
			Exec(ctx); err != nil {
			return err
		}

		m.logger.InfoContext(ctx, "patched alertmanager_config",
			slog.String("id", row.ID), slog.String("org_id", row.OrgID))
	}

	return tx.Commit()
}
