package implservices

import (
	"context"

	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/types/servicetypes"
)

type Module struct {
	Querier querier.Querier
}

func NewModule(q querier.Querier) *Module {
	return &Module{
		Querier: q,
	}
}

// Get implements services.Module
func (m *Module) Get(ctx context.Context, orgID string, req *servicetypes.Request) ([]*servicetypes.ResponseItem, error) {
	return []*servicetypes.ResponseItem{}, nil
}
