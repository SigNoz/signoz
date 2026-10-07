package spantypes

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type SpanMapperStore interface {
	// RunInTx runs cb in one transaction; every store call made with the
	// callback's ctx joins it.
	RunInTx(ctx context.Context, cb func(ctx context.Context) error) error

	// Group operations
	ListGroups(ctx context.Context, orgID valuer.UUID, q *ListSpanMapperGroupsQuery) ([]*SpanMapperGroup, error)
	GetGroup(ctx context.Context, orgID, id valuer.UUID) (*SpanMapperGroup, error)
	GetGroupByName(ctx context.Context, orgID valuer.UUID, name string) (*SpanMapperGroup, error)
	CreateGroup(ctx context.Context, group *SpanMapperGroup) error
	UpdateGroup(ctx context.Context, group *SpanMapperGroup) error
	DeleteGroup(ctx context.Context, orgID, id valuer.UUID) error

	// Mapper operations
	ListMappers(ctx context.Context, orgID, groupID valuer.UUID) ([]*SpanMapper, error)
	GetMapper(ctx context.Context, orgID, groupID, id valuer.UUID) (*SpanMapper, error)
	CreateMapper(ctx context.Context, mapper *SpanMapper) error
	UpdateMapper(ctx context.Context, mapper *SpanMapper) error
	DeleteMapper(ctx context.Context, orgID, groupID, id valuer.UUID, origin SpanMapperOrigin) error
}

// TraceStore defines the data access interface for trace detail queries.
type TraceStore interface {
	GetTraceBounds(ctx context.Context, traceID string) (*TraceBounds, error)
	GetTraceStats(ctx context.Context, orgID valuer.UUID, traceID string, bounds *TraceBounds) (*TraceStats, error)
	GetTraceSpans(ctx context.Context, traceID string, bounds *TraceBounds) ([]StorableSpan, error)
	GetMinimalSpans(ctx context.Context, traceID string, start, end time.Time) ([]MinimalSpan, error)
	GetTraceSpansByIDs(ctx context.Context, traceID string, start, end time.Time, spanIDs []string) ([]StorableSpan, error)
	GetFlamegraphSpans(ctx context.Context, traceID string, start, end time.Time, spanIDs []string) ([]StorableSpan, error)
	GetThreadSpans(ctx context.Context, orgID valuer.UUID, traceID string, bounds *TraceBounds, page ThreadPage) ([]StorableSpan, error)
	GetThreadCursor(ctx context.Context, traceID string, bounds *TraceBounds, spanID string) (*ThreadCursor, error)

	GetSpanCountByField(ctx context.Context, traceID string, bounds *TraceBounds, fieldKey telemetrytypes.TelemetryFieldKey) (map[string]uint64, error)
	GetSpanDurationByField(ctx context.Context, traceID string, bounds *TraceBounds, fieldKey telemetrytypes.TelemetryFieldKey) (map[string]uint64, error)
}
