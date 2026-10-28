package telemetrytypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/valuer"
)

// MetadataStore is the interface for the telemetry metadata store. The key and
// value lookups route to a per-signal FieldKeyResolver; the embedded interfaces
// are signal-scoped and pass straight through.
type MetadataStore interface {
	// GetKeys returns a map of field keys types.TelemetryFieldKey by name, there can be multiple keys with the same name
	// if they have different types or data types.
	GetKeys(ctx context.Context, orgID valuer.UUID, fieldKeySelector *FieldKeySelector) (map[string][]*TelemetryFieldKey, bool, error)

	// GetKeys but with any number of fieldKeySelectors.
	GetKeysMulti(ctx context.Context, orgID valuer.UUID, fieldKeySelectors []*FieldKeySelector) (map[string][]*TelemetryFieldKey, bool, error)

	// GetKey returns a list of keys with the given name.
	GetKey(ctx context.Context, orgID valuer.UUID, fieldKeySelector *FieldKeySelector) ([]*TelemetryFieldKey, error)

	// GetRelatedValues returns a list of related values for the given key name
	// and the existing selection of keys.
	GetRelatedValues(ctx context.Context, orgID valuer.UUID, fieldValueSelector *FieldValueSelector) ([]string, bool, error)

	// GetAllValues returns a list of all values.
	GetAllValues(ctx context.Context, orgID valuer.UUID, fieldValueSelector *FieldValueSelector) (*TelemetryFieldValues, bool, error)

	// GetMaterializedKeys lists the keys materialized as dedicated columns.
	GetMaterializedKeys(ctx context.Context, signal Signal) ([]*TelemetryFieldKey, error)

	MetricMetadata

	LogsMetadata
}

type MetricMetadataLookupKey struct {
	MetricName     string
	AttributeName  string
	AttributeValue string
}
