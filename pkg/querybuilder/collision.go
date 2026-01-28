package querybuilder

import (
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
	for _, key := range query.SelectFields {
		deduplicateKeys(key, globalUniqueKeysMap, &actions)
	}

	// GroupBy
	for _, key := range query.GroupBy {
		deduplicateKeys(key.TelemetryFieldKey, globalUniqueKeysMap, &actions)
	}

	// OrderBy
	for _, key := range query.Order {
		deduplicateKeys(key.Key.TelemetryFieldKey, globalUniqueKeysMap, &actions)
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

func deduplicateKeys(key telemetrytypes.TelemetryFieldKey, keysMap map[string]telemetrytypes.TelemetryFieldKey, actions *[]string) {
	if existingKey, ok := keysMap[key.Name]; !ok {
		keysMap[key.Name] = key
	} else {
		if existingKey.FieldContext != key.FieldContext && existingKey.FieldContext != telemetrytypes.FieldContextUnspecified {
			// remove field context in the map to make it generic
			*actions = append(*actions, fmt.Sprintf("Removed field context from %s for duplicate key %s", existingKey, key))
			existingKey.FieldContext = telemetrytypes.FieldContextUnspecified
		}
		if existingKey.FieldDataType != key.FieldDataType && existingKey.FieldDataType != telemetrytypes.FieldDataTypeUnspecified {
			// remove field data type in the map to make it generic
			*actions = append(*actions, fmt.Sprintf("Removed field data type from %s for duplicate key %s", existingKey, key))
			existingKey.FieldDataType = telemetrytypes.FieldDataTypeUnspecified
		}
		// Update the map with the modified key
		keysMap[key.Name] = existingKey
	}
}

func AdjustKey(key *telemetrytypes.TelemetryFieldKey, keys map[string][]*telemetrytypes.TelemetryFieldKey, intrinsicOrCalculatedField *telemetrytypes.TelemetryFieldKey) []string {

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

		// Check if there is any matching key in the metadata with the same name and it is not the same intrinsic/calculated field
		match := false
		for _, mapKey := range keys[key.Name] {
			// Either field context is unspecified or matches
			// and
			// Either field data type is unspecified or matches
			if (key.FieldContext == telemetrytypes.FieldContextUnspecified || mapKey.FieldContext == key.FieldContext) &&
				(key.FieldDataType == telemetrytypes.FieldDataTypeUnspecified || mapKey.FieldDataType == key.FieldDataType) &&
				!mapKey.Equal(intrinsicOrCalculatedField) {
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
			// with a context or data type that may or may not match the intrinsic/calculated field
			// and there is no matching key in the metadata with the same name
			// So we can safely override the context and data type

			actions = append(actions, fmt.Sprintf("Overriding key: %s to %s", key, intrinsicOrCalculatedField))
			key.FieldContext = intrinsicOrCalculatedField.FieldContext
			key.FieldDataType = intrinsicOrCalculatedField.FieldDataType
			key.JSONDataType = intrinsicOrCalculatedField.JSONDataType
			key.Indexes = intrinsicOrCalculatedField.Indexes
			key.Materialized = intrinsicOrCalculatedField.Materialized
			key.JSONPlan = intrinsicOrCalculatedField.JSONPlan
			return actions

		}
	}

	// This means that the key provided by the user cannot be overridden to a single field because of ambiguity
	// So we need to look into metadata keys to find the best match

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

		if !key.Equal(matchingKey) {
			actions = append(actions, fmt.Sprintf("Adjusting key %s to %s", key, matchingKey))
		}
		key.Name = matchingKey.Name
		key.FieldContext = matchingKey.FieldContext
		key.FieldDataType = matchingKey.FieldDataType
		key.JSONDataType = matchingKey.JSONDataType
		key.Indexes = matchingKey.Indexes
		key.Materialized = matchingKey.Materialized
		key.JSONPlan = matchingKey.JSONPlan
		
		return actions
	} else {
		// multiple matching keys, set materialized only if all the keys are materialized
		// TODO: This could all be redundant if it is not, it should be.
		// Downstream query builder should handle multiple matching keys with their own metadata
		// and not rely on this function to do so.
		materialized := true
		indexes := []telemetrytypes.JSONDataTypeIndex{}
		fieldContextsSeen := map[telemetrytypes.FieldContext]bool{}
		dataTypesSeen := map[telemetrytypes.FieldDataType]bool{}
		jsonTypesSeen := map[string]*telemetrytypes.JSONDataType{}
		for _, matchingKey := range matchingKeys {
			materialized = materialized && matchingKey.Materialized
			fieldContextsSeen[matchingKey.FieldContext] = true
			dataTypesSeen[matchingKey.FieldDataType] = true
			if matchingKey.JSONDataType != nil {
				jsonTypesSeen[matchingKey.JSONDataType.StringValue()] = matchingKey.JSONDataType
			}
			indexes = append(indexes, matchingKey.Indexes...)
		}
		for _, matchingKey := range contextPrefixedMatchingKeys {
			materialized = materialized && matchingKey.Materialized
			fieldContextsSeen[matchingKey.FieldContext] = true
			dataTypesSeen[matchingKey.FieldDataType] = true
			if matchingKey.JSONDataType != nil {
				jsonTypesSeen[matchingKey.JSONDataType.StringValue()] = matchingKey.JSONDataType
			}
			indexes = append(indexes, matchingKey.Indexes...)
		}
		key.Materialized = materialized
		if len(indexes) > 0 {
			key.Indexes = indexes
		}

		if len(fieldContextsSeen) == 1 && key.FieldContext == telemetrytypes.FieldContextUnspecified {
			// all matching keys have same field context, use it
			for context := range fieldContextsSeen {
				actions = append(actions, fmt.Sprintf("Adjusting key %s to have field context %s", key, context.StringValue()))
				key.FieldContext = context
				break
			}
		}

		if len(dataTypesSeen) == 1 && key.FieldDataType == telemetrytypes.FieldDataTypeUnspecified {
			// all matching keys have same data type, use it
			for dt := range dataTypesSeen {
				actions = append(actions, fmt.Sprintf("Adjusting key %s to have data type %s", key, dt.StringValue()))
				key.FieldDataType = dt
				break
			}
		}

		if len(jsonTypesSeen) == 1 && key.JSONDataType == nil {
			// all matching keys have same JSON data type, use it
			for _, jt := range jsonTypesSeen {
				actions = append(actions, fmt.Sprintf("Adjusting key %s to have JSON data type %s", key, jt.StringValue()))
				key.JSONDataType = jt
				break
			}
		}
	}

	return actions
}

func AdjustKeysForAliasExpressions[T any](query *qbtypes.QueryBuilderQuery[T], requestType qbtypes.RequestType) []string {
	/*
		For example, if user is using `body.count` as an alias for aggregation and
		Uses it in orderBy, upstream code will convert it to just `count` with fieldContext as Body
		But we need to adjust it back to `body.count` with fieldContext as unspecified
	*/
	actions := []string{}
	if requestType != qbtypes.RequestTypeRaw && requestType != qbtypes.RequestTypeRawStream {
		aliasExpressions := map[string]bool{}
		for _, agg := range query.Aggregations {
			switch v := any(agg).(type) {
			case qbtypes.LogAggregation:
				if v.Alias != "" {
					aliasExpressions[v.Alias] = true
				}
			case qbtypes.TraceAggregation:
				if v.Alias != "" {
					aliasExpressions[v.Alias] = true
				}
			default:
				continue
			}
		}
		if len(aliasExpressions) > 0 {
			for idx := range query.Order {
				contextPrefixedKeyName := fmt.Sprintf("%s.%s", query.Order[idx].Key.FieldContext.StringValue(), query.Order[idx].Key.Name)
				if aliasExpressions[contextPrefixedKeyName] {
					actions = append(actions, fmt.Sprintf("Adjusting OrderBy key %s to %s", query.Order[idx].Key, contextPrefixedKeyName))
					query.Order[idx].Key.FieldContext = telemetrytypes.FieldContextUnspecified
					query.Order[idx].Key.Name = contextPrefixedKeyName
				}
			}
		}
	}
	return actions
}
