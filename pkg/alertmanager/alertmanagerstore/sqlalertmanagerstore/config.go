package sqlalertmanagerstore

import (
	"context"
	"database/sql"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/tidwall/gjson"
	"github.com/uptrace/bun"
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

	cfg, err := alertmanagertypes.NewConfigFromStoreableConfig(storeableConfig)
	if err != nil {
		return nil, err
	}

	return cfg, nil
}

// Set implements alertmanagertypes.ConfigStore.
func (store *config) Set(ctx context.Context, config *alertmanagertypes.Config, opts ...alertmanagertypes.StoreOption) error {
	return store.wrap(ctx, func(ctx context.Context) error {
		if _, err := store.
			sqlstore.
			BunDBCtx(ctx).
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
	}, opts...)
}

func (store *config) CreateChannel(ctx context.Context, channel *alertmanagertypes.Channel, opts ...alertmanagertypes.StoreOption) error {
	return store.wrap(ctx, func(ctx context.Context) error {
		if _, err := store.
			sqlstore.
			BunDBCtx(ctx).
			NewInsert().
			Model(channel).
			Exec(ctx); err != nil {
			return err
		}

		return nil
	}, opts...)
}

func (store *config) GetChannelByID(ctx context.Context, orgID string, id valuer.UUID) (*alertmanagertypes.Channel, error) {
	channel := new(alertmanagertypes.Channel)

	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(channel).
		Where("org_id = ?", orgID).
		Where("id = ?", id.StringValue()).
		Scan(ctx)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.Newf(errors.TypeNotFound, alertmanagertypes.ErrCodeAlertmanagerChannelNotFound, "cannot find channel with id %s", id.StringValue())
		}
		return nil, err
	}

	return channel, nil
}

func (store *config) UpdateChannel(ctx context.Context, orgID string, channel *alertmanagertypes.Channel, opts ...alertmanagertypes.StoreOption) error {
	return store.wrap(ctx, func(ctx context.Context) error {
		if _, err := store.
			sqlstore.
			BunDBCtx(ctx).
			NewUpdate().
			Model(channel).
			WherePK().
			Exec(ctx); err != nil {
			return err
		}

		return nil
	}, opts...)
}

func (store *config) DeleteChannelByID(ctx context.Context, orgID string, id valuer.UUID, opts ...alertmanagertypes.StoreOption) error {
	return store.wrap(ctx, func(ctx context.Context) error {
		channel := new(alertmanagertypes.Channel)

		if _, err := store.
			sqlstore.
			BunDBCtx(ctx).
			NewDelete().
			Model(channel).
			Where("org_id = ?", orgID).
			Where("id = ?", id.StringValue()).
			Exec(ctx); err != nil {
			return err
		}

		return nil
	}, opts...)
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

func (store *config) GetMatchers(ctx context.Context, orgID string) (map[string][]string, error) {
	type matcher struct {
		bun.BaseModel `bun:"table:rule"`
		ID            valuer.UUID `bun:"id,pk"`
		Data          string      `bun:"data"`
	}

	matchers := []matcher{}

	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Column("id", "data").
		Model(&matchers).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	matchersMap := make(map[string][]string)
	for _, matcher := range matchers {
		receivers := gjson.Get(matcher.Data, "preferredChannels").Array()
		for _, receiver := range receivers {
			matchersMap[matcher.ID.StringValue()] = append(matchersMap[matcher.ID.StringValue()], receiver.String())
		}
	}

	return matchersMap, nil
}

func (store *config) wrap(ctx context.Context, fn func(ctx context.Context) error, opts ...alertmanagertypes.StoreOption) error {
	storeOpts := alertmanagertypes.NewStoreOptions(opts...)

	if storeOpts.Cb == nil {
		return fn(ctx)
	}

	return store.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		if err := fn(ctx); err != nil {
			return err
		}

		return storeOpts.Cb(ctx)
	})
}
