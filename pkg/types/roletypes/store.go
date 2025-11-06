package roletypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Store interface {
	Create(context.Context, *StorableRole) error
	Get(context.Context, valuer.UUID, valuer.UUID) (*StorableRole, error)
	GetMembership(context.Context, valuer.UUID) (*StorableMembership, error)
	List(context.Context, valuer.UUID) ([]*StorableRole, error)
	ListMembershipAttributes(context.Context, valuer.UUID) (map[string]*Attributes, error)
	ListUserByRole(context.Context, valuer.UUID) ([]*types.User, error)
	Update(context.Context, valuer.UUID, *StorableRole) error
	UpdateMembership(context.Context, valuer.UUID, *StorableMembership) error
	Delete(context.Context, valuer.UUID, valuer.UUID) error
	DeleteMembership(context.Context, valuer.UUID) error
	RunInTx(context.Context, func(ctx context.Context) error) error
}
