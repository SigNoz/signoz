package implservices

import (
	"context"

	"github.com/SigNoz/signoz/pkg/modules/services"
	"github.com/SigNoz/signoz/pkg/querier"
)

type Module struct {
	Querier querier.Querier
}

func NewModule(q querier.Querier) *Module {
	return &Module{Querier: q}
}

// Get implements services.Module
func (m *Module) Get(ctx context.Context, orgID string, req *services.Request) ([]*services.ResponseItem, error) {
	return []*services.ResponseItem{}, nil
}
