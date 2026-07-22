package sqlalertmanagerstore

import (
	"context"
	"database/sql"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type atlassianConnectionStore struct {
	sqlstore sqlstore.SQLStore
}

// NewAtlassianConnectionStore returns a store for reusable Atlassian OAuth connections.
func NewAtlassianConnectionStore(sqlstore sqlstore.SQLStore) alertmanagertypes.AtlassianConnectionStore {
	return &atlassianConnectionStore{sqlstore: sqlstore}
}

func (store *atlassianConnectionStore) Create(ctx context.Context, conn *alertmanagertypes.AtlassianConnection) error {
	_, err := store.
		sqlstore.
		BunDB().
		NewInsert().
		Model(conn).
		Exec(ctx)
	return err
}

func (store *atlassianConnectionStore) GetByID(ctx context.Context, orgID string, id valuer.UUID) (*alertmanagertypes.AtlassianConnection, error) {
	conn := new(alertmanagertypes.AtlassianConnection)

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
			return nil, errors.Newf(errors.TypeNotFound, alertmanagertypes.ErrCodeAtlassianConnectionNotFound, "cannot find Atlassian connection with id %s", id.StringValue())
		}
		return nil, err
	}

	return conn, nil
}

func (store *atlassianConnectionStore) GetByOrgAndSiteURL(ctx context.Context, orgID string, siteURL string) (*alertmanagertypes.AtlassianConnection, error) {
	conn := new(alertmanagertypes.AtlassianConnection)

	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(conn).
		Where("org_id = ?", orgID).
		Where("site_url = ?", siteURL).
		Scan(ctx)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.Newf(errors.TypeNotFound, alertmanagertypes.ErrCodeAtlassianConnectionNotFound, "cannot find Atlassian connection for site %s", siteURL)
		}
		return nil, err
	}

	return conn, nil
}

func (store *atlassianConnectionStore) ListByOrg(ctx context.Context, orgID string) ([]*alertmanagertypes.AtlassianConnection, error) {
	var conns []*alertmanagertypes.AtlassianConnection

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

func (store *atlassianConnectionStore) Update(ctx context.Context, conn *alertmanagertypes.AtlassianConnection) error {
	_, err := store.
		sqlstore.
		BunDB().
		NewUpdate().
		Model(conn).
		WherePK().
		Exec(ctx)
	return err
}

func (store *atlassianConnectionStore) DeleteByID(ctx context.Context, orgID string, id valuer.UUID) error {
	conn := new(alertmanagertypes.AtlassianConnection)

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
