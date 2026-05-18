package tagtypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Store interface {
	List(ctx context.Context, orgID valuer.UUID, kind coretypes.Kind) ([]*Tag, error)

	ListByResource(ctx context.Context, orgID valuer.UUID, kind coretypes.Kind, resourceID valuer.UUID) ([]*Tag, error)

	ListByResources(ctx context.Context, orgID valuer.UUID, kind coretypes.Kind, resourceIDs []valuer.UUID) (map[valuer.UUID][]*Tag, error)

	// CreateOrGet upserts the given tags and returns them with authoritative IDs.
	// On conflict on (org_id, kind, LOWER(key), LOWER(value)) — which
	// happens only when a concurrent insert raced ours, including casing-only
	// collisions — the returned entry carries the existing row's ID rather
	// than the pre-generated one in the input.
	CreateOrGet(ctx context.Context, tags []*Tag) ([]*Tag, error)

	// CreateRelations inserts tag-resource relations. Conflicts on the composite primary key are ignored.
	CreateRelations(ctx context.Context, relations []*TagRelation) error

	DeleteRelationsExcept(ctx context.Context, orgID valuer.UUID, kind coretypes.Kind, resourceID valuer.UUID, keepTagIDs []valuer.UUID) error

	RunInTx(ctx context.Context, cb func(ctx context.Context) error) error
}
