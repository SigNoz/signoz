package tagtypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Store interface {
	List(ctx context.Context, orgID valuer.UUID, kind coretypes.Kind) ([]*Tag, error)

	ListByEntity(ctx context.Context, kind coretypes.Kind, entityID valuer.UUID) ([]*Tag, error)

	ListByEntities(ctx context.Context, kind coretypes.Kind, entityIDs []valuer.UUID) (map[valuer.UUID][]*Tag, error)

	// Create upserts the given tags and returns them with authoritative IDs.
	// On conflict on (org_id, kind, LOWER(key), LOWER(value)) — which
	// happens only when a concurrent insert raced ours, including casing-only
	// collisions — the returned entry carries the existing row's ID rather
	// than the pre-generated one in the input.
	Create(ctx context.Context, tags []*Tag) ([]*Tag, error)

	// CreateRelations inserts tag-entity relations. Conflicts on the composite primary key are ignored.
	CreateRelations(ctx context.Context, relations []*TagRelation) error

	DeleteRelationsExcept(ctx context.Context, kind coretypes.Kind, entityID valuer.UUID, keepTagIDs []valuer.UUID) error
}
