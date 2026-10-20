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

type backfillTelegramChannelSpec struct {
	logger *slog.Logger
}

func NewBackfillTelegramChannelSpecFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("backfill_telegram_channel_spec"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &backfillTelegramChannelSpec{logger: ps.Logger}, nil
	})
}

func (migration *backfillTelegramChannelSpec) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

// Up fills the spec of telegram channels add_channel_spec left NULL because v2
// did not model telegram then. parse_mode is not carried: the spec has no field
// for it and every send goes out as HTML. Rows carrying any other notifier are
// left to the repair endpoint.
func (migration *backfillTelegramChannelSpec) Up(ctx context.Context, db *bun.DB) error {
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
		kind, spec, err := telegramChannelSpecFromReceiverJSON(row.Data)
		if kind != "telegram" {
			continue
		}
		if err != nil {
			migration.logger.WarnContext(ctx, "leaving telegram notification channel without a v2 spec", slog.String("org_id", row.OrgID), slog.String("channel_id", row.ID), errors.Attr(err))
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
		migration.logger.InfoContext(ctx, "filled v2 spec on telegram notification channel", slog.String("org_id", row.OrgID), slog.String("channel_id", row.ID))
	}

	return tx.Commit()
}

func (migration *backfillTelegramChannelSpec) Down(context.Context, *bun.DB) error {
	return nil
}

// telegramChannelSpecFromReceiverJSON reads the kind from the receiver rather
// than the stored type, which v1 could leave empty.
func telegramChannelSpecFromReceiverJSON(data string) (string, map[string]any, error) {
	receiver := map[string]json.RawMessage{}
	if err := json.Unmarshal([]byte(data), &receiver); err != nil {
		return "", nil, nil
	}

	total := 0
	var telegrams []notifierJSON
	for key, raw := range receiver {
		if !strings.HasSuffix(key, "_configs") {
			continue
		}

		var list []notifierJSON
		if err := json.Unmarshal(raw, &list); err != nil {
			if key != "telegram_configs" {
				return "", nil, nil
			}
			return "telegram", nil, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "%s", key)
		}
		total += len(list)
		if key == "telegram_configs" {
			telegrams = list
		}
	}

	if len(telegrams) == 0 {
		return "", nil, nil
	}
	if total > 1 {
		return "telegram", nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "carries %d notifier configurations; only one per channel is supported", total)
	}

	spec, err := convertTelegramNotifierJSON(telegrams[0])
	return "telegram", spec, err
}

func convertTelegramNotifierJSON(notifier notifierJSON) (map[string]any, error) {
	if err := rejectAnyHTTPAuthJSON(notifier); err != nil {
		return nil, err
	}

	for _, key := range []string{"token_file", "chat_file"} {
		value, err := notifier.stringValue(key)
		if err != nil {
			return nil, err
		}
		if value != "" {
			return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "telegram: %s is not supported", key)
		}
	}

	spec := map[string]any{}
	if err := notifier.copyStrings(spec, map[string]string{"token": "botToken"}); err != nil {
		return nil, err
	}
	if err := notifier.copyNonEmptyStrings(spec, map[string]string{"api_url": "apiUrl", "message": "message"}); err != nil {
		return nil, err
	}
	if spec["botToken"] == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "telegram: token is required")
	}

	chatID, err := notifier.int64Value("chat")
	if err != nil {
		return nil, err
	}
	if chatID == 0 {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "telegram: chat is required")
	}
	spec["chatId"] = chatID

	threadID, err := notifier.int64Value("message_thread_id")
	if err != nil {
		return nil, err
	}
	if threadID != 0 {
		spec["messageThreadId"] = threadID
	}

	disableNotifications, err := notifier.boolValue("disable_notifications")
	if err != nil {
		return nil, err
	}
	if disableNotifications {
		spec["disableNotifications"] = true
	}

	sendResolved, err := notifier.boolValue("send_resolved")
	if err != nil {
		return nil, err
	}
	spec["sendResolved"] = sendResolved

	return spec, nil
}

func (n notifierJSON) int64Value(key string) (int64, error) {
	if !n.has(key) {
		return 0, nil
	}
	var value int64
	if err := json.Unmarshal(n[key], &value); err != nil {
		return 0, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "%s", key)
	}
	return value, nil
}
