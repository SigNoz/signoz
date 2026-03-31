package telemetrytypestest

import (
	"context"
	"strings"

	schemamigrator "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// MockMetadataStore implements the MetadataStore interface for testing purposes
type MockMetadataStore struct {
	// Maps to store test data
	KeysMap                    map[string][]*telemetrytypes.TelemetryFieldKey
	RelatedValuesMap           map[string][]string
	AllValuesMap               map[string]*telemetrytypes.TelemetryFieldValues
	TemporalityMap             map[string]metrictypes.Temporality
	TypeMap                    map[string]metrictypes.Type
	PromotedPathsMap           map[string]bool
	LogsJSONIndexesMap         map[string][]schemamigrator.Index
	ColumnEvolutionMetadataMap map[string][]*telemetrytypes.EvolutionEntry
	LookupKeysMap              map[telemetrytypes.MetricMetadataLookupKey]int64
	// StaticFields holds signal-specific intrinsic field definitions (e.g. telemetrylogs.IntrinsicFields).
	StaticFields map[string]telemetrytypes.TelemetryFieldKey
}

// NewMockMetadataStore creates a new instance of MockMetadataStore with initialized maps.
func NewMockMetadataStore() *MockMetadataStore {
	return &MockMetadataStore{
		KeysMap:                    make(map[string][]*telemetrytypes.TelemetryFieldKey),
		RelatedValuesMap:           make(map[string][]string),
		AllValuesMap:               make(map[string]*telemetrytypes.TelemetryFieldValues),
		TemporalityMap:             make(map[string]metrictypes.Temporality),
		TypeMap:                    make(map[string]metrictypes.Type),
		PromotedPathsMap:           make(map[string]bool),
		LogsJSONIndexesMap:         make(map[string][]schemamigrator.Index),
		ColumnEvolutionMetadataMap: make(map[string][]*telemetrytypes.EvolutionEntry),
		LookupKeysMap:              make(map[telemetrytypes.MetricMetadataLookupKey]int64),
		StaticFields:               make(map[string]telemetrytypes.TelemetryFieldKey),
	}
}

// SetStaticFields sets the static fields for the mock metadata store.
// Pass the signal-specific intrinsic fields (e.g. telemetrylogs.IntrinsicFields) so the mock
// mirrors what the real metadata store does when injecting those definitions into key results.
func (m *MockMetadataStore) SetStaticFields(intrinsicFields map[string]telemetrytypes.TelemetryFieldKey) {
	m.StaticFields = intrinsicFields
}

// GetKeys returns a map of field keys types.TelemetryFieldKey by name
func (m *MockMetadataStore) GetKeys(ctx context.Context, fieldKeySelector *telemetrytypes.FieldKeySelector) (map[string][]*telemetrytypes.TelemetryFieldKey, bool, error) {
	setOfKeys := make(map[string]*telemetrytypes.TelemetryFieldKey)
	result := make(map[string][]*telemetrytypes.TelemetryFieldKey)

	// If selector is nil, return all keys
	if fieldKeySelector == nil {
		return m.KeysMap, true, nil
	}

	// Apply selector logic from KeysMap
	for name, keys := range m.KeysMap {
		if matchesName(fieldKeySelector, name) {
			for _, key := range keys {
				if matchesKey(fieldKeySelector, key) {
					if _, exists := setOfKeys[key.Text()]; !exists {
						result[name] = append(result[name], key)
						setOfKeys[key.Text()] = key
					}
				}
			}
		}
	}

	// StaticFields (e.g. IntrinsicFields), mirroring the real metadata store.
	for key, field := range m.StaticFields {
		if !matchesName(fieldKeySelector, key) {
			continue
		}

		if matchesKey(fieldKeySelector, &field) {
			if _, exists := setOfKeys[field.Text()]; !exists {
				result[field.Name] = append(result[field.Name], &field)
				setOfKeys[field.Text()] = &field
			}
		}
	}

	return result, true, nil
}

// GetKeysMulti applies multiple selectors and returns combined results
func (m *MockMetadataStore) GetKeysMulti(ctx context.Context, fieldKeySelectors []*telemetrytypes.FieldKeySelector) (map[string][]*telemetrytypes.TelemetryFieldKey, bool, error) {
	result := make(map[string][]*telemetrytypes.TelemetryFieldKey)

	// Process each selector
	for _, selector := range fieldKeySelectors {
		selectorCopy := selector // Create a copy to avoid issues with pointer semantics
		selectorResults, _, err := m.GetKeys(ctx, selectorCopy)
		if err != nil {
			return nil, false, err
		}

		// Merge results
		for name, keys := range selectorResults {
			if existingKeys, exists := result[name]; exists {
				// Merge without duplicates
				keySet := make(map[string]bool)
				for _, key := range existingKeys {
					keySet[keyIdentifier(key)] = true
				}

				for _, key := range keys {
					if !keySet[keyIdentifier(key)] {
						result[name] = append(result[name], key)
					}
				}
			} else {
				result[name] = keys
			}
		}
	}

	// fetch and add evolutions
	for _, v := range result {
		m.updateColumnEvolutionMetadataForKeys(ctx, v)
	}

	return result, true, nil
}

// GetKey returns a list of keys with the given name
func (m *MockMetadataStore) GetKey(ctx context.Context, fieldKeySelector *telemetrytypes.FieldKeySelector) ([]*telemetrytypes.TelemetryFieldKey, error) {
	if fieldKeySelector == nil {
		return nil, nil
	}

	result := []*telemetrytypes.TelemetryFieldKey{}

	// Find keys matching the selector from KeysMap
	for name, keys := range m.KeysMap {
		if matchesName(fieldKeySelector, name) {
			for _, key := range keys {
				if matchesKey(fieldKeySelector, key) {
					result = append(result, key)
				}
			}
		}
	}

	// Add matching StaticFields (e.g. IntrinsicFields), same as the real metadata store does
	for key, field := range m.StaticFields {
		if !matchesName(fieldKeySelector, key) {
			continue
		}

		if matchesKey(fieldKeySelector, &field) {
			result = append(result, &field)
		}
	}

	return result, nil
}

// GetRelatedValues returns a list of related values for the given key name and selection
func (m *MockMetadataStore) GetRelatedValues(ctx context.Context, fieldValueSelector *telemetrytypes.FieldValueSelector) ([]string, bool, error) {
	if fieldValueSelector == nil {
		return nil, true, nil
	}

	// Generate a lookup key from the selector
	lookupKey := generateLookupKey(fieldValueSelector)

	if values, exists := m.RelatedValuesMap[lookupKey]; exists {
		return values, true, nil
	}

	// Return empty slice if no values found
	return []string{}, true, nil
}

// GetAllValues returns all values for a given field
func (m *MockMetadataStore) GetAllValues(ctx context.Context, fieldValueSelector *telemetrytypes.FieldValueSelector) (*telemetrytypes.TelemetryFieldValues, bool, error) {
	if fieldValueSelector == nil {
		return &telemetrytypes.TelemetryFieldValues{}, true, nil
	}

	// Generate a lookup key from the selector
	lookupKey := generateLookupKey(fieldValueSelector)

	if values, exists := m.AllValuesMap[lookupKey]; exists {
		return values, true, nil
	}

	// Return empty values object if not found
	return &telemetrytypes.TelemetryFieldValues{}, true, nil
}

// Helper functions to avoid adding methods to structs

// matchesName checks if a field name matches the selector criteria
func matchesName(selector *telemetrytypes.FieldKeySelector, name string) bool {
	if selector == nil || selector.Name == "" {
		return true
	}

	if selector.SelectorMatchType.String == telemetrytypes.FieldSelectorMatchTypeExact.String {
		return selector.Name == name || name == selector.FieldContext.StringValue()+"."+selector.Name
	}

	// Fuzzy matching for FieldSelectorMatchTypeFuzzy
	return strings.Contains(strings.ToLower(name), strings.ToLower(selector.Name))
}

// matchesKey checks if a field key matches the selector criteria
func matchesKey(selector *telemetrytypes.FieldKeySelector, key *telemetrytypes.TelemetryFieldKey) bool {
	if selector == nil {
		return true
	}

	// Check name (already checked in matchesName, but double-check here)
	if selector.Name != "" && !matchesName(selector, key.Name) {
		return false
	}

	// Check signal
	if selector.Signal != telemetrytypes.SignalUnspecified && selector.Signal != key.Signal {
		return false
	}

	// Check field context
	// check for the context filter only for attribute and resource attribute
	if selector.FieldContext != telemetrytypes.FieldContextUnspecified &&
		(selector.FieldContext == telemetrytypes.FieldContextAttribute ||
			selector.FieldContext == telemetrytypes.FieldContextResource) &&
		selector.FieldContext != key.FieldContext {
		return false
	}

	// Check field data type
	if selector.FieldDataType != telemetrytypes.FieldDataTypeUnspecified &&
		selector.FieldDataType != key.FieldDataType {
		return false
	}

	return true
}

// keyIdentifier generates a unique identifier for the key
func keyIdentifier(key *telemetrytypes.TelemetryFieldKey) string {
	return key.Name + "-" + key.FieldContext.StringValue() + "-" + key.FieldDataType.StringValue()
}

// generateLookupKey creates a lookup key for the selector
func generateLookupKey(selector *telemetrytypes.FieldValueSelector) string {
	if selector == nil {
		return ""
	}

	parts := []string{selector.Name}

	if selector.FieldKeySelector != nil {
		if selector.FieldKeySelector.Signal != telemetrytypes.SignalUnspecified {
			parts = append(parts, selector.FieldKeySelector.Signal.StringValue())
		}

		if selector.FieldKeySelector.FieldContext != telemetrytypes.FieldContextUnspecified {
			parts = append(parts, selector.FieldKeySelector.FieldContext.StringValue())
		}

		if selector.FieldKeySelector.FieldDataType != telemetrytypes.FieldDataTypeUnspecified {
			parts = append(parts, selector.FieldKeySelector.FieldDataType.StringValue())
		}
	}

	if selector.ExistingQuery != "" {
		parts = append(parts, selector.ExistingQuery)
	}

	return strings.Join(parts, "-")
}

// SetKey adds a test key to the mock store
func (m *MockMetadataStore) SetKey(key *telemetrytypes.TelemetryFieldKey) {
	name := key.Name
	if _, exists := m.KeysMap[name]; !exists {
		m.KeysMap[name] = []*telemetrytypes.TelemetryFieldKey{}
	}
	m.KeysMap[name] = append(m.KeysMap[name], key)
}

// SetKeys adds a list of test keys to the mock store
func (m *MockMetadataStore) SetKeys(keys []*telemetrytypes.TelemetryFieldKey) {
	for _, key := range keys {
		m.SetKey(key)
	}
}

// SetRelatedValues sets related values for testing
func (m *MockMetadataStore) SetRelatedValues(lookupKey string, values []string) {
	m.RelatedValuesMap[lookupKey] = values
}

// SetAllValues sets all values for testing
func (m *MockMetadataStore) SetAllValues(lookupKey string, values *telemetrytypes.TelemetryFieldValues) {
	m.AllValuesMap[lookupKey] = values
}

// FetchTemporality fetches the temporality for a metric
func (m *MockMetadataStore) FetchTemporality(ctx context.Context, queryTimeRangeStartTs, queryTimeRangeEndTs uint64, metricName string) (metrictypes.Temporality, error) {
	if temporality, exists := m.TemporalityMap[metricName]; exists {
		return temporality, nil
	}
	return metrictypes.Unknown, nil
}

// FetchTemporalityMulti fetches the temporality for multiple metrics
func (m *MockMetadataStore) FetchTemporalityMulti(ctx context.Context, queryTimeRangeStartTs, queryTimeRangeEndTs uint64, metricNames ...string) (map[string]metrictypes.Temporality, error) {
	result := make(map[string]metrictypes.Temporality)

	for _, metricName := range metricNames {
		if temporality, exists := m.TemporalityMap[metricName]; exists {
			result[metricName] = temporality
		} else {
			result[metricName] = metrictypes.Unknown
		}
	}

	return result, nil
}

// FetchTemporalityMulti fetches the temporality for multiple metrics
func (m *MockMetadataStore) FetchTemporalityAndTypeMulti(ctx context.Context, queryTimeRangeStartTs, queryTimeRangeEndTs uint64, metricNames ...string) (map[string]metrictypes.Temporality, map[string]metrictypes.Type, error) {
	temporalities := make(map[string]metrictypes.Temporality)
	types := make(map[string]metrictypes.Type)

	for _, metricName := range metricNames {
		if temporality, exists := m.TemporalityMap[metricName]; exists {
			temporalities[metricName] = temporality
		} else {
			temporalities[metricName] = metrictypes.Unknown
		}
		if metricType, exists := m.TypeMap[metricName]; exists {
			types[metricName] = metricType
		} else {
			types[metricName] = metrictypes.UnspecifiedType
		}
	}

	return temporalities, types, nil
}

// SetTemporality sets the temporality for a metric in the mock store
func (m *MockMetadataStore) SetTemporality(metricName string, temporality metrictypes.Temporality) {
	m.TemporalityMap[metricName] = temporality
}

// PromotePaths promotes the paths.
func (m *MockMetadataStore) PromotePaths(ctx context.Context, paths ...string) error {
	for _, path := range paths {
		m.PromotedPathsMap[path] = true
	}
	return nil
}

// GetPromotedPaths returns the promoted paths.
func (m *MockMetadataStore) GetPromotedPaths(ctx context.Context, paths ...string) (map[string]bool, error) {
	return m.PromotedPathsMap, nil
}

// ListLogsJSONIndexes lists the JSON indexes for the logs table.
func (m *MockMetadataStore) ListLogsJSONIndexes(ctx context.Context, filters ...string) (map[string][]schemamigrator.Index, error) {
	return m.LogsJSONIndexesMap, nil
}

func (m *MockMetadataStore) updateColumnEvolutionMetadataForKeys(_ context.Context, keysToUpdate []*telemetrytypes.TelemetryFieldKey) map[string][]*telemetrytypes.EvolutionEntry {

	var metadataKeySelectors []*telemetrytypes.EvolutionSelector
	for _, keySelector := range keysToUpdate {
		selector := &telemetrytypes.EvolutionSelector{
			Signal:       keySelector.Signal,
			FieldContext: keySelector.FieldContext,
			FieldName:    keySelector.Name,
		}
		metadataKeySelectors = append(metadataKeySelectors, selector)
	}
	result := make(map[string][]*telemetrytypes.EvolutionEntry)
	for i, selector := range metadataKeySelectors {
		sel := &telemetrytypes.EvolutionSelector{
			Signal:       selector.Signal,
			FieldContext: selector.FieldContext,
			FieldName:    "__all__",
		}
		key := sel.QualifiedName()
		if entries, exists := m.ColumnEvolutionMetadataMap[key]; exists {
			result[key] = entries
		}
		sel.FieldName = metadataKeySelectors[i].FieldName
		key = sel.QualifiedName()
		if entries, exists := m.ColumnEvolutionMetadataMap[key]; exists {
			result[key] = entries
		}
	}
	return result
}

func (m *MockMetadataStore) GetFirstSeenFromMetricMetadata(ctx context.Context, lookupKeys []telemetrytypes.MetricMetadataLookupKey) (map[telemetrytypes.MetricMetadataLookupKey]int64, error) {
	return m.LookupKeysMap, nil
}

func (m *MockMetadataStore) SetFirstSeenFromMetricMetadata(firstSeenMap map[telemetrytypes.MetricMetadataLookupKey]int64) {
	for key, value := range firstSeenMap {
		m.LookupKeysMap[key] = value
	}
}

func (m *MockMetadataStore) FetchLastSeenInfoMulti(ctx context.Context, metricNames ...string) (map[string]int64, error) {
	return make(map[string]int64), nil
}
