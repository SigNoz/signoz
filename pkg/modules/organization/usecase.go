package organization

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Usecase interface {
	Create(context.Context, *types.Organization) error
	Get(context.Context, valuer.UUID) (*types.Organization, error)
	GetAll(context.Context) ([]*types.Organization, error)
	Update(context.Context, *types.Organization) error
}
