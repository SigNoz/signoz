package telemetrytypes

import (
	"context"
)

// MetadataStore is the interface for the telemetry metadata store.
type MetadataStore interface {
	// GetKeys returns a map of field keys types.TelemetryFieldKey by name, there can be multiple keys with the same name
	// if they have different types or data types.
	GetKeys(ctx context.Context, fieldKeySelector *FieldKeySelector) (map[string][]*TelemetryFieldKey, error)

	// GetKeys but with any number of fieldKeySelectors.
	GetKeysMulti(ctx context.Context, fieldKeySelectors []*FieldKeySelector) (map[string][]*TelemetryFieldKey, error)

	// GetKey returns a list of keys with the given name.
	GetKey(ctx context.Context, fieldKeySelector *FieldKeySelector) ([]*TelemetryFieldKey, error)

	// GetRelatedValues returns a list of related values for the given key name
	// and the existing selection of keys.
	GetRelatedValues(ctx context.Context, fieldValueSelector *FieldValueSelector) ([]string, error)

	// GetAllValues returns a list of all values.
	GetAllValues(ctx context.Context, fieldValueSelector *FieldValueSelector) (*TelemetryFieldValues, error)
}
