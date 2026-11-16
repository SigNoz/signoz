package kafkacondensedmeter

import (
	"context"

	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/condensedmetertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type store struct {
	sqlstore sqlstore.SQLStore
}

func newStore(sqlstore sqlstore.SQLStore) condensedmetertypes.Store {
	return &store{sqlstore: sqlstore}
}

func (s *store) Get(ctx context.Context, orgID valuer.UUID) (*condensedmetertypes.Checkpoint, error) {
	checkpoint := new(condensedmetertypes.Checkpoint)
	err := s.sqlstore.
		BunDBCtx(ctx).
		NewSelect().
		Model(checkpoint).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, s.sqlstore.WrapNotFoundErrf(err, condensedmetertypes.ErrCodeCheckpointNotFound, "no condensed meter checkpoint found for org %q", orgID.StringValue())
	}
	return checkpoint, nil
}

func (s *store) Upsert(ctx context.Context, checkpoint *condensedmetertypes.Checkpoint) error {
	_, err := s.sqlstore.
		BunDBCtx(ctx).
		NewInsert().
		Model(checkpoint).
		On("CONFLICT (org_id) DO UPDATE").
		Set("last_reported_hour = EXCLUDED.last_reported_hour").
		Set("updated_at = EXCLUDED.updated_at").
		Exec(ctx)
	return err
}
