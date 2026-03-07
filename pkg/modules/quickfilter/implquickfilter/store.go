package implquickfilter

import (
	"context"
	"database/sql"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/quickfiltertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type store struct {
	store sqlstore.SQLStore
}

func NewStore(db sqlstore.SQLStore) quickfiltertypes.QuickFilterStore {
	return &store{store: db}
}

func (s *store) Get(ctx context.Context, orgID valuer.UUID) ([]*quickfiltertypes.StorableQuickFilter, error) {
	filters := make([]*quickfiltertypes.StorableQuickFilter, 0)

	err := s.store.
		BunDB().
		NewSelect().
		Model(&filters).
		Where("org_id = ?", orgID).
		Order("signal ASC").
		Scan(ctx)

	if err != nil {
		return filters, err
	}

	return filters, nil
}

func (s *store) GetBySignal(ctx context.Context, orgID valuer.UUID, signal string) (*quickfiltertypes.StorableQuickFilter, error) {
	filter := new(quickfiltertypes.StorableQuickFilter)

	err := s.store.
		BunDB().
		NewSelect().
		Model(filter).
		Where("org_id = ?", orgID).
		Where("signal = ?", signal).
		Scan(ctx)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, s.store.WrapNotFoundErrf(err, errors.CodeNotFound, "No rows found for org_id: "+orgID.StringValue()+" signal: "+signal)
		}
		return nil, err
	}

	return filter, nil
}

func (s *store) Upsert(ctx context.Context, filter *quickfiltertypes.StorableQuickFilter) error {
	_, err := s.store.
		BunDB().
		NewInsert().
		Model(filter).
		On("CONFLICT (id) DO UPDATE").
		Set("filter = EXCLUDED.filter").
		Set("updated_at = EXCLUDED.updated_at").
		Exec(ctx)

	if err != nil {
		return err
	}
	return nil
}

func (s *store) Create(ctx context.Context, filters []*quickfiltertypes.StorableQuickFilter) error {
	_, err := s.store.
		BunDBCtx(ctx).
		NewInsert().
		Model(&filters).
		On("CONFLICT (org_id, signal) DO NOTHING").
		Exec(ctx)

	if err != nil {
		return s.store.WrapAlreadyExistsErrf(err, errors.CodeAlreadyExists, "Quick Filter can not be created")
	}
	return nil
}
