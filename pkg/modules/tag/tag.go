package tag

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/tagtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	// SyncTags resolves the given postable tags (creating new rows as needed)
	// and reconciles the resource's links to exactly that set, all in one transaction.
	SyncTags(ctx context.Context, orgID valuer.UUID, kind coretypes.Kind, resourceID valuer.UUID, postable []tagtypes.PostableTag) ([]*tagtypes.Tag, error)

	ListForResource(ctx context.Context, orgID valuer.UUID, kind coretypes.Kind, resourceID valuer.UUID) ([]*tagtypes.Tag, error)

	// Resources with no tags are absent from the returned map.
	ListForResources(ctx context.Context, orgID valuer.UUID, kind coretypes.Kind, resourceIDs []valuer.UUID) (map[valuer.UUID][]*tagtypes.Tag, error)
}
