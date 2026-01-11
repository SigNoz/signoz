package telemetrytypes

import (
	"context"

	schemamigrator "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
)

// MetadataStore is the interface for the telemetry metadata store.
type MetadataStore interface {
	// GetKeys returns a map of field keys types.TelemetryFieldKey by name, there can be multiple keys with the same name
	// if they have different types or data types.
	GetKeys(ctx context.Context, fieldKeySelector *FieldKeySelector) (map[string][]*TelemetryFieldKey, bool, error)

	// GetKeys but with any number of fieldKeySelectors.
	GetKeysMulti(ctx context.Context, fieldKeySelectors []*FieldKeySelector) (map[string][]*TelemetryFieldKey, bool, error)

	// GetKey returns a list of keys with the given name.
	GetKey(ctx context.Context, fieldKeySelector *FieldKeySelector) ([]*TelemetryFieldKey, error)

	// GetRelatedValues returns a list of related values for the given key name
	// and the existing selection of keys.
	GetRelatedValues(ctx context.Context, fieldValueSelector *FieldValueSelector) ([]string, bool, error)

	// GetAllValues returns a list of all values.
	GetAllValues(ctx context.Context, fieldValueSelector *FieldValueSelector) (*TelemetryFieldValues, bool, error)

	// FetchTemporality fetches the temporality for metric
	FetchTemporality(ctx context.Context, metricName string) (metrictypes.Temporality, error)

	// FetchTemporalityMulti fetches the temporality for multiple metrics
	FetchTemporalityMulti(ctx context.Context, metricNames ...string) (map[string]metrictypes.Temporality, error)

	// ListLogsJSONIndexes lists the JSON indexes for the logs table.
	ListLogsJSONIndexes(ctx context.Context, filters ...string) (map[string][]schemamigrator.Index, error)

	// ListPromotedPaths lists the promoted paths.
	ListPromotedPaths(ctx context.Context, paths ...string) (map[string]struct{}, error)

	// PromotePaths promotes the paths.
	PromotePaths(ctx context.Context, paths ...string) error

	// GetFirstSeenFromMetricMetadata gets the first seen timestamp for a metric metadata lookup key.
	GetFirstSeenFromMetricMetadata(ctx context.Context, lookupKeys []MetricMetadataLookupKey) (map[MetricMetadataLookupKey]int64, error)
}

type MetricMetadataLookupKey struct {
	MetricName     string
	AttributeName  string
	AttributeValue string
}
