package v3

import (
	"go.signoz.io/signoz/pkg/query-service/constants"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func EnrichmentRequired(params *v3.QueryRangeParamsV3) bool {
	compositeQuery := params.CompositeQuery
	if compositeQuery == nil {
		return false
	}

	// Build queries for each builder query
	for queryName, query := range compositeQuery.BuilderQueries {
		if query.Expression != queryName && query.DataSource != v3.DataSourceLogs {
			continue
		}

		// check aggregation attribute
		if query.AggregateAttribute.Key != "" {
			if !isEnriched(query.AggregateAttribute) {
				return true
			}
		}

		// check filter attribute
		if query.Filters != nil && len(query.Filters.Items) != 0 {
			for i := 0; i < len(query.Filters.Items); i++ {
				if !isEnriched(query.Filters.Items[i].Key) {
					return true
				}
			}
		}

		groupByLookup := map[string]struct{}{}
		// check groupby
		for i := 0; i < len(query.GroupBy); i++ {
			if !isEnriched(query.GroupBy[i]) {
				return true
			}
			groupByLookup[query.GroupBy[i].Key] = struct{}{}
		}

		// check orderby
		for i := 0; i < len(query.OrderBy); i++ {
			if _, ok := groupByLookup[query.OrderBy[i].ColumnName]; !ok {
				key := v3.AttributeKey{Key: query.OrderBy[i].ColumnName}
				if !isEnriched(key) {
					return true
				}
			}
		}

	}

	return false
}

func isEnriched(field v3.AttributeKey) bool {
	if field.Type == "" || field.DataType == "" {
		return false
	}
	return true
}

// func Enrich(params *v3.QueryRangeParamsV3, fields map[string]v3.AttributeKey) {
// 	if compositeQuery != nil {

// 	}
// }

func EnrichLogsQuery(query *v3.BuilderQuery, fields map[string]v3.AttributeKey) error {
	// enrich aggregation attribute
	if query.AggregateAttribute.Key != "" {
		query.AggregateAttribute = enrichFieldWithMetadata(query.AggregateAttribute, fields)
	}

	// enrich filter attribute
	if query.Filters != nil && len(query.Filters.Items) != 0 {
		for i := 0; i < len(query.Filters.Items); i++ {
			query.Filters.Items[i].Key = enrichFieldWithMetadata(query.Filters.Items[i].Key, fields)
		}
	}

	// enrich groupby
	for i := 0; i < len(query.GroupBy); i++ {
		query.GroupBy[i] = enrichFieldWithMetadata(query.GroupBy[i], fields)
	}

	// enrich orderby
	for i := 0; i < len(query.OrderBy); i++ {
		key := v3.AttributeKey{Key: query.OrderBy[i].ColumnName}
		key = enrichFieldWithMetadata(key, fields)
		query.OrderBy[i].Key = key.Key
		query.OrderBy[i].Type = key.Type
		query.OrderBy[i].DataType = key.DataType
		query.OrderBy[i].IsColumn = key.IsColumn
	}
	return nil
}

func enrichFieldWithMetadata(field v3.AttributeKey, fields map[string]v3.AttributeKey) v3.AttributeKey {
	if field.Type == "" || field.DataType == "" {
		// if type is unknown check if it is a top level key
		if v, ok := constants.StaticFieldsLogsV3[field.Key]; ok {
			if (v3.AttributeKey{} != v) {
				return v
			}
		}

		// check if the field is present in the fields map
		if existingField, ok := fields[field.Key]; ok {
			if existingField.IsColumn {
				return field
			}
			field.Type = existingField.Type
			field.DataType = existingField.DataType
			return field
		}

		// enrich with default values if metadata is not found
		field.Type = v3.AttributeKeyTypeTag
		field.DataType = v3.AttributeKeyDataTypeString

	}
	return field
}
