package implspanmapper

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/spantypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type store struct {
	sqlstore sqlstore.SQLStore
}

func NewStore(sqlstore sqlstore.SQLStore) spantypes.SpanMapperStore {
	return &store{sqlstore: sqlstore}
}

func (s *store) CreateGroup(ctx context.Context, group *spantypes.SpanMapperGroup) error {
	storable := group.ToStorable()
	_, err := s.sqlstore.
		BunDBCtx(ctx).
		NewInsert().
		Model(storable).
		Exec(ctx)
	if err != nil {
		return s.sqlstore.WrapAlreadyExistsErrf(err, spantypes.ErrCodeMappingGroupAlreadyExists, "span mapper group %q already exists", group.Name)
	}
	return nil
}

func (s *store) GetGroup(ctx context.Context, orgID, id valuer.UUID) (*spantypes.SpanMapperGroup, error) {
	storable := new(spantypes.StorableSpanMapperGroup)

	err := s.sqlstore.
		BunDB().
		NewSelect().
		Model(storable).
		Where("org_id = ?", orgID).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		return nil, s.sqlstore.WrapNotFoundErrf(err, spantypes.ErrCodeMappingGroupNotFound, "span mapper group %s not found", id)
	}
	return storable.ToSpanMapperGroup(), nil
}

func (s *store) ListGroups(ctx context.Context, orgID valuer.UUID, q *spantypes.ListSpanMapperGroupsQuery) ([]*spantypes.SpanMapperGroup, error) {
	storables := make([]*spantypes.StorableSpanMapperGroup, 0)

	sel := s.sqlstore.
		BunDB().
		NewSelect().
		Model(&storables).
		Where("org_id = ?", orgID)

	if q != nil {
		if q.Enabled != nil {
			sel = sel.Where("enabled = ?", *q.Enabled)
		}
	}

	if err := sel.Order("created_at DESC").Scan(ctx); err != nil {
		return nil, err
	}
	return spantypes.NewSpanMapperGroupsFromStorable(storables), nil
}

func (s *store) UpdateGroup(ctx context.Context, group *spantypes.SpanMapperGroup) error {
	storable := group.ToStorable()
	res, err := s.sqlstore.
		BunDBCtx(ctx).
		NewUpdate().
		Model(storable).
		Where("org_id = ?", storable.OrgID).
		Where("id = ?", storable.ID).
		Exec(ctx)
	if err != nil {
		return err
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return errors.Newf(errors.TypeNotFound, spantypes.ErrCodeMappingGroupNotFound, "span mapper group %s not found", group.ID)
	}
	return nil
}

func (s *store) DeleteGroup(ctx context.Context, orgID, id valuer.UUID) error {
	tx, err := s.sqlstore.BunDBCtx(ctx).BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	// Cascade: remove mappers belonging to this group first.
	if _, err := tx.NewDelete().
		Model((*spantypes.StorableSpanMapper)(nil)).
		Where("group_id = ?", id).
		Exec(ctx); err != nil {
		return err
	}

	res, err := tx.NewDelete().
		Model((*spantypes.StorableSpanMapperGroup)(nil)).
		Where("org_id = ?", orgID).
		Where("id = ?", id).
		Exec(ctx)
	if err != nil {
		return err
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return errors.Newf(errors.TypeNotFound, spantypes.ErrCodeMappingGroupNotFound, "span mapper group %s not found", id)
	}

	return tx.Commit()
}

func (s *store) CreateMapper(ctx context.Context, mapper *spantypes.SpanMapper) error {
	storable := mapper.ToStorable()
	_, err := s.sqlstore.
		BunDBCtx(ctx).
		NewInsert().
		Model(storable).
		Exec(ctx)
	if err != nil {
		return s.sqlstore.WrapAlreadyExistsErrf(err, spantypes.ErrCodeMapperAlreadyExists, "span mapper %q already exists", mapper.Name)
	}
	return nil
}

func (s *store) GetMapper(ctx context.Context, orgID, groupID, id valuer.UUID) (*spantypes.SpanMapper, error) {
	// Ensure the group belongs to the org.
	if _, err := s.GetGroup(ctx, orgID, groupID); err != nil {
		return nil, err
	}

	storable := new(spantypes.StorableSpanMapper)
	err := s.sqlstore.
		BunDB().
		NewSelect().
		Model(storable).
		Where("group_id = ?", groupID).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		return nil, s.sqlstore.WrapNotFoundErrf(err, spantypes.ErrCodeMapperNotFound, "span mapper %s not found", id)
	}
	return storable.ToSpanMapper(), nil
}

func (s *store) ListMappers(ctx context.Context, orgID, groupID valuer.UUID) ([]*spantypes.SpanMapper, error) {
	// Scope by org via the parent group's org_id.
	if _, err := s.GetGroup(ctx, orgID, groupID); err != nil {
		return nil, err
	}

	storables := make([]*spantypes.StorableSpanMapper, 0)
	if err := s.sqlstore.
		BunDB().
		NewSelect().
		Model(&storables).
		Where("group_id = ?", groupID).
		Order("created_at DESC").
		Scan(ctx); err != nil {
		return nil, err
	}
	return spantypes.NewSpanMappersFromStorable(storables), nil
}

func (s *store) UpdateMapper(ctx context.Context, mapper *spantypes.SpanMapper) error {
	storable := mapper.ToStorable()
	res, err := s.sqlstore.
		BunDBCtx(ctx).
		NewUpdate().
		Model(storable).
		Where("group_id = ?", storable.GroupID).
		Where("id = ?", storable.ID).
		Exec(ctx)
	if err != nil {
		return err
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return errors.Newf(errors.TypeNotFound, spantypes.ErrCodeMapperNotFound, "span mapper %s not found", mapper.ID)
	}
	return nil
}

func (s *store) DeleteMapper(ctx context.Context, orgID, groupID, id valuer.UUID) error {
	if _, err := s.GetGroup(ctx, orgID, groupID); err != nil {
		return err
	}

	res, err := s.sqlstore.
		BunDBCtx(ctx).
		NewDelete().
		Model((*spantypes.StorableSpanMapper)(nil)).
		Where("group_id = ?", groupID).
		Where("id = ?", id).
		Exec(ctx)
	if err != nil {
		return err
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return errors.Newf(errors.TypeNotFound, spantypes.ErrCodeMapperNotFound, "span mapper %s not found", id)
	}
	return nil
}
