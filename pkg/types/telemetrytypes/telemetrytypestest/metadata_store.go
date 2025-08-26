package telemetrytypestest

import (
	"context"
	"strings"

	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// MockMetadataStore implements the MetadataStore interface for testing purposes
type MockMetadataStore struct {
	// Maps to store test data
	KeysMap          map[string][]*telemetrytypes.TelemetryFieldKey
	RelatedValuesMap map[string][]string
	AllValuesMap     map[string]*telemetrytypes.TelemetryFieldValues
	TemporalityMap   map[string]metrictypes.Temporality
}

// NewMockMetadataStore creates a new instance of MockMetadataStore with initialized maps
func NewMockMetadataStore() *MockMetadataStore {
	return &MockMetadataStore{
		KeysMap:          make(map[string][]*telemetrytypes.TelemetryFieldKey),
		RelatedValuesMap: make(map[string][]string),
		AllValuesMap:     make(map[string]*telemetrytypes.TelemetryFieldValues),
		TemporalityMap:   make(map[string]metrictypes.Temporality),
	}
}

// GetKeys returns a map of field keys types.TelemetryFieldKey by name
func (m *MockMetadataStore) GetKeys(ctx context.Context, fieldKeySelector *telemetrytypes.FieldKeySelector) (map[string][]*telemetrytypes.TelemetryFieldKey, bool, error) {

	result := make(map[string][]*telemetrytypes.TelemetryFieldKey)

	// If selector is nil, return all keys
	if fieldKeySelector == nil {
		return m.KeysMap, true, nil
	}

	// Apply selector logic
	for name, keys := range m.KeysMap {
		// Check if name matches
		if matchesName(fieldKeySelector, name) {
			filteredKeys := []*telemetrytypes.TelemetryFieldKey{}
			for _, key := range keys {
				if matchesKey(fieldKeySelector, key) {
					filteredKeys = append(filteredKeys, key)
				}
			}
			if len(filteredKeys) > 0 {
				result[name] = filteredKeys
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

	return result, true, nil
}

// GetKey returns a list of keys with the given name
func (m *MockMetadataStore) GetKey(ctx context.Context, fieldKeySelector *telemetrytypes.FieldKeySelector) ([]*telemetrytypes.TelemetryFieldKey, error) {
	if fieldKeySelector == nil {
		return nil, nil
	}

	result := []*telemetrytypes.TelemetryFieldKey{}

	// Find keys matching the selector
	for name, keys := range m.KeysMap {
		if matchesName(fieldKeySelector, name) {
			for _, key := range keys {
				if matchesKey(fieldKeySelector, key) {
					result = append(result, key)
				}
			}
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
func (m *MockMetadataStore) FetchTemporality(ctx context.Context, metricName string) (metrictypes.Temporality, error) {
	if temporality, exists := m.TemporalityMap[metricName]; exists {
		return temporality, nil
	}
	return metrictypes.Unknown, nil
}

// FetchTemporalityMulti fetches the temporality for multiple metrics
func (m *MockMetadataStore) FetchTemporalityMulti(ctx context.Context, metricNames ...string) (map[string]metrictypes.Temporality, error) {
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

// SetTemporality sets the temporality for a metric in the mock store
func (m *MockMetadataStore) SetTemporality(metricName string, temporality metrictypes.Temporality) {
	m.TemporalityMap[metricName] = temporality
}
