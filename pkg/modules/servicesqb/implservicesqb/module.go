package implservicesqb

import (
	"context"

	"github.com/SigNoz/signoz/pkg/modules/servicesqb"
	"github.com/SigNoz/signoz/pkg/querier"
)

type Module struct {
	Querier querier.Querier
}

func NewModule(q querier.Querier) *Module {
	return &Module{
		Querier: q,
	}
}

// Get implements servicesqb.Module (Getter). To be implemented using QBv5.
func (m *Module) Get(ctx context.Context, orgID string, req *servicesqb.Request) ([]*servicesqb.ResponseItem, error) {
	return []*servicesqb.ResponseItem{}, nil
}
