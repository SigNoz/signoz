package querybuilder

import (
	"context"
	"fmt"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// AdjustDuplicateKeys adjusts duplicate keys in the query by removing specific context and data type
// if the same key appears with different contexts or data types across SelectFields, GroupBy, and OrderBy.
// This ensures that each key is unique and generic enough to cover all its usages in the query.
func AdjustDuplicateKeys[T any](query *qbtypes.QueryBuilderQuery[T]) []string {

	// Create a map to track unique keys across SelectFields, GroupBy, and OrderBy
	globalUniqueKeysMap := map[string]telemetrytypes.TelemetryFieldKey{}

	// for recording modifications
	actions := []string{}

	// SelectFields
	for idx := range query.SelectFields {
		if existingKey, ok := globalUniqueKeysMap[query.SelectFields[idx].Name]; !ok {
			globalUniqueKeysMap[query.SelectFields[idx].Name] = query.SelectFields[idx]
		} else {
			if existingKey.FieldContext != query.SelectFields[idx].FieldContext && existingKey.FieldContext != telemetrytypes.FieldContextUnspecified {
				// remove field context in the map to make it generic
				actions = append(actions, fmt.Sprintf("Removed field context from %s for duplicate key %s", existingKey, query.SelectFields[idx]))
				existingKey.FieldContext = telemetrytypes.FieldContextUnspecified
			}
			if existingKey.FieldDataType != query.SelectFields[idx].FieldDataType && existingKey.FieldDataType != telemetrytypes.FieldDataTypeUnspecified {
				// remove field data type in the map to make it generic
				actions = append(actions, fmt.Sprintf("Removed field data type from %s for duplicate key %s", existingKey, query.SelectFields[idx]))
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
			if existingKey.FieldContext != query.GroupBy[idx].FieldContext && existingKey.FieldContext != telemetrytypes.FieldContextUnspecified {
				// remove field context in the map to make it generic
				actions = append(actions, fmt.Sprintf("Removed field context from %s for duplicate key %s", existingKey, query.GroupBy[idx].TelemetryFieldKey))
				existingKey.FieldContext = telemetrytypes.FieldContextUnspecified
			}
			if existingKey.FieldDataType != query.GroupBy[idx].FieldDataType && existingKey.FieldDataType != telemetrytypes.FieldDataTypeUnspecified {
				// remove field data type in the map to make it generic
				actions = append(actions, fmt.Sprintf("Removed field data type from %s for duplicate key %s", existingKey, query.GroupBy[idx].TelemetryFieldKey))
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
			if existingKey.FieldContext != query.Order[idx].Key.FieldContext && existingKey.FieldContext != telemetrytypes.FieldContextUnspecified {
				// remove field context in the map to make it generic
				actions = append(actions, fmt.Sprintf("Removed field context from %s for duplicate key %s", existingKey, query.Order[idx].Key.TelemetryFieldKey))
				existingKey.FieldContext = telemetrytypes.FieldContextUnspecified
			}
			if existingKey.FieldDataType != query.Order[idx].Key.FieldDataType && existingKey.FieldDataType != telemetrytypes.FieldDataTypeUnspecified {
				// remove field data type in the map to make it generic
				actions = append(actions, fmt.Sprintf("Removed field data type from %s for duplicate key %s", existingKey, query.Order[idx].Key.TelemetryFieldKey))
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
		} else {
			actions = append(actions, fmt.Sprintf("Skipped duplicate SelectField key %s", key))
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
		} else {
			actions = append(actions, fmt.Sprintf("Skipped duplicate GroupBy key %s", key))
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
		} else {
			actions = append(actions, fmt.Sprintf("Skipped duplicate OrderBy key %s", key.Key))
		}
	}
	query.Order = newOrderBy

	return actions
}

func AdjustKey(ctx context.Context, key *telemetrytypes.TelemetryFieldKey, keys map[string][]*telemetrytypes.TelemetryFieldKey, intrinsicOrCalculatedField *telemetrytypes.TelemetryFieldKey) []string {

	// for recording modifications
	actions := []string{}

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

		// We don't have a match, then it doesn't exist in attribute or resource attribute
		// use the intrinsic/calculated field
		if !match {
			// This is the case where user is using an intrinsic/calculated field
			// with a context or data type that doesn't match the intrinsic/calculated field
			// and there is no matching key in the metadata with the same name
			// So we can safely override the context and data type

			if key.String() != intrinsicOrCalculatedField.String() {
				actions = append(actions, fmt.Sprintf("Overriding key: %s to %s", key, intrinsicOrCalculatedField))
				key.FieldContext = intrinsicOrCalculatedField.FieldContext
				key.FieldDataType = intrinsicOrCalculatedField.FieldDataType
				key.JSONDataType = intrinsicOrCalculatedField.JSONDataType
				key.Indexes = intrinsicOrCalculatedField.Indexes
				key.Materialized = intrinsicOrCalculatedField.Materialized
			}

			return actions

		} else {
			// Here we have a key which is an intrinsic field but also exists in the metadata with the same name
			// We cannot prefer intrinsic field over metadata field or vice versa in this function, because we don't have any means to convey this to the user
			// Leave this upto downstream query builder to decide and throw warning if needed
			// Set materialized to false explicitly to avoid QB looking for materialized column
			key.Materialized = false
			return actions
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

		// Also consider if context is actually part of the key name
		contextPrefixedMatchingKeys := []*telemetrytypes.TelemetryFieldKey{}
		if key.FieldContext != telemetrytypes.FieldContextUnspecified {
			for _, metadataKey := range keys[key.FieldContext.StringValue()+"."+key.Name] {
				// Since we prefixed the context in the name, we only need to match data type
				if key.FieldDataType == telemetrytypes.FieldDataTypeUnspecified || key.FieldDataType == metadataKey.FieldDataType {
					contextPrefixedMatchingKeys = append(contextPrefixedMatchingKeys, metadataKey)
				}
			}
		}

		if len(matchingKeys)+len(contextPrefixedMatchingKeys) == 0 {
			// we do not have any matching keys, most likely user made a mistake, let downstream query builder handle it
			// Set materialized to false explicitly to avoid QB looking for materialized column
			key.Materialized = false
		} else if len(matchingKeys)+len(contextPrefixedMatchingKeys) == 1 {
			// only one matching key, use it
			var matchingKey *telemetrytypes.TelemetryFieldKey
			if len(matchingKeys) == 1 {
				matchingKey = matchingKeys[0]
			} else {
				matchingKey = contextPrefixedMatchingKeys[0]
			}

			if key.String() != matchingKey.String() {
				actions = append(actions, fmt.Sprintf("Adjusting key %s to %s", key, matchingKey))
			}
			key.FieldContext = matchingKey.FieldContext
			key.FieldDataType = matchingKey.FieldDataType
			key.JSONDataType = matchingKey.JSONDataType
			key.Indexes = matchingKey.Indexes
			key.Materialized = matchingKey.Materialized

			return actions
		} else {
			// multiple matching keys, set materialized only if all the keys are materialized
			materialized := true
			indexes := []telemetrytypes.JSONDataTypeIndex{}
			fieldContextsSeen := map[telemetrytypes.FieldContext]bool{}
			dataTypesSeen := map[telemetrytypes.FieldDataType]bool{}
			for _, matchingKey := range matchingKeys {
				materialized = materialized && matchingKey.Materialized
				fieldContextsSeen[matchingKey.FieldContext] = true
				dataTypesSeen[matchingKey.FieldDataType] = true
				indexes = append(indexes, matchingKey.Indexes...)
			}
			for _, matchingKey := range contextPrefixedMatchingKeys {
				materialized = materialized && matchingKey.Materialized
				fieldContextsSeen[matchingKey.FieldContext] = true
				dataTypesSeen[matchingKey.FieldDataType] = true
				indexes = append(indexes, matchingKey.Indexes...)
			}
			key.Materialized = materialized
			key.Indexes = indexes

			if len(fieldContextsSeen) == 1 {
				// all matching keys have same field context, use it
				for context := range fieldContextsSeen {
					key.FieldContext = context
					break
				}
			}

			if len(dataTypesSeen) == 1 {
				// all matching keys have same data type, use it
				for dt := range dataTypesSeen {
					key.FieldDataType = dt
					break
				}
			}
		}
	}
	return actions
}
