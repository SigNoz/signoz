package v3

import (
	"context"
	"strings"

	"go.signoz.io/signoz/pkg/query-service/model"
)

func GetLogFieldsV3(ctx context.Context, queryRangeParams *QueryRangeParamsV3, fields *model.GetFieldsResponse) map[string]AttributeKey {
	data := map[string]AttributeKey{}
	for _, query := range queryRangeParams.CompositeQuery.BuilderQueries {
		if query.DataSource == DataSourceLogs {

			// top level fields meta will always be present in the frontend. (can be support for that as enchancement)
			getType := func(t string) (AttributeKeyType, bool) {
				if t == "attributes" {
					return AttributeKeyTypeTag, false
				} else if t == "resources" {
					return AttributeKeyTypeResource, false
				}
				return "", true
			}

			for _, selectedField := range fields.Selected {
				fieldType, pass := getType(selectedField.Type)
				if pass {
					continue
				}
				data[selectedField.Name] = AttributeKey{
					Key:      selectedField.Name,
					Type:     fieldType,
					DataType: AttributeKeyDataType(strings.ToLower(selectedField.DataType)),
					IsColumn: true,
				}
			}
			for _, interestingField := range fields.Interesting {
				fieldType, pass := getType(interestingField.Type)
				if pass {
					continue
				}
				data[interestingField.Name] = AttributeKey{
					Key:      interestingField.Name,
					Type:     fieldType,
					DataType: AttributeKeyDataType(strings.ToLower(interestingField.DataType)),
					IsColumn: false,
				}
			}
			break
		}
	}
	return data
}
