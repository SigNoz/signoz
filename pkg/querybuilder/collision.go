package querybuilder

import (
	"context"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// AdjustDuplicateKeys adjusts duplicate keys in the query by removing specific context and data type
// if the same key appears with different contexts or data types across SelectFields, GroupBy, and OrderBy.
// This ensures that each key is unique and generic enough to cover all its usages in the query.
func AdjustDuplicateKeys[T any](query *qbtypes.QueryBuilderQuery[T]) {

	// Create a map to track unique keys across SelectFields, GroupBy, and OrderBy
	globalUniqueKeysMap := map[string]telemetrytypes.TelemetryFieldKey{}

	// SelectFields
	for idx := range query.SelectFields {
		if existingKey, ok := globalUniqueKeysMap[query.SelectFields[idx].Name]; !ok {
			globalUniqueKeysMap[query.SelectFields[idx].Name] = query.SelectFields[idx]
		} else {
			if existingKey.FieldContext != query.SelectFields[idx].FieldContext {
				// remove field context in the map to make it generic
				existingKey.FieldContext = telemetrytypes.FieldContextUnspecified
			}
			if existingKey.FieldDataType != query.SelectFields[idx].FieldDataType {
				// remove field data type in the map to make it generic
				existingKey.FieldDataType = telemetrytypes.FieldDataTypeUnspecified
			}
			// Update the map with the modified key
			globalUniqueKeysMap[query.SelectFields[idx].Name] = existingKey
		}
	}

	// GroupBy
	for idx := range query.GroupBy {
		if existingKey, ok := globalUniqueKeysMap[query.GroupBy[idx].Name]; !ok {
			globalUniqueKeysMap[query.GroupBy[idx].Name] = query.GroupBy[idx].TelemetryFieldKey
		} else {
			if existingKey.FieldContext != query.GroupBy[idx].FieldContext {
				// remove field context in the map to make it generic
				existingKey.FieldContext = telemetrytypes.FieldContextUnspecified
			}
			if existingKey.FieldDataType != query.GroupBy[idx].FieldDataType {
				// remove field data type in the map to make it generic
				existingKey.FieldDataType = telemetrytypes.FieldDataTypeUnspecified
			}
			// Update the map with the modified key
			globalUniqueKeysMap[query.GroupBy[idx].Name] = existingKey
		}
	}

	// OrderBy
	for idx := range query.Order {
		if existingKey, ok := globalUniqueKeysMap[query.Order[idx].Key.Name]; !ok {
			globalUniqueKeysMap[query.Order[idx].Key.Name] = query.Order[idx].Key.TelemetryFieldKey
		} else {
			if existingKey.FieldContext != query.Order[idx].Key.FieldContext {
				// remove field context in the map to make it generic
				existingKey.FieldContext = telemetrytypes.FieldContextUnspecified
			}
			if existingKey.FieldDataType != query.Order[idx].Key.FieldDataType {
				// remove field data type in the map to make it generic
				existingKey.FieldDataType = telemetrytypes.FieldDataTypeUnspecified
			}
			// Update the map with the modified key
			globalUniqueKeysMap[query.Order[idx].Key.Name] = existingKey
		}
	}

	// Reconstruct SelectFields slice

	newSelectFields := make([]telemetrytypes.TelemetryFieldKey, 0, len(query.SelectFields))

	seen := map[string]bool{}
	for _, key := range query.SelectFields {
		if !seen[key.Name] {
			newSelectFields = append(newSelectFields, globalUniqueKeysMap[key.Name])
			seen[key.Name] = true
		}
	}
	query.SelectFields = newSelectFields

	// Reconstruct GroupBy slice
	newGroupBy := make([]qbtypes.GroupByKey, 0, len(query.GroupBy))
	seen = map[string]bool{}
	for _, key := range query.GroupBy {
		if !seen[key.Name] {
			newGroupBy = append(newGroupBy, qbtypes.GroupByKey{TelemetryFieldKey: globalUniqueKeysMap[key.Name]})
			seen[key.Name] = true
		}
	}
	query.GroupBy = newGroupBy

	// Reconstruct OrderBy slice
	// NOTE: 1 Edge case here is that if there are two order by on same key with different directions,
	// we will only keep one of them (the first one encountered). This is acceptable as such queries
	// don't make much sense.
	newOrderBy := make([]qbtypes.OrderBy, 0, len(query.Order))
	seen = map[string]bool{}
	for _, key := range query.Order {
		if !seen[key.Key.Name] {
			newOrderBy = append(newOrderBy, qbtypes.OrderBy{Key: qbtypes.OrderByKey{TelemetryFieldKey: globalUniqueKeysMap[key.Key.Name]}, Direction: key.Direction})
			seen[key.Key.Name] = true
		}
	}
	query.Order = newOrderBy

}

func AdjustKey(ctx context.Context, key *telemetrytypes.TelemetryFieldKey, keys map[string][]*telemetrytypes.TelemetryFieldKey, intrinsicOrCalculatedField *telemetrytypes.TelemetryFieldKey) {

	if intrinsicOrCalculatedField != nil {
		/*
			Check if it also matches with any of the metadata keys

			For example, lets consider trace_id exists in attributes and is also an intrinsic field

			Now if user is using trace_id, we don't know if they mean intrinsic field or attribute.trace_id
			So we cannot take a call here (we'll leave this upto query builder to decide).

			However, if user is using attribute.trace_id, we can safely assume they mean attribute field
			and not intrinsic field.
			Similarly, if user is using trace_id with a field context or data type that doesn't match
			the intrinsic field, and there is no matching key in the metadata with the same name,
			we can safely assume they mean the intrinsic field and override the context and data type.

		*/

		// Check if there is any matching key in the metadata with the same name
		match := false
		for _, mapKey := range keys[key.Name] {
			// Either field context is unspecified or matches
			// and
			// Either field data type is unspecified or matches
			if (key.FieldContext == telemetrytypes.FieldContextUnspecified || mapKey.FieldContext == key.FieldContext) &&
				(key.FieldDataType == telemetrytypes.FieldDataTypeUnspecified || mapKey.FieldDataType == key.FieldDataType) {
				match = true
				break
			}
		}

		// NOTE: if a user is highly opinionated and use attribute.duration_nano:string
		// It will be defaulted to intrinsic field duration_nano as the actual attribute might be attribute.duration_nano:number

		// We don't have a match, then it's doesn't exist in attribute or resource attribute
		// use the intrinsic/calculated field
		if !match {
			// This is the case where user is using an intrinsic/calculated field
			// with a context or data type that doesn't match the intrinsic/calculated field
			// and there is no matching key in the metadata with the same name
			// So we can safely override the context and data type
			key.FieldContext = intrinsicOrCalculatedField.FieldContext
			key.FieldDataType = intrinsicOrCalculatedField.FieldDataType
			key.Materialized = intrinsicOrCalculatedField.Materialized

		} else {
			// Here we have a key which is an intrinsic field but also exists in the metadata with the same name
			// We cannot prefer intrinsic field over metadata field or vice versa, because we don't have any means to convey this to the user
			// Leave this upto downstream query builder to decide and throw warning if needed
			// Set materialized to false explicitly to avoid QB looking for materialized column
			key.Materialized = false
		}

	} else {
		// check if all the keys for the given field with matching context and data type
		matchingKeys := []*telemetrytypes.TelemetryFieldKey{}
		for _, metadataKey := range keys[key.Name] {
			// Only consider keys that match the context and data type (if specified)
			if (key.FieldContext == telemetrytypes.FieldContextUnspecified || key.FieldContext == metadataKey.FieldContext) &&
				(key.FieldDataType == telemetrytypes.FieldDataTypeUnspecified || key.FieldDataType == metadataKey.FieldDataType) {
				matchingKeys = append(matchingKeys, metadataKey)
			}
		}

		if len(matchingKeys) == 0 {
			// we do not have any matching keys, most likely user made a mistake, let downstream query builder handle it
			// Set materialized to false explicitly to avoid QB looking for materialized column
			key.Materialized = false
		} else if len(matchingKeys) == 1 {
			// only one matching key, use it
			key.FieldContext = matchingKeys[0].FieldContext
			key.FieldDataType = matchingKeys[0].FieldDataType
			key.Materialized = matchingKeys[0].Materialized
		} else {
			// multiple matching keys, set materialized only if all the keys are materialized
			materialized := true
			fieldContextsSeen := map[telemetrytypes.FieldContext]bool{}
			dataTypesSeen := map[telemetrytypes.FieldDataType]bool{}
			for _, matchingKey := range matchingKeys {
				materialized = materialized && matchingKey.Materialized
				fieldContextsSeen[matchingKey.FieldContext] = true
				dataTypesSeen[matchingKey.FieldDataType] = true
			}
			key.Materialized = materialized

			if len(fieldContextsSeen) == 1 {
				// all matching keys have same field context, use it
				key.FieldContext = matchingKeys[0].FieldContext
			}

			if len(dataTypesSeen) == 1 {
				// all matching keys have same data type, use it
				key.FieldDataType = matchingKeys[0].FieldDataType
			}
		}
	}
}
