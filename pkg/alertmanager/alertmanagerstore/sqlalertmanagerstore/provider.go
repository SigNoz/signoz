package sqlalertmanagerstore

import (
	"context"
	"database/sql"
	"encoding/base64"
	"fmt"

	"go.signoz.io/signoz/pkg/alertmanager/alertmanagerstore"
	"go.signoz.io/signoz/pkg/errors"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/sqlstore"
	"go.signoz.io/signoz/pkg/types/alertmanagertypes"
)

type provider struct {
	sqlstore sqlstore.SQLStore
	settings factory.ScopedProviderSettings
}

func NewFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[alertmanagerstore.Store, alertmanagerstore.Config] {
	return factory.NewProviderFactory(factory.MustNewName("sql"), func(ctx context.Context, settings factory.ProviderSettings, config alertmanagerstore.Config) (alertmanagerstore.Store, error) {
		return New(ctx, settings, config, sqlstore)
	})
}

func New(ctx context.Context, settings factory.ProviderSettings, config alertmanagerstore.Config, sqlstore sqlstore.SQLStore) (*provider, error) {
	return &provider{
		sqlstore: sqlstore,
		settings: factory.NewScopedProviderSettings(settings, "go.signoz.io/signoz/pkg/alertmanager/alertmanagerstore/sqlalertmanagerstore"),
	}, nil
}

func (provider *provider) GetState(ctx context.Context, orgID string, stateName alertmanagertypes.StateName) (string, error) {
	storedConfig := new(alertmanagertypes.StoredConfig)

	err := provider.
		sqlstore.
		BunDB().
		NewSelect().
		Model(storedConfig).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", errors.Newf(errors.TypeNotFound, alertmanagerstore.ErrCodeAlertmanagerStateNotFound, "cannot find alertmanager state for org %s", orgID)
		}

		return "", err
	}

	if stateName == alertmanagertypes.SilenceStateName {
		decodedState, err := base64.RawStdEncoding.DecodeString(storedConfig.SilencesState)
		if err != nil {
			return "", err
		}

		return string(decodedState), nil
	}

	if stateName == alertmanagertypes.NFLogStateName {
		decodedState, err := base64.RawStdEncoding.DecodeString(storedConfig.NFLogState)
		if err != nil {
			return "", err
		}

		return string(decodedState), nil
	}

	return "", errors.Newf(errors.TypeNotFound, alertmanagerstore.ErrCodeAlertmanagerStateNotFound, "cannot find alertmanager state for org %s", orgID)
}

func (provider *provider) SetState(ctx context.Context, orgID string, stateName alertmanagertypes.StateName, state alertmanagertypes.State) (int64, error) {
	marshalledState, err := state.MarshalBinary()
	if err != nil {
		return 0, err
	}
	encodedState := base64.StdEncoding.EncodeToString(marshalledState)

	q := provider.
		sqlstore.
		BunDB().
		NewUpdate().
		Model(&alertmanagertypes.StoredConfig{}).
		Where("org_id = ?", orgID)

	if stateName == alertmanagertypes.SilenceStateName {
		q.Set("silences_state = ?", encodedState)
	}

	if stateName == alertmanagertypes.NFLogStateName {
		q.Set("nflog_state = ?", encodedState)
	}

	_, err = q.Exec(ctx)
	if err != nil {
		return 0, err
	}

	return int64(len(marshalledState)), nil
}

func (provider *provider) GetConfig(ctx context.Context, orgID string) (*alertmanagertypes.Config, error) {
	storedConfig := new(alertmanagertypes.StoredConfig)

	err := provider.
		sqlstore.
		BunDB().
		NewSelect().
		Model(storedConfig).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.Newf(errors.TypeNotFound, alertmanagerstore.ErrCodeAlertmanagerConfigNotFound, "cannot find alertmanager config for org %s", orgID)
		}

		return nil, err
	}

	config, err := alertmanagertypes.NewConfigFromString(storedConfig.Config, orgID)
	if err != nil {
		return nil, err
	}

	return config, nil
}

func (provider *provider) SetConfig(ctx context.Context, orgID string, config *alertmanagertypes.Config) error {
	tx, err := provider.sqlstore.BunDB().BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer tx.Rollback() //nolint:errcheck

	if _, err = tx.
		NewInsert().
		Model(config.StoredConfig()).
		On("CONFLICT (org_id) DO UPDATE").
		Set("config = ?", string(config.StoredConfig().Config)).
		Set("updated_at = ?", config.StoredConfig().UpdatedAt).
		Exec(ctx); err != nil {
		return err
	}

	channels := config.Channels()
	fmt.Println("channels", channels)
	if len(channels) != 0 {
		fmt.Println("channels", channels)
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

func (provider *provider) DelConfig(ctx context.Context, orgID string) error {
	_, err := provider.
		sqlstore.
		BunDB().
		NewDelete().
		Model(&alertmanagertypes.StoredConfig{}).
		Where("org_id = ?", orgID).
		Exec(ctx)
	if err != nil {
		return err
	}

	_, err = provider.
		sqlstore.
		BunDB().
		NewDelete().
		Model(&alertmanagertypes.Channel{}).
		Where("org_id = ?", orgID).
		Exec(ctx)
	if err != nil {
		return err
	}

	return nil
}

func (provider *provider) ListOrgIDs(ctx context.Context) ([]string, error) {
	var orgIDs []string

	err := provider.
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

func (provider *provider) ListChannels(ctx context.Context, orgID string) (alertmanagertypes.Channels, error) {
	channels := alertmanagertypes.Channels{}

	err := provider.
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

func (provider *provider) GetChannel(ctx context.Context, orgID string, id uint64) (*alertmanagertypes.Channel, error) {
	channel := new(alertmanagertypes.Channel)

	err := provider.
		sqlstore.
		BunDB().
		NewSelect().
		Model(channel).
		Where("org_id = ?", orgID).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.Newf(errors.TypeNotFound, alertmanagerstore.ErrCodeAlertmanagerChannelNotFound, "cannot find channel for org %s", orgID)
		}

		return nil, err
	}

	return channel, nil
}
