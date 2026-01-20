package implorganization

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type store struct {
	sqlstore sqlstore.SQLStore
}

func NewStore(sqlstore sqlstore.SQLStore) types.OrganizationStore {
	return &store{sqlstore: sqlstore}
}

func (store *store) Create(ctx context.Context, organization *types.Organization) error {
	_, err := store.
		sqlstore.
		BunDBCtx(ctx).
		NewInsert().
		Model(organization).
		Exec(ctx)
	if err != nil {
		return store.sqlstore.WrapAlreadyExistsErrf(err, types.ErrOrganizationAlreadyExists, "organization with name: %s already exists", organization.Name)
	}

	return nil
}

func (store *store) Get(ctx context.Context, id valuer.UUID) (*types.Organization, error) {
	organization := new(types.Organization)
	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(organization).
		Where("id = ?", id.StringValue()).
		Scan(ctx)
	if err != nil {
		return nil, store.sqlstore.WrapNotFoundErrf(err, types.ErrOrganizationNotFound, "organization with id: %s does not exist", id.StringValue())
	}

	return organization, nil
}

func (store *store) GetAll(ctx context.Context) ([]*types.Organization, error) {
	organizations := make([]*types.Organization, 0)
	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(&organizations).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return organizations, nil
}

func (store *store) Update(ctx context.Context, organization *types.Organization) error {
	_, err := store.
		sqlstore.
		BunDB().
		NewUpdate().
		Model(organization).
		Set("display_name = ?", organization.DisplayName).
		Set("updated_at = ?", time.Now()).
		Where("id = ?", organization.ID.StringValue()).
		Exec(ctx)
	if err != nil {
		return store.sqlstore.WrapAlreadyExistsErrf(err, types.ErrOrganizationAlreadyExists, "organization already exists")
	}
	return nil
}

func (store *store) Delete(ctx context.Context, id valuer.UUID) error {
	_, err := store.
		sqlstore.
		BunDB().
		NewDelete().
		Model(new(types.Organization)).
		Where("id = ?", id.StringValue()).
		Exec(ctx)
	if err != nil {
		return err
	}

	return nil
}

func (store *store) ListByKeyRange(ctx context.Context, start, end uint32) ([]*types.Organization, error) {
	organizations := make([]*types.Organization, 0)
	err := store.
		sqlstore.
		BunDB().
		NewSelect().
		Model(&organizations).
		Where("key >= ?", start).
		Where("key <= ?", end).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return organizations, nil
}
