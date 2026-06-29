package sqlalertmanagerstore

import (
	"context"
	"database/sql"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type jsmOpsConnectionStore struct {
	sqlstore sqlstore.SQLStore
}

// NewJsmOpsConnectionStore returns a store for reusable JSM Ops OAuth connections.
func NewJsmOpsConnectionStore(sqlstore sqlstore.SQLStore) alertmanagertypes.JsmOpsConnectionStore {
	return &jsmOpsConnectionStore{sqlstore: sqlstore}
}

func (store *jsmOpsConnectionStore) Create(ctx context.Context, conn *alertmanagertypes.JsmOpsConnection) error {
	_, err := store.
		sqlstore.
		BunDB().
		NewInsert().
		Model(conn).
		Exec(ctx)
	return err
}

func (store *jsmOpsConnectionStore) GetByID(ctx context.Context, orgID string, id valuer.UUID) (*alertmanagertypes.JsmOpsConnection, error) {
	conn := new(alertmanagertypes.JsmOpsConnection)

	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(conn).
		Where("org_id = ?", orgID).
		Where("id = ?", id.StringValue()).
		Scan(ctx)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.Newf(errors.TypeNotFound, alertmanagertypes.ErrCodeJsmOpsConnectionNotFound, "cannot find JSM Ops connection with id %s", id.StringValue())
		}
		return nil, err
	}

	return conn, nil
}

func (store *jsmOpsConnectionStore) GetByOrgAndCloudID(ctx context.Context, orgID string, cloudID string) (*alertmanagertypes.JsmOpsConnection, error) {
	conn := new(alertmanagertypes.JsmOpsConnection)

	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(conn).
		Where("org_id = ?", orgID).
		Where("cloud_id = ?", cloudID).
		Scan(ctx)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.Newf(errors.TypeNotFound, alertmanagertypes.ErrCodeJsmOpsConnectionNotFound, "cannot find JSM Ops connection for cloud_id %s", cloudID)
		}
		return nil, err
	}

	return conn, nil
}

func (store *jsmOpsConnectionStore) ListByOrg(ctx context.Context, orgID string) ([]*alertmanagertypes.JsmOpsConnection, error) {
	var conns []*alertmanagertypes.JsmOpsConnection

	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(&conns).
		Where("org_id = ?", orgID).
		Order("created_at DESC").
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return conns, nil
}

func (store *jsmOpsConnectionStore) Update(ctx context.Context, conn *alertmanagertypes.JsmOpsConnection) error {
	_, err := store.
		sqlstore.
		BunDB().
		NewUpdate().
		Model(conn).
		WherePK().
		Exec(ctx)
	return err
}

func (store *jsmOpsConnectionStore) UpdateTokensByRefreshToken(ctx context.Context, oldRefreshToken, accessToken, refreshToken string) (int64, error) {
	res, err := store.
		sqlstore.
		BunDB().
		NewUpdate().
		Model((*alertmanagertypes.JsmOpsConnection)(nil)).
		Set("access_token = ?", accessToken).
		Set("refresh_token = ?", refreshToken).
		Set("updated_at = ?", time.Now()).
		Where("refresh_token = ?", oldRefreshToken).
		Exec(ctx)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

func (store *jsmOpsConnectionStore) DeleteByID(ctx context.Context, orgID string, id valuer.UUID) error {
	conn := new(alertmanagertypes.JsmOpsConnection)

	_, err := store.
		sqlstore.
		BunDB().
		NewDelete().
		Model(conn).
		Where("org_id = ?", orgID).
		Where("id = ?", id.StringValue()).
		Exec(ctx)
	return err
}
