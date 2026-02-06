package implrootuser

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

type store struct {
	sqlstore sqlstore.SQLStore
	settings factory.ProviderSettings
}

func NewStore(sqlstore sqlstore.SQLStore, settings factory.ProviderSettings) types.RootUserStore {
	return &store{
		sqlstore: sqlstore,
		settings: settings,
	}
}

func (store *store) Create(ctx context.Context, rootUser *types.RootUser) error {
	_, err := store.sqlstore.BunDBCtx(ctx).
		NewInsert().
		Model(rootUser).
		Exec(ctx)
	if err != nil {
		return store.sqlstore.WrapAlreadyExistsErrf(err, types.ErrCodeRootUserAlreadyExists, "root user with email %s already exists in org %s", rootUser.Email, rootUser.OrgID)
	}

	return nil
}

func (store *store) GetByOrgID(ctx context.Context, orgID valuer.UUID) (*types.RootUser, error) {
	rootUser := new(types.RootUser)

	err := store.sqlstore.BunDBCtx(ctx).
		NewSelect().
		Model(rootUser).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, types.ErrCodeRootUserNotFound, "root user with org_id %s does not exist", orgID)
	}
	return rootUser, nil
}

func (store *store) GetByEmailAndOrgID(ctx context.Context, orgID valuer.UUID, email valuer.Email) (*types.RootUser, error) {
	rootUser := new(types.RootUser)

	err := store.sqlstore.BunDBCtx(ctx).
		NewSelect().
		Model(rootUser).
		Where("email = ?", email).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, types.ErrCodeRootUserNotFound, "root user with email %s does not exist in org %s", email, orgID)
	}
	return rootUser, nil
}

func (store *store) GetByOrgIDAndID(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*types.RootUser, error) {
	rootUser := new(types.RootUser)

	err := store.sqlstore.BunDBCtx(ctx).
		NewSelect().
		Model(rootUser).
		Where("id = ?", id).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, types.ErrCodeRootUserNotFound, "root user with id %s does not exist in org %s", id, orgID)
	}
	return rootUser, nil
}

func (store *store) GetByEmailAndOrgIDs(ctx context.Context, orgIDs []valuer.UUID, email valuer.Email) ([]*types.RootUser, error) {
	rootUsers := []*types.RootUser{}

	err := store.sqlstore.BunDBCtx(ctx).
		NewSelect().
		Model(&rootUsers).
		Where("email = ?", email).
		Where("org_id IN (?)", bun.In(orgIDs)).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, types.ErrCodeRootUserNotFound, "root user with email %s does not exist in orgs %s", email, orgIDs)
	}

	return rootUsers, nil
}

func (store *store) ExistsByOrgID(ctx context.Context, orgID valuer.UUID) (bool, error) {
	exists, err := store.sqlstore.BunDBCtx(ctx).
		NewSelect().
		Model(new(types.RootUser)).
		Where("org_id = ?", orgID).
		Exists(ctx)
	if err != nil {
		return false, err
	}

	return exists, nil
}

func (store *store) Update(ctx context.Context, orgID valuer.UUID, id valuer.UUID, rootUser *types.RootUser) error {
	rootUser.UpdatedAt = time.Now()
	_, err := store.sqlstore.BunDBCtx(ctx).
		NewUpdate().
		Model(rootUser).
		Column("email").
		Column("password_hash").
		Column("updated_at").
		Where("id = ?", id).
		Where("org_id = ?", orgID).
		Exec(ctx)
	if err != nil {
		return store.sqlstore.WrapNotFoundErrf(err, types.ErrCodeRootUserNotFound, "root user with id %s does not exist", id)
	}
	return nil
}
