package implspanmapper

import (
	"context"
	"database/sql"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/spantypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type store struct {
	sqlstore sqlstore.SQLStore
}

func NewStore(sqlstore sqlstore.SQLStore) spantypes.Store {
	return &store{sqlstore: sqlstore}
}

func (s *store) ListSpanMapperGroups(ctx context.Context, orgID valuer.UUID, q *spantypes.ListSpanMapperGroupsQuery) ([]*spantypes.StorableSpanMapperGroup, error) {
	groups := make([]*spantypes.StorableSpanMapperGroup, 0)

	sel := s.sqlstore.
		BunDB().
		NewSelect().
		Model(&groups).
		Where("org_id = ?", orgID)

	if q != nil {
		if q.Category != nil {
			sel = sel.Where("category = ?", valuer.String(*q.Category).StringValue())
		}
		if q.Enabled != nil {
			sel = sel.Where("enabled = ?", *q.Enabled)
		}
	}

	if err := sel.Order("created_at DESC").Scan(ctx); err != nil {
		return nil, err
	}
	return groups, nil
}

func (s *store) GetSpanMapperGroup(ctx context.Context, orgID, id valuer.UUID) (*spantypes.StorableSpanMapperGroup, error) {
	group := new(spantypes.StorableSpanMapperGroup)

	err := s.sqlstore.
		BunDB().
		NewSelect().
		Model(group).
		Where("org_id = ?", orgID).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, s.sqlstore.WrapNotFoundErrf(err, spantypes.ErrCodeMappingGroupNotFound, "span mapper group %s not found", id)
		}
		return nil, err
	}
	return group, nil
}

func (s *store) CreateSpanMapperGroup(ctx context.Context, group *spantypes.StorableSpanMapperGroup) error {
	_, err := s.sqlstore.
		BunDBCtx(ctx).
		NewInsert().
		Model(group).
		Exec(ctx)
	if err != nil {
		return s.sqlstore.WrapAlreadyExistsErrf(err, spantypes.ErrCodeMappingGroupAlreadyExists, "span mapper group %q already exists", group.Name)
	}
	return nil
}

func (s *store) UpdateSpanMapperGroup(ctx context.Context, group *spantypes.StorableSpanMapperGroup) error {
	res, err := s.sqlstore.
		BunDBCtx(ctx).
		NewUpdate().
		Model(group).
		Where("org_id = ?", group.OrgID).
		Where("id = ?", group.ID).
		ExcludeColumn("id", "org_id", "created_at", "created_by").
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

func (s *store) DeleteSpanMapperGroup(ctx context.Context, orgID, id valuer.UUID) error {
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

func (s *store) ListSpanMappers(ctx context.Context, orgID, groupID valuer.UUID) ([]*spantypes.StorableSpanMapper, error) {
	mappers := make([]*spantypes.StorableSpanMapper, 0)

	// Scope by org via the parent group's org_id.
	if _, err := s.GetSpanMapperGroup(ctx, orgID, groupID); err != nil {
		return nil, err
	}

	if err := s.sqlstore.
		BunDB().
		NewSelect().
		Model(&mappers).
		Where("group_id = ?", groupID).
		Order("created_at DESC").
		Scan(ctx); err != nil {
		return nil, err
	}
	return mappers, nil
}

func (s *store) GetSpanMapper(ctx context.Context, orgID, groupID, id valuer.UUID) (*spantypes.StorableSpanMapper, error) {
	// Ensure the group belongs to the org.
	if _, err := s.GetSpanMapperGroup(ctx, orgID, groupID); err != nil {
		return nil, err
	}

	mapper := new(spantypes.StorableSpanMapper)
	err := s.sqlstore.
		BunDB().
		NewSelect().
		Model(mapper).
		Where("group_id = ?", groupID).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, s.sqlstore.WrapNotFoundErrf(err, spantypes.ErrCodeMapperNotFound, "span mapper %s not found", id)
		}
		return nil, err
	}
	return mapper, nil
}

func (s *store) CreateSpanMapper(ctx context.Context, mapper *spantypes.StorableSpanMapper) error {
	_, err := s.sqlstore.
		BunDBCtx(ctx).
		NewInsert().
		Model(mapper).
		Exec(ctx)
	if err != nil {
		return s.sqlstore.WrapAlreadyExistsErrf(err, spantypes.ErrCodeMapperAlreadyExists, "span mapper %q already exists", mapper.Name)
	}
	return nil
}

func (s *store) UpdateSpanMapper(ctx context.Context, mapper *spantypes.StorableSpanMapper) error {
	res, err := s.sqlstore.
		BunDBCtx(ctx).
		NewUpdate().
		Model(mapper).
		Where("group_id = ?", mapper.GroupID).
		Where("id = ?", mapper.ID).
		ExcludeColumn("id", "group_id", "created_at", "created_by").
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

func (s *store) DeleteSpanMapper(ctx context.Context, orgID, groupID, id valuer.UUID) error {
	if _, err := s.GetSpanMapperGroup(ctx, orgID, groupID); err != nil {
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
