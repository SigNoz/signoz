package spantypes

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type SpanMapperStore interface {
	// Group operations
	ListGroups(ctx context.Context, orgID valuer.UUID, q *ListSpanMapperGroupsQuery) ([]*SpanMapperGroup, error)
	GetGroup(ctx context.Context, orgID, id valuer.UUID) (*SpanMapperGroup, error)
	CreateGroup(ctx context.Context, group *SpanMapperGroup) error
	UpdateGroup(ctx context.Context, group *SpanMapperGroup) error
	DeleteGroup(ctx context.Context, orgID, id valuer.UUID) error

	// Mapper operations
	ListMappers(ctx context.Context, orgID, groupID valuer.UUID) ([]*SpanMapper, error)
	GetMapper(ctx context.Context, orgID, groupID, id valuer.UUID) (*SpanMapper, error)
	CreateMapper(ctx context.Context, mapper *SpanMapper) error
	UpdateMapper(ctx context.Context, mapper *SpanMapper) error
	DeleteMapper(ctx context.Context, orgID, groupID, id valuer.UUID) error
}

// TraceStore defines the data access interface for trace detail queries.
type TraceStore interface {
	GetTraceSummary(ctx context.Context, traceID string) (*TraceSummary, error)
	GetTraceSpans(ctx context.Context, traceID string, summary *TraceSummary) ([]StorableSpan, error)
	GetMinimalSpans(ctx context.Context, traceID string, start, end time.Time) ([]MinimalSpan, error)
	GetTraceSpansByIDs(ctx context.Context, traceID string, start, end time.Time, spanIDs []string) ([]StorableSpan, error)
}
