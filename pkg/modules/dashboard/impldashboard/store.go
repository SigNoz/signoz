package impldashboard

import (
	"context"

	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type store struct {
	sqlstore sqlstore.SQLStore
}

func NewStore(sqlstore sqlstore.SQLStore) dashboardtypes.Store {
	return &store{sqlstore: sqlstore}
}

func (s *store) Create(context.Context, *dashboardtypes.StorableDashboard) error {
	panic("unimplemented")
}

func (s *store) Delete(context.Context, valuer.UUID, valuer.UUID) error {
	panic("unimplemented")
}

func (s *store) Get(context.Context, valuer.UUID, valuer.UUID) (*dashboardtypes.StorableDashboard, error) {
	panic("unimplemented")
}

func (s *store) GetAll(context.Context, valuer.UUID) ([]*dashboardtypes.StorableDashboard, error) {
	panic("unimplemented")
}

func (s *store) Update(context.Context, *dashboardtypes.StorableDashboard) error {
	panic("unimplemented")
}
