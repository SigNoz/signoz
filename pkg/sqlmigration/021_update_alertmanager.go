package sqlmigration

import (
	"context"
	"database/sql"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type updateAlertmanager struct {
	store sqlstore.SQLStore
}

type existingChannel struct {
	bun.BaseModel `bun:"table:notification_channels"`
	ID            int       `json:"id" bun:"id,pk,autoincrement"`
	Name          string    `json:"name" bun:"name"`
	Type          string    `json:"type" bun:"type"`
	Data          string    `json:"data" bun:"data"`
	CreatedAt     time.Time `json:"created_at" bun:"created_at"`
	UpdatedAt     time.Time `json:"updated_at" bun:"updated_at"`
	OrgID         string    `json:"org_id" bun:"org_id"`
}

type newChannel struct {
	bun.BaseModel `bun:"table:notification_channel"`
	types.Identifiable
	types.TimeAuditable
	Name  string `json:"name" bun:"name"`
	Type  string `json:"type" bun:"type"`
	Data  string `json:"data" bun:"data"`
	OrgID string `json:"org_id" bun:"org_id"`
}

type existingAlertmanagerConfig struct {
	bun.BaseModel `bun:"table:alertmanager_config"`
	ID            uint64    `bun:"id,pk,autoincrement"`
	Config        string    `bun:"config,notnull,type:text"`
	Hash          string    `bun:"hash,notnull,type:text"`
	CreatedAt     time.Time `bun:"created_at,notnull"`
	UpdatedAt     time.Time `bun:"updated_at,notnull"`
	OrgID         string    `bun:"org_id,notnull,unique"`
}

type newAlertmanagerConfig struct {
	bun.BaseModel `bun:"table:alertmanager_config_new"`
	types.Identifiable
	types.TimeAuditable
	Config string `bun:"config,notnull,type:text"`
	Hash   string `bun:"hash,notnull,type:text"`
	OrgID  string `bun:"org_id,notnull,unique"`
}

type existingAlertmanagerState struct {
	bun.BaseModel `bun:"table:alertmanager_state"`
	ID            uint64    `bun:"id,pk,autoincrement"`
	Silences      string    `bun:"silences,nullzero,type:text"`
	NFLog         string    `bun:"nflog,nullzero,type:text"`
	CreatedAt     time.Time `bun:"created_at,notnull"`
	UpdatedAt     time.Time `bun:"updated_at,notnull"`
	OrgID         string    `bun:"org_id,notnull,unique"`
}

type newAlertmanagerState struct {
	bun.BaseModel `bun:"table:alertmanager_state_new"`
	types.Identifiable
	types.TimeAuditable
	Silences string `bun:"silences,nullzero,type:text"`
	NFLog    string `bun:"nflog,nullzero,type:text"`
	OrgID    string `bun:"org_id,notnull,unique"`
}

func NewUpdateAlertmanagerFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("update_alertmanager"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newUpdateAlertmanager(ctx, ps, c, sqlstore)
	})
}

func newUpdateAlertmanager(_ context.Context, _ factory.ProviderSettings, _ Config, store sqlstore.SQLStore) (SQLMigration, error) {
	return &updateAlertmanager{store: store}, nil
}

func (migration *updateAlertmanager) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *updateAlertmanager) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	err = migration.
		store.
		Dialect().
		RenameTableAndModifyModel(ctx, tx, new(existingChannel), new(newChannel), []string{OrgReference}, func(ctx context.Context) error {
			existingChannels := make([]*existingChannel, 0)
			err = tx.
				NewSelect().
				Model(&existingChannels).
				Scan(ctx)
			if err != nil {
				if err != sql.ErrNoRows {
					return err
				}
			}

			if err == nil && len(existingChannels) > 0 {
				newChannels := migration.
					CopyOldChannelToNewChannel(existingChannels)
				_, err = tx.
					NewInsert().
					Model(&newChannels).
					Exec(ctx)
				if err != nil {
					return err
				}
			}
			return nil
		})
	if err != nil {
		return err
	}

	err = migration.
		store.
		Dialect().
		UpdatePrimaryKey(ctx, tx, new(existingAlertmanagerConfig), new(newAlertmanagerConfig), OrgReference, func(ctx context.Context) error {
			existingAlertmanagerConfigs := make([]*existingAlertmanagerConfig, 0)
			err = tx.
				NewSelect().
				Model(&existingAlertmanagerConfigs).
				Scan(ctx)
			if err != nil {
				if err != sql.ErrNoRows {
					return err
				}
			}

			if err == nil && len(existingAlertmanagerConfigs) > 0 {
				newAlertmanagerConfigs := migration.
					CopyOldConfigToNewConfig(existingAlertmanagerConfigs)
				_, err = tx.
					NewInsert().
					Model(&newAlertmanagerConfigs).
					Exec(ctx)
				if err != nil {
					return err
				}
			}
			return nil
		})
	if err != nil {
		return err
	}

	err = migration.
		store.
		Dialect().
		UpdatePrimaryKey(ctx, tx, new(existingAlertmanagerState), new(newAlertmanagerState), OrgReference, func(ctx context.Context) error {
			existingAlertmanagerStates := make([]*existingAlertmanagerState, 0)
			err = tx.
				NewSelect().
				Model(&existingAlertmanagerStates).
				Scan(ctx)
			if err != nil {
				if err != sql.ErrNoRows {
					return err
				}
			}

			if err == nil && len(existingAlertmanagerStates) > 0 {
				newAlertmanagerStates := migration.
					CopyOldStateToNewState(existingAlertmanagerStates)
				_, err = tx.
					NewInsert().
					Model(&newAlertmanagerStates).
					Exec(ctx)
				if err != nil {
					return err
				}
			}
			return nil
		})
	if err != nil {
		return err
	}

	err = tx.Commit()
	if err != nil {
		return err
	}

	return nil
}

func (migration *updateAlertmanager) Down(context.Context, *bun.DB) error {
	return nil
}

func (migration *updateAlertmanager) CopyOldChannelToNewChannel(existingChannels []*existingChannel) []*newChannel {
	newChannels := make([]*newChannel, 0)
	for _, channel := range existingChannels {
		newChannels = append(newChannels, &newChannel{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			TimeAuditable: types.TimeAuditable{
				CreatedAt: channel.CreatedAt,
				UpdatedAt: channel.UpdatedAt,
			},
			Name:  channel.Name,
			Type:  channel.Type,
			Data:  channel.Data,
			OrgID: channel.OrgID,
		})
	}

	return newChannels
}

func (migration *updateAlertmanager) CopyOldConfigToNewConfig(existingAlertmanagerConfigs []*existingAlertmanagerConfig) []*newAlertmanagerConfig {
	newAlertmanagerConfigs := make([]*newAlertmanagerConfig, 0)
	for _, config := range existingAlertmanagerConfigs {
		newAlertmanagerConfigs = append(newAlertmanagerConfigs, &newAlertmanagerConfig{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			TimeAuditable: types.TimeAuditable{
				CreatedAt: config.CreatedAt,
				UpdatedAt: config.UpdatedAt,
			},
			Config: config.Config,
			Hash:   config.Hash,
			OrgID:  config.OrgID,
		})
	}

	return newAlertmanagerConfigs
}

func (migration *updateAlertmanager) CopyOldStateToNewState(existingAlertmanagerStates []*existingAlertmanagerState) []*newAlertmanagerState {
	newAlertmanagerStates := make([]*newAlertmanagerState, 0)
	for _, state := range existingAlertmanagerStates {
		newAlertmanagerStates = append(newAlertmanagerStates, &newAlertmanagerState{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			TimeAuditable: types.TimeAuditable{
				CreatedAt: state.CreatedAt,
				UpdatedAt: state.UpdatedAt,
			},
			Silences: state.Silences,
			NFLog:    state.NFLog,
			OrgID:    state.OrgID,
		})
	}

	return newAlertmanagerStates
}
