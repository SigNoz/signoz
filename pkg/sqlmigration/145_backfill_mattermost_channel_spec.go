package sqlmigration

import (
	"context"
	"encoding/json"
	"log/slog"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type backfillMattermostChannelSpec struct {
	logger *slog.Logger
}

func NewBackfillMattermostChannelSpecFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("backfill_mattermost_spec"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &backfillMattermostChannelSpec{logger: ps.Logger}, nil
	})
}

func (migration *backfillMattermostChannelSpec) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

// Up fills the spec of mattermost channels add_channel_spec left NULL because
// v2 did not model mattermost then. Rows carrying any other notifier, or
// mattermost settings the spec has no field for, are left to the repair
// endpoint.
func (migration *backfillMattermostChannelSpec) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	rows := make([]*channelSpecBackfillRow, 0)
	if err := tx.NewSelect().Model(&rows).Where("spec IS NULL").OrderExpr("org_id, id").Scan(ctx); err != nil {
		return err
	}

	for _, row := range rows {
		kind, spec, err := mattermostChannelSpecFromReceiverJSON(row.Data)
		if kind != "mattermost" {
			continue
		}
		if err != nil {
			migration.logger.WarnContext(ctx, "leaving mattermost notification channel without a v2 spec", slog.String("org_id", row.OrgID), slog.String("channel_id", row.ID), errors.Attr(err))
			continue
		}

		encoded, err := marshalUnescaped(spec)
		if err != nil {
			return err
		}

		if _, err := tx.NewUpdate().
			Model((*channelSpecBackfillRow)(nil)).
			Set("spec = ?", string(encoded)).
			Set("type = ?", kind).
			Where("id = ?", row.ID).
			Exec(ctx); err != nil {
			return err
		}
		migration.logger.InfoContext(ctx, "filled v2 spec on mattermost notification channel", slog.String("org_id", row.OrgID), slog.String("channel_id", row.ID))
	}

	return tx.Commit()
}

func (migration *backfillMattermostChannelSpec) Down(context.Context, *bun.DB) error {
	return nil
}

// mattermostChannelSpecFromReceiverJSON reads the kind from the receiver rather
// than the stored type, which v1 could leave empty.
func mattermostChannelSpecFromReceiverJSON(data string) (string, map[string]any, error) {
	receiver := map[string]json.RawMessage{}
	if err := json.Unmarshal([]byte(data), &receiver); err != nil {
		return "", nil, nil
	}

	total := 0
	var mattermosts []notifierJSON
	for key, raw := range receiver {
		if !strings.HasSuffix(key, "_configs") {
			continue
		}

		var list []notifierJSON
		if err := json.Unmarshal(raw, &list); err != nil {
			if key != "mattermost_configs" {
				return "", nil, nil
			}
			return "mattermost", nil, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "%s", key)
		}
		total += len(list)
		if key == "mattermost_configs" {
			mattermosts = list
		}
	}

	if len(mattermosts) == 0 {
		return "", nil, nil
	}
	if total > 1 {
		return "mattermost", nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "carries %d notifier configurations; only one per channel is supported", total)
	}

	spec, err := convertMattermostNotifierJSON(mattermosts[0])
	return "mattermost", spec, err
}

func convertMattermostNotifierJSON(notifier notifierJSON) (map[string]any, error) {
	if err := rejectAnyHTTPAuthJSON(notifier); err != nil {
		return nil, err
	}

	for _, key := range []string{"webhook_url_file", "type"} {
		value, err := notifier.stringValue(key)
		if err != nil {
			return nil, err
		}
		if value != "" {
			return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "mattermost: %s is not supported", key)
		}
	}

	for _, key := range []string{"attachments", "props", "priority"} {
		if notifier.has(key) {
			return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "mattermost: %s is not supported", key)
		}
	}

	spec := map[string]any{}
	if err := notifier.copyStrings(spec, map[string]string{"webhook_url": "webhookUrl", "channel": "channel", "username": "username", "icon_url": "iconUrl", "icon_emoji": "iconEmoji"}); err != nil {
		return nil, err
	}
	if err := notifier.copyNonEmptyStrings(spec, map[string]string{"text": "text"}); err != nil {
		return nil, err
	}
	if spec["webhookUrl"] == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "mattermost: webhook_url is required")
	}

	sendResolved, err := notifier.boolValue("send_resolved")
	if err != nil {
		return nil, err
	}
	spec["sendResolved"] = sendResolved

	return spec, nil
}
