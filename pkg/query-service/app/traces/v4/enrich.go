package v4

import v3 "go.signoz.io/signoz/pkg/query-service/model/v3"

func enrichKeyWithMetadata(key v3.AttributeKey, keys map[string]v3.AttributeKey) v3.AttributeKey {
	// TODO(nitya) : update logic similar to logs
	if key.Type == "" || key.DataType == "" {
		// check if the key is present in the keys map
		if existingKey, ok := keys[key.Key]; ok {
			key.IsColumn = existingKey.IsColumn
			key.Type = existingKey.Type
			key.DataType = existingKey.DataType
		} else { // if not present then set the default values
			key.Type = v3.AttributeKeyTypeTag
			key.DataType = v3.AttributeKeyDataTypeString
			key.IsColumn = false
			return key
		}
	}
	return key
}

func Enrich(params *v3.QueryRangeParamsV3, keys map[string]v3.AttributeKey) {
	if params.CompositeQuery.QueryType == v3.QueryTypeBuilder {
		for _, query := range params.CompositeQuery.BuilderQueries {
			if query.DataSource == v3.DataSourceTraces {
				EnrichTracesQuery(query, keys)
			}
		}
	}
}

func EnrichTracesQuery(query *v3.BuilderQuery, keys map[string]v3.AttributeKey) {
	// enrich aggregate attribute
	query.AggregateAttribute = enrichKeyWithMetadata(query.AggregateAttribute, keys)
	// enrich filter items
	if query.Filters != nil && len(query.Filters.Items) > 0 {
		for idx, filter := range query.Filters.Items {
			query.Filters.Items[idx].Key = enrichKeyWithMetadata(filter.Key, keys)
		}
	}
	// enrich group by
	for idx, groupBy := range query.GroupBy {
		query.GroupBy[idx] = enrichKeyWithMetadata(groupBy, keys)
	}
	// enrich order by
	query.OrderBy = enrichOrderBy(query.OrderBy, keys)
	// enrich select columns
	for idx, selectColumn := range query.SelectColumns {
		query.SelectColumns[idx] = enrichKeyWithMetadata(selectColumn, keys)
	}
}
