package sqlmigration

import (
	"context"
	"database/sql"
	"encoding/json"
	"strconv"
	"time"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagerserver"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/prometheus/alertmanager/config"
	"github.com/tidwall/gjson"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addAlertmanager struct {
	store sqlstore.SQLStore
}

func NewAddAlertmanagerFactory(store sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_alertmanager"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newAddAlertmanager(ctx, ps, c, store)
	})
}

func newAddAlertmanager(_ context.Context, _ factory.ProviderSettings, _ Config, store sqlstore.SQLStore) (SQLMigration, error) {
	return &addAlertmanager{
		store: store,
	}, nil
}

func (migration *addAlertmanager) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addAlertmanager) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	if exists, err := migration.store.Dialect().ColumnExists(ctx, tx, "notification_channels", "deleted"); err != nil {
		return err
	} else if exists {
		if _, err := tx.
			NewDropColumn().
			Table("notification_channels").
			ColumnExpr("deleted").
			Exec(ctx); err != nil {
			return err
		}
	}

	if exists, err := migration.store.Dialect().ColumnExists(ctx, tx, "notification_channels", "org_id"); err != nil {
		return err
	} else if !exists {
		if _, err := tx.
			NewAddColumn().
			Table("notification_channels").
			ColumnExpr("org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE").
			Exec(ctx); err != nil {
			return err
		}
	}

	if _, err := tx.
		NewCreateTable().
		Model(&struct {
			bun.BaseModel `bun:"table:alertmanager_config"`
			ID            uint64    `bun:"id,pk,autoincrement"`
			Config        string    `bun:"config,notnull,type:text"`
			Hash          string    `bun:"hash,notnull,type:text"`
			CreatedAt     time.Time `bun:"created_at,notnull"`
			UpdatedAt     time.Time `bun:"updated_at,notnull"`
			OrgID         string    `bun:"org_id,notnull,unique"`
		}{}).
		ForeignKey(`("org_id") REFERENCES "organizations" ("id")`).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	if _, err := tx.
		NewCreateTable().
		Model(&struct {
			bun.BaseModel `bun:"table:alertmanager_state"`
			ID            uint64    `bun:"id,pk,autoincrement"`
			Silences      string    `bun:"silences,nullzero,type:text"`
			NFLog         string    `bun:"nflog,nullzero,type:text"`
			CreatedAt     time.Time `bun:"created_at,notnull"`
			UpdatedAt     time.Time `bun:"updated_at,notnull"`
			OrgID         string    `bun:"org_id,notnull,unique"`
		}{}).
		ForeignKey(`("org_id") REFERENCES "organizations" ("id")`).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	var orgID string
	err = tx.
		NewSelect().
		ColumnExpr("id").
		Table("organizations").
		Limit(1).
		Scan(ctx, &orgID)
	if err != nil {
		if err != sql.ErrNoRows {
			return err
		}
	}

	if err == nil {
		if err := migration.populateOrgIDInChannels(ctx, tx, orgID); err != nil {
			return err
		}

		if err := migration.populateAlertmanagerConfig(ctx, tx, orgID); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *addAlertmanager) populateOrgIDInChannels(ctx context.Context, tx bun.Tx, orgID string) error {
	if _, err := tx.
		NewUpdate().
		Table("notification_channels").
		Set("org_id = ?", orgID).
		Where("org_id IS NULL").
		Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (migration *addAlertmanager) populateAlertmanagerConfig(ctx context.Context, tx bun.Tx, orgID string) error {
	var channels []*alertmanagertypes.Channel

	err := tx.
		NewSelect().
		Model(&channels).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return err
	}

	var receiversFromChannels []string
	for _, channel := range channels {
		receiversFromChannels = append(receiversFromChannels, channel.Name)
	}

	type matcher struct {
		bun.BaseModel `bun:"table:rules"`
		ID            int    `bun:"id,pk"`
		Data          string `bun:"data"`
	}

	matchers := []matcher{}

	err = tx.
		NewSelect().
		Column("id", "data").
		Model(&matchers).
		Scan(ctx)
	if err != nil {
		return err
	}

	matchersMap := make(map[string][]string)
	for _, matcher := range matchers {
		receivers := gjson.Get(matcher.Data, "preferredChannels").Array()
		for _, receiver := range receivers {
			matchersMap[strconv.Itoa(matcher.ID)] = append(matchersMap[strconv.Itoa(matcher.ID)], receiver.String())
		}

		if len(receivers) == 0 {
			matchersMap[strconv.Itoa(matcher.ID)] = append(matchersMap[strconv.Itoa(matcher.ID)], receiversFromChannels...)
		}
	}

	for _, channel := range channels {
		if err := migration.msTeamsChannelToMSTeamsV2Channel(channel); err != nil {
			return err
		}
	}

	config, err := alertmanagertypes.NewConfigFromChannels(alertmanagerserver.NewConfig().Global, alertmanagerserver.NewConfig().Route, channels, orgID)
	if err != nil {
		return err
	}

	for ruleID, receivers := range matchersMap {
		err = config.CreateRuleIDMatcher(ruleID, receivers)
		if err != nil {
			return err
		}
	}

	if _, err := tx.
		NewInsert().
		Model(config.StoreableConfig()).
		On("CONFLICT (org_id) DO UPDATE").
		Set("config = ?", config.StoreableConfig().Config).
		Set("hash = ?", config.StoreableConfig().Hash).
		Set("updated_at = ?", config.StoreableConfig().UpdatedAt).
		Exec(ctx); err != nil {
		return err
	}

	for _, channel := range channels {
		if channel.Type == "msteamsv2" {
			if _, err := tx.
				NewUpdate().
				Model(channel).
				WherePK().
				Exec(ctx); err != nil {
				return err
			}
		}
	}

	return nil
}

func (migration *addAlertmanager) Down(ctx context.Context, db *bun.DB) error {
	return nil
}

func (migration *addAlertmanager) msTeamsChannelToMSTeamsV2Channel(c *alertmanagertypes.Channel) error {
	if c.Type != "msteams" {
		return nil
	}

	receiver, err := alertmanagertypes.NewReceiver(c.Data)
	if err != nil {
		return err
	}

	receiver = migration.msTeamsReceiverToMSTeamsV2Receiver(receiver)
	data, err := json.Marshal(receiver)
	if err != nil {
		return err
	}

	c.Type = "msteamsv2"
	c.Data = string(data)
	c.UpdatedAt = time.Now()

	return nil
}

func (migration *addAlertmanager) msTeamsReceiverToMSTeamsV2Receiver(receiver alertmanagertypes.Receiver) alertmanagertypes.Receiver {
	if receiver.MSTeamsConfigs == nil {
		return receiver
	}

	var msTeamsV2Configs []*config.MSTeamsV2Config
	for _, cfg := range receiver.MSTeamsConfigs {
		msTeamsV2Configs = append(msTeamsV2Configs, &config.MSTeamsV2Config{
			NotifierConfig: cfg.NotifierConfig,
			HTTPConfig:     cfg.HTTPConfig,
			WebhookURL:     cfg.WebhookURL,
			WebhookURLFile: cfg.WebhookURLFile,
			Title:          cfg.Title,
			Text:           cfg.Text,
		})
	}

	receiver.MSTeamsConfigs = nil
	receiver.MSTeamsV2Configs = msTeamsV2Configs

	return receiver
}
