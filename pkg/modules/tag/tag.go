package tag

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/tagtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	// SyncTags resolves the given postable tags (creating new rows as needed)
	// and reconciles the entity's links to exactly that set, all in one transaction.
	SyncTags(ctx context.Context, orgID valuer.UUID, kind coretypes.Kind, entityID valuer.UUID, postable []tagtypes.PostableTag, createdBy string) ([]*tagtypes.Tag, error)

	// Does not link the resolved tags to any entity — call LinkToEntity for that.
	CreateMany(ctx context.Context, orgID valuer.UUID, kind coretypes.Kind, postable []tagtypes.PostableTag, createdBy string) ([]*tagtypes.Tag, error)

	// Existing rows are left untouched.
	LinkToEntity(ctx context.Context, kind coretypes.Kind, entityID valuer.UUID, tagIDs []valuer.UUID) error

	// missing links are inserted, obsolete ones removed.
	SyncLinksForEntity(ctx context.Context, kind coretypes.Kind, entityID valuer.UUID, tagIDs []valuer.UUID) error

	ListForEntity(ctx context.Context, kind coretypes.Kind, entityID valuer.UUID) ([]*tagtypes.Tag, error)

	// Entities with no tags are absent from the returned map.
	ListForEntities(ctx context.Context, kind coretypes.Kind, entityIDs []valuer.UUID) (map[valuer.UUID][]*tagtypes.Tag, error)
}
