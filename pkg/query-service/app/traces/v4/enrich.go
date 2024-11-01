package v4

import v3 "go.signoz.io/signoz/pkg/query-service/model/v3"

// we could have created aliases but as of now we are sticking to this as alias are not dynamic in nature
// Note: ALTER TABLE doesn't support adding an alias directly, so you may need to create the table with aliases from the start.
var attributeMatColsMapping = map[string]v3.AttributeKey{
	"http.route": {
		Key:      "httpRoute",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"messaging.system": {
		Key:      "msgSystem",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"messaging.peration": {
		Key:      "msgOperation",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"db.system": {
		Key:      "dbSystem",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"rpc.system": {
		Key:      "rpcSystem",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"rpc.service": {
		Key:      "rpcService",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"rpc.method": {
		Key:      "rpcMethod",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"peer.service": {
		Key:      "peerService",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
}

func enrichKeyWithMetadata(key v3.AttributeKey, keys map[string]v3.AttributeKey) v3.AttributeKey {
	if matCol, ok := attributeMatColsMapping[key.Key]; ok {
		return matCol
	}
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
