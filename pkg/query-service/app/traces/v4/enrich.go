package v4

import (
	"go.signoz.io/signoz/pkg/query-service/constants"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils"
)

func isEnriched(field v3.AttributeKey) bool {
	// if it is timestamp/id dont check
	if field.Key == "timestamp" || field.Key == "id" || field.Key == constants.SigNozOrderByValue {
		return true
	}

	// don't need to enrich the static fields as they will be always used a column
	if _, ok := constants.StaticFieldsTraces[field.Key]; ok && field.IsColumn {
		return true
	}

	return false
}

func enrichKeyWithMetadata(key v3.AttributeKey, keys map[string]v3.AttributeKey) v3.AttributeKey {
	if isEnriched(key) {
		return key
	}

	if v, ok := constants.StaticFieldsTraces[key.Key]; ok {
		return v
	}

	for _, key := range utils.GenerateEnrichmentKeys(key) {
		if val, ok := keys[key]; ok {
			return val
		}
	}

	// enrich with default values if metadata is not found
	if key.Type == "" {
		key.Type = v3.AttributeKeyTypeTag
	}
	if key.DataType == "" {
		key.DataType = v3.AttributeKeyDataTypeString
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
			// if the serviceName column is used, use the corresponding resource attribute as well during filtering
			if filter.Key.Key == "serviceName" && filter.Key.IsColumn {
				query.Filters.Items[idx].Key = v3.AttributeKey{
					Key:      "service.name",
					DataType: v3.AttributeKeyDataTypeString,
					Type:     v3.AttributeKeyTypeResource,
					IsColumn: false,
				}
			}
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

func enrichOrderBy(items []v3.OrderBy, keys map[string]v3.AttributeKey) []v3.OrderBy {
	enrichedItems := []v3.OrderBy{}
	for i := 0; i < len(items); i++ {
		attributeKey := enrichKeyWithMetadata(v3.AttributeKey{
			Key: items[i].ColumnName,
		}, keys)
		enrichedItems = append(enrichedItems, v3.OrderBy{
			ColumnName: items[i].ColumnName,
			Order:      items[i].Order,
			Key:        attributeKey.Key,
			DataType:   attributeKey.DataType,
			Type:       attributeKey.Type,
			IsColumn:   attributeKey.IsColumn,
		})
	}
	return enrichedItems
}
