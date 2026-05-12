package impltag

import (
	"context"

	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/tagtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

type store struct {
	sqlstore sqlstore.SQLStore
}

func NewStore(sqlstore sqlstore.SQLStore) tagtypes.Store {
	return &store{sqlstore: sqlstore}
}

func (s *store) List(ctx context.Context, orgID valuer.UUID, kind coretypes.Kind) ([]*tagtypes.Tag, error) {
	tags := make([]*tagtypes.Tag, 0)
	err := s.sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(&tags).
		Where("org_id = ?", orgID).
		Where("kind = ?", kind).
		Scan(ctx)
	if err != nil {
		return nil, err
	}
	return tags, nil
}

func (s *store) ListByEntity(ctx context.Context, kind coretypes.Kind, entityID valuer.UUID) ([]*tagtypes.Tag, error) {
	tags := make([]*tagtypes.Tag, 0)
	err := s.sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(&tags).
		Join("JOIN tag_relation AS tr ON tr.tag_id = tag.id").
		Where("tr.kind = ?", kind).
		Where("tr.entity_id = ?", entityID).
		Scan(ctx)
	if err != nil {
		return nil, err
	}
	return tags, nil
}

func (s *store) ListByEntities(ctx context.Context, kind coretypes.Kind, entityIDs []valuer.UUID) (map[valuer.UUID][]*tagtypes.Tag, error) {
	if len(entityIDs) == 0 {
		return map[valuer.UUID][]*tagtypes.Tag{}, nil
	}

	type joinedRow struct {
		tagtypes.Tag `bun:",extend"`
		EntityID     valuer.UUID `bun:"entity_id"`
	}

	rows := make([]*joinedRow, 0)
	err := s.sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(&rows).
		ColumnExpr("tag.*, tr.entity_id").
		Join("JOIN tag_relation AS tr ON tr.tag_id = tag.id").
		Where("tr.kind = ?", kind).
		Where("tr.entity_id IN (?)", bun.In(entityIDs)).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	out := make(map[valuer.UUID][]*tagtypes.Tag)
	for _, r := range rows {
		tag := r.Tag
		out[r.EntityID] = append(out[r.EntityID], &tag)
	}
	return out, nil
}

func (s *store) Create(ctx context.Context, tags []*tagtypes.Tag) ([]*tagtypes.Tag, error) {
	if len(tags) == 0 {
		return tags, nil
	}
	// DO UPDATE on a self-set is a deliberate no-op write whose only purpose
	// is to make RETURNING fire on conflicting rows. Without it, RETURNING is
	// silent on the conflict path and we'd have to refetch by (key, value) to
	// learn the existing rows' IDs after a concurrent-insert race. Setting
	// key = tag.key (the existing row's value) preserves the first writer's
	// casing on case-only collisions.
	err := s.sqlstore.
		BunDBCtx(ctx).
		NewInsert().
		Model(&tags).
		On("CONFLICT (org_id, kind, (LOWER(key)), (LOWER(value))) DO UPDATE").
		Set("key = tag.key").
		Returning("*").
		Scan(ctx)
	if err != nil {
		return nil, err
	}
	return tags, nil
}

func (s *store) CreateRelations(ctx context.Context, relations []*tagtypes.TagRelation) error {
	if len(relations) == 0 {
		return nil
	}
	_, err := s.sqlstore.
		BunDBCtx(ctx).
		NewInsert().
		Model(&relations).
		On("CONFLICT (kind, entity_id, tag_id) DO NOTHING").
		Exec(ctx)
	return err
}

func (s *store) DeleteRelationsExcept(ctx context.Context, kind coretypes.Kind, entityID valuer.UUID, keepTagIDs []valuer.UUID) error {
	q := s.sqlstore.
		BunDBCtx(ctx).
		NewDelete().
		Model((*tagtypes.TagRelation)(nil)).
		Where("kind = ?", kind).
		Where("entity_id = ?", entityID)
	if len(keepTagIDs) > 0 {
		q = q.Where("tag_id NOT IN (?)", bun.In(keepTagIDs))
	}
	_, err := q.Exec(ctx)
	return err
}

func (s *store) RunInTx(ctx context.Context, cb func(ctx context.Context) error) error {
	return s.sqlstore.RunInTxCtx(ctx, nil, cb)
}
