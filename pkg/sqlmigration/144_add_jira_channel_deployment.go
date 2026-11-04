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

// Jira channels written before deployment existed are all Cloud; the readers
// default a missing key to cloud, and this stores that default explicitly.
const jiraDeploymentCloudJSON = `"cloud"`

type addJiraChannelDeployment struct {
	sqlstore sqlstore.SQLStore
	logger   *slog.Logger
}

type alertmanagerConfigJiraRow struct {
	bun.BaseModel `bun:"table:alertmanager_config"`

	ID     string `bun:"id"`
	Config string `bun:"config"`
}

type notificationChannelJiraRow struct {
	bun.BaseModel `bun:"table:notification_channel"`

	ID   string `bun:"id"`
	Data string `bun:"data"`
	Spec string `bun:"spec,nullzero"`
}

func NewAddJiraChannelDeploymentFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("add_jira_channel_deployment"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &addJiraChannelDeployment{sqlstore: sqlstore, logger: ps.Logger}, nil
		},
	)
}

func (migration *addJiraChannelDeployment) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}
	return nil
}

func (migration *addJiraChannelDeployment) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback()
	}()
	if err := migration.fillConfigs(ctx, tx); err != nil {
		return err
	}
	if err := migration.fillChannels(ctx, tx); err != nil {
		return err
	}
	return tx.Commit()
}

func (migration *addJiraChannelDeployment) fillConfigs(ctx context.Context, tx bun.Tx) error {
	rows := make([]*alertmanagerConfigJiraRow, 0)
	if err := tx.NewSelect().Model(&rows).Scan(ctx); err != nil {
		return err
	}

	for _, row := range rows {
		cfg := make(map[string]json.RawMessage)
		if err := json.Unmarshal([]byte(row.Config), &cfg); err != nil {
			migration.logger.WarnContext(ctx, "skipping alertmanager config with unreadable config", slog.String("config_id", row.ID), errors.Attr(err))
			continue
		}

		receiversRaw, ok := cfg["receivers"]
		if !ok || string(receiversRaw) == "null" {
			continue
		}
		receivers := make([]map[string]json.RawMessage, 0)
		if err := json.Unmarshal(receiversRaw, &receivers); err != nil {
			migration.logger.WarnContext(ctx, "skipping alertmanager config with unreadable receivers", slog.String("config_id", row.ID), errors.Attr(err))
			continue
		}

		changed := false
		unreadable := false
		for _, receiver := range receivers {
			filled, err := fillJiraConfigsDeployment(receiver)
			if err != nil {
				migration.logger.WarnContext(ctx, "skipping alertmanager config with unreadable jira configs", slog.String("config_id", row.ID), errors.Attr(err))
				unreadable = true
				break
			}
			changed = changed || filled
		}
		if unreadable || !changed {
			continue
		}

		newReceivers, err := json.Marshal(receivers)
		if err != nil {
			migration.logger.WarnContext(ctx, "skipping alertmanager config, cannot marshal receivers", slog.String("config_id", row.ID), errors.Attr(err))
			continue
		}
		cfg["receivers"] = newReceivers
		newConfig, err := json.Marshal(cfg)
		if err != nil {
			migration.logger.WarnContext(ctx, "skipping alertmanager config, cannot marshal config", slog.String("config_id", row.ID), errors.Attr(err))
			continue
		}

		if _, err := tx.NewUpdate().
			Model((*alertmanagerConfigJiraRow)(nil)).
			Set("config = ?", string(newConfig)).
			Set("hash = ?", fmt.Sprintf("%x", md5.Sum(newConfig))).
			Where("id = ?", row.ID).
			Exec(ctx); err != nil {
			return err
		}
	}

	return nil
}

func (migration *addJiraChannelDeployment) fillChannels(ctx context.Context, tx bun.Tx) error {
	rows := make([]*notificationChannelJiraRow, 0)
	if err := tx.NewSelect().Model(&rows).Where("type = ?", "jira").Scan(ctx); err != nil {
		return err
	}

	for _, row := range rows {
		receiver := make(map[string]json.RawMessage)
		if err := json.Unmarshal([]byte(row.Data), &receiver); err != nil {
			migration.logger.WarnContext(ctx, "skipping notification channel with unreadable data", slog.String("channel_id", row.ID), errors.Attr(err))
			continue
		}
		dataChanged, err := fillJiraConfigsDeployment(receiver)
		if err != nil {
			migration.logger.WarnContext(ctx, "skipping notification channel with unreadable jira configs", slog.String("channel_id", row.ID), errors.Attr(err))
			continue
		}

		specChanged := false
		spec := make(map[string]json.RawMessage)
		if row.Spec != "" {
			if err := json.Unmarshal([]byte(row.Spec), &spec); err != nil {
				migration.logger.WarnContext(ctx, "skipping notification channel with unreadable spec", slog.String("channel_id", row.ID), errors.Attr(err))
				continue
			}
			specChanged = fillJiraDeployment(spec)
		}

		if !dataChanged && !specChanged {
			continue
		}

		update := tx.NewUpdate().Model((*notificationChannelJiraRow)(nil)).Where("id = ?", row.ID)
		if dataChanged {
			newData, err := json.Marshal(receiver)
			if err != nil {
				migration.logger.WarnContext(ctx, "skipping notification channel, cannot marshal data", slog.String("channel_id", row.ID), errors.Attr(err))
				continue
			}
			update = update.Set("data = ?", string(newData))
		}
		if specChanged {
			newSpec, err := json.Marshal(spec)
			if err != nil {
				migration.logger.WarnContext(ctx, "skipping notification channel, cannot marshal spec", slog.String("channel_id", row.ID), errors.Attr(err))
				continue
			}
			update = update.Set("spec = ?", string(newSpec))
		}
		if _, err := update.Exec(ctx); err != nil {
			return err
		}
	}

	return nil
}

func (migration *addJiraChannelDeployment) Down(context.Context, *bun.DB) error {
	return nil
}

// fillJiraConfigsDeployment sets deployment on every jira notifier of a receiver
// that lacks it and reports whether anything changed.
func fillJiraConfigsDeployment(receiver map[string]json.RawMessage) (bool, error) {
	jiraConfigsRaw, ok := receiver["jira_configs"]
	if !ok || string(jiraConfigsRaw) == "null" {
		return false, nil
	}

	jiraConfigs := make([]map[string]json.RawMessage, 0)
	if err := json.Unmarshal(jiraConfigsRaw, &jiraConfigs); err != nil {
		return false, err
	}

	changed := false
	for _, jiraConfig := range jiraConfigs {
		changed = fillJiraDeployment(jiraConfig) || changed
	}
	if !changed {
		return false, nil
	}

	newJiraConfigs, err := json.Marshal(jiraConfigs)
	if err != nil {
		return false, err
	}
	receiver["jira_configs"] = newJiraConfigs
	return true, nil
}

func fillJiraDeployment(object map[string]json.RawMessage) bool {
	if deployment, ok := object["deployment"]; ok && string(deployment) != "null" && string(deployment) != `""` {
		return false
	}
	object["deployment"] = json.RawMessage(jiraDeploymentCloudJSON)
	return true
}
