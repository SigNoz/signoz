package implorganization

import (
	"context"
	"database/sql"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type store struct {
	store sqlstore.SQLStore
}

func NewStore(db sqlstore.SQLStore) types.OrganizationStore {
	return &store{store: db}
}

func (s *store) Create(ctx context.Context, organization *types.Organization) error {
	_, err := s.
		store.
		BunDB().
		NewInsert().
		Model(organization).
		Exec(ctx)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to create organization")
	}

	return nil
}

func (s *store) Get(ctx context.Context, id valuer.UUID) (*types.Organization, error) {
	organization := new(types.Organization)
	err := s.
		store.
		BunDB().
		NewSelect().
		Model(organization).
		Where("id = ?", id.StringValue()).
		Scan(ctx)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "no organization found with id: %s", id.StringValue())
		}
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to get organization with id: %s", id.StringValue())
	}

	return organization, nil
}

func (s *store) GetAll(ctx context.Context) ([]*types.Organization, error) {
	organizations := make([]*types.Organization, 0)
	err := s.
		store.
		BunDB().
		NewSelect().
		Model(&organizations).
		Scan(ctx)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "no organizations found")
		}
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to get all organization")
	}

	return organizations, nil
}

func (s *store) Update(ctx context.Context, organization *types.Organization) error {
	_, err := s.
		store.
		BunDB().
		NewUpdate().
		Model(organization).
		Set("display_name = ?", organization.DisplayName).
		Where("id = ?", organization.ID.StringValue()).
		Exec(ctx)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to update organization with id:%s", organization.ID.StringValue())
	}
	return nil
}

func (s *store) Delete(ctx context.Context, id valuer.UUID) error {
	_, err := s.
		store.
		BunDB().
		NewDelete().
		Model(new(types.Organization)).
		Where("id = ?", id.StringValue()).
		Exec(ctx)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to delete organization with id:%s", id.StringValue())
	}

	return nil
}
