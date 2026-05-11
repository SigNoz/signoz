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

	// ════════════════════════════════════════════════════════════════════════
	// v2 dashboard methods
	// ════════════════════════════════════════════════════════════════════════
	GetV2(context.Context, valuer.UUID, valuer.UUID) (*StorableDashboard, *StorablePublicDashboard, error)

	UpdateV2(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, data StorableDashboardData) error

	LockUnlockV2(ctx context.Context, orgID valuer.UUID, id valuer.UUID, locked bool, updatedBy string) error

	// bool return is hasMore — the store fetches Limit+1 to detect it.
	ListV2(ctx context.Context, orgID valuer.UUID, userID valuer.UUID, params *ListDashboardsV2Params) ([]*DashboardListRow, bool, error)

	// Returns ErrCodePinnedDashboardLimitHit when the user is at MaxPinnedDashboardsPerUser.
	PinForUser(ctx context.Context, pd *PinnedDashboard) error

	UnpinForUser(ctx context.Context, userID valuer.UUID, dashboardID valuer.UUID) error
}
