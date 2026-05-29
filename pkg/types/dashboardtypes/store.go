package dashboardtypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type Store interface {
	Create(context.Context, *StorableDashboard) error

	CreatePublic(context.Context, *StorablePublicDashboard) error

	Get(context.Context, valuer.UUID, valuer.UUID) (*StorableDashboard, error)

	GetPublic(context.Context, string) (*StorablePublicDashboard, error)

	GetDashboardByOrgsAndPublicID(context.Context, []string, string) (*StorableDashboard, error)

	GetDashboardByPublicID(context.Context, string) (*StorableDashboard, error)

	List(context.Context, valuer.UUID) ([]*StorableDashboard, error)

	ListPublic(context.Context, valuer.UUID) ([]*StorablePublicDashboard, error)

	Update(context.Context, valuer.UUID, *StorableDashboard) error

	UpdatePublic(context.Context, *StorablePublicDashboard) error

	Delete(context.Context, valuer.UUID, valuer.UUID) error

	DeletePublic(context.Context, string) error

	RunInTx(context.Context, func(context.Context) error) error
}
