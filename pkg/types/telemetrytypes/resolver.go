package telemetrytypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// FieldKeyResolver resolves keys and values for one source within a signal.
// Implementations never dispatch; a MetadataStore owns the routing, registers
// them by Source and merges what they return. Keys come back flat rather than
// grouped by name because the store does the grouping across sources.
type FieldKeyResolver interface {
	GetKeys(ctx context.Context, fieldKeySelectors []*FieldKeySelector) ([]*TelemetryFieldKey, bool, error)

	GetAllValues(ctx context.Context, fieldValueSelector *FieldValueSelector) (*TelemetryFieldValues, bool, error)
}

// MetricMetadata covers the lookups that only apply to the metrics signal.
type MetricMetadata interface {
	// FetchTemporality fetches the temporality for metric
	FetchTemporality(ctx context.Context, orgID valuer.UUID, queryTimeRangeStartTs, queryTimeRangeEndTs uint64, metricName string) (metrictypes.Temporality, error)

	// FetchTemporalityMulti fetches the temporality for multiple metrics
	FetchTemporalityMulti(ctx context.Context, orgID valuer.UUID, queryTimeRangeStartTs, queryTimeRangeEndTs uint64, metricNames ...string) (map[string]metrictypes.Temporality, error)

	FetchTemporalityAndTypeMulti(ctx context.Context, orgID valuer.UUID, queryTimeRangeStartTs, queryTimeRangeEndTs uint64, metricNames ...string) (map[string]metrictypes.Temporality, map[string]metrictypes.Type, map[string]bool, error)

	// GetFirstSeenFromMetricMetadata gets the first seen timestamp for a metric metadata lookup key.
	GetFirstSeenFromMetricMetadata(ctx context.Context, lookupKeys []MetricMetadataLookupKey) (map[MetricMetadataLookupKey]int64, error)

	FetchLastSeenInfoMulti(ctx context.Context, orgID valuer.UUID, metricNames ...string) (map[string]int64, error)
}

// LogsMetadata covers the JSON column evolution lookups, which today only the
// logs signal materialises.
type LogsMetadata interface {
	// ListJSONIndexes lists the per-path JSON skip indexes of the given source.
	ListJSONIndexes(ctx context.Context, lookup JSONIndexLookup, filters ...string) ([]TelemetryFieldKeySkipIndex, error)

	// GetPromotedPaths lists the promoted paths recorded in the column
	// evolution table for the entry's signal, column and field context.
	GetPromotedPaths(ctx context.Context, entry EvolutionEntry, paths ...string) (map[string]bool, error)

	// PromotePaths records promoted paths in the column evolution table as
	// rows templated by entry; FieldName and ReleaseTime are set per path.
	PromotePaths(ctx context.Context, entry EvolutionEntry, paths ...string) error
}
