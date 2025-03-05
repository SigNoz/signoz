package sqlmigration

import (
	"context"
	"database/sql"
	"strconv"
	"strings"
	"time"

	"github.com/tidwall/gjson"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/alertmanager/alertmanagerserver"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/types/alertmanagertypes"
)

type addAlertmanager struct{}

func NewAddAlertmanagerFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_alertmanager"), newAddAlertmanager)
}

func newAddAlertmanager(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &addAlertmanager{}, nil
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

	defer tx.Rollback() //nolint:errcheck

	if _, err := tx.
		NewDropColumn().
		Table("notification_channels").
		ColumnExpr("deleted").
		Exec(ctx); err != nil {
		if !strings.Contains(err.Error(), "no such column") {
			return err
		}
	}

	if _, err := tx.
		NewAddColumn().
		Table("notification_channels").
		Apply(WrapIfNotExists(ctx, db, "notification_channels", "org_id")).
		Exec(ctx); err != nil && err != ErrNoExecute {
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
		err = migration.populateOrgID(ctx, tx, orgID)
		if err != nil {
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

	if err := migration.populateAlertmanagerConfig(ctx, tx, orgID); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *addAlertmanager) populateOrgID(ctx context.Context, tx bun.Tx, orgID string) error {
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

	return nil
}

func (migration *addAlertmanager) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
