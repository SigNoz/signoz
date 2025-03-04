package sqlalertmanagerstore

import (
	"context"
	"database/sql"

	"go.signoz.io/signoz/pkg/errors"
	"go.signoz.io/signoz/pkg/sqlstore"
	"go.signoz.io/signoz/pkg/types/alertmanagertypes"
)

type config struct {
	sqlstore sqlstore.SQLStore
}

func NewConfigStore(sqlstore sqlstore.SQLStore) alertmanagertypes.ConfigStore {
	return &config{sqlstore: sqlstore}
}

// Get implements alertmanagertypes.ConfigStore.
func (store *config) Get(ctx context.Context, orgID string) (*alertmanagertypes.Config, error) {
	storeableConfig := new(alertmanagertypes.StoreableConfig)

	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(storeableConfig).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.Newf(errors.TypeNotFound, alertmanagertypes.ErrCodeAlertmanagerConfigNotFound, "cannot find alertmanager config for orgID %s", orgID)
		}

		return nil, err
	}

	var channels []*alertmanagertypes.Channel
	err = store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(&channels).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	cfg, err := alertmanagertypes.NewConfigFromStoreableConfigAndChannels(storeableConfig, channels)
	if err != nil {
		return nil, err
	}

	return cfg, nil
}

// Set implements alertmanagertypes.ConfigStore.
func (store *config) Set(ctx context.Context, config *alertmanagertypes.Config) error {
	tx, err := store.sqlstore.BunDB().BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer tx.Rollback() //nolint:errcheck

	if _, err = tx.
		NewInsert().
		Model(config.StoreableConfig()).
		On("CONFLICT (org_id) DO UPDATE").
		Set("config = ?", string(config.StoreableConfig().Config)).
		Set("updated_at = ?", config.StoreableConfig().UpdatedAt).
		Exec(ctx); err != nil {
		return err
	}

	channels := config.Channels()
	if len(channels) != 0 {
		if _, err = tx.NewInsert().
			Model(&channels).
			On("CONFLICT (name) DO UPDATE").
			Set("data = EXCLUDED.data").
			Set("updated_at = EXCLUDED.updated_at").
			Exec(ctx); err != nil {
			return err
		}
	}

	if err = tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (store *config) ListOrgs(ctx context.Context) ([]string, error) {
	var orgIDs []string

	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Table("organizations").
		ColumnExpr("id").
		Scan(ctx, &orgIDs)
	if err != nil {
		return nil, err
	}

	return orgIDs, nil
}

func (store *config) CreateChannel(ctx context.Context, channel *alertmanagertypes.Channel, cb func(context.Context) error) error {
	tx, err := store.sqlstore.BunDB().BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer tx.Rollback() //nolint:errcheck

	if _, err = tx.NewInsert().
		Model(channel).
		Exec(ctx); err != nil {
		return err
	}

	if cb != nil {
		if err = cb(ctx); err != nil {
			return err
		}
	}

	if err = tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (store *config) GetChannelByID(ctx context.Context, orgID string, id int) (*alertmanagertypes.Channel, error) {
	channel := new(alertmanagertypes.Channel)

	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(channel).
		Where("org_id = ?", orgID).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.Newf(errors.TypeNotFound, alertmanagertypes.ErrCodeAlertmanagerChannelNotFound, "cannot find channel with id %d", id)
		}
		return nil, err
	}

	return channel, nil
}

func (store *config) UpdateChannel(ctx context.Context, orgID string, channel *alertmanagertypes.Channel, cb func(context.Context) error) error {
	tx, err := store.sqlstore.BunDB().BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer tx.Rollback() //nolint:errcheck

	_, err = tx.NewUpdate().
		Model(channel).
		WherePK().
		Exec(ctx)
	if err != nil {
		return err
	}

	if cb != nil {
		if err = cb(ctx); err != nil {
			return err
		}
	}

	if err = tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (store *config) DeleteChannelByID(ctx context.Context, orgID string, id int, cb func(context.Context) error) error {
	channel := new(alertmanagertypes.Channel)

	tx, err := store.sqlstore.BunDB().BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer tx.Rollback() //nolint:errcheck

	_, err = tx.NewDelete().
		Model(channel).
		Where("org_id = ?", orgID).
		Where("id = ?", id).
		Exec(ctx)
	if err != nil {
		return err
	}

	if cb != nil {
		if err = cb(ctx); err != nil {
			return err
		}
	}

	if err = tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (store *config) ListChannels(ctx context.Context, orgID string) ([]*alertmanagertypes.Channel, error) {
	var channels []*alertmanagertypes.Channel

	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(&channels).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return channels, nil
}

func (store *config) ListAllChannels(ctx context.Context) ([]*alertmanagertypes.Channel, error) {
	var channels []*alertmanagertypes.Channel

	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(&channels).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return channels, nil
}
