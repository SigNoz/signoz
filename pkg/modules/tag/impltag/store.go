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

func (s *store) ListByResource(ctx context.Context, orgID valuer.UUID, kind coretypes.Kind, resourceID valuer.UUID) ([]*tagtypes.Tag, error) {
	tags := make([]*tagtypes.Tag, 0)
	err := s.sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(&tags).
		Join("JOIN tag_relation AS tr ON tr.tag_id = tag.id").
		Where("tr.kind = ?", kind).
		Where("tr.resource_id = ?", resourceID).
		Where("tag.org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, err
	}
	return tags, nil
}

func (s *store) ListByResources(ctx context.Context, orgID valuer.UUID, kind coretypes.Kind, resourceIDs []valuer.UUID) (map[valuer.UUID][]*tagtypes.Tag, error) {
	if len(resourceIDs) == 0 {
		return map[valuer.UUID][]*tagtypes.Tag{}, nil
	}

	type joinedRow struct {
		tagtypes.Tag `bun:",extend"`
		ResourceID   valuer.UUID `bun:"resource_id"`
	}

	rows := make([]*joinedRow, 0)
	err := s.sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(&rows).
		ColumnExpr("tag.*, tr.resource_id").
		Join("JOIN tag_relation AS tr ON tr.tag_id = tag.id").
		Where("tr.kind = ?", kind).
		Where("tr.resource_id IN (?)", bun.In(resourceIDs)).
		Where("tag.org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	out := make(map[valuer.UUID][]*tagtypes.Tag)
	for _, r := range rows {
		tag := r.Tag
		out[r.ResourceID] = append(out[r.ResourceID], &tag)
	}
	return out, nil
}

func (s *store) CreateOrGet(ctx context.Context, tags []*tagtypes.Tag) ([]*tagtypes.Tag, error) {
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
		// On("CONFLICT (org_id, kind, (LOWER(key)), (LOWER(value))) DO UPDATE").
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
		On("CONFLICT (kind, resource_id, tag_id) DO NOTHING").
		Exec(ctx)
	return err
}

func (s *store) DeleteRelationsExcept(ctx context.Context, orgID valuer.UUID, kind coretypes.Kind, resourceID valuer.UUID, keepTagIDs []valuer.UUID) error {
	// Scope the delete to the caller's org via a subquery on tag — bun's
	// DELETE-with-JOIN syntax isn't uniformly portable across Postgres/SQLite.
	tagIDsToDelete := s.sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		TableExpr("tag").
		Column("id").
		Where("org_id = ?", orgID)
	if len(keepTagIDs) > 0 {
		tagIDsToDelete = tagIDsToDelete.Where("id NOT IN (?)", bun.In(keepTagIDs))
	}
	_, err := s.sqlstore.
		BunDBCtx(ctx).
		NewDelete().
		Model((*tagtypes.TagRelation)(nil)).
		Where("kind = ?", kind).
		Where("resource_id = ?", resourceID).
		Where("tag_id IN (?)", tagIDsToDelete).
		Exec(ctx)
	return err
}

func (s *store) RunInTx(ctx context.Context, cb func(ctx context.Context) error) error {
	return s.sqlstore.RunInTxCtx(ctx, nil, cb)
}
