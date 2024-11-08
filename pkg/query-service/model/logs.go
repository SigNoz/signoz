package model

import (
	"context"
	"strings"

	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

type LogsLiveTailClientV2 struct {
	Name  string
	Logs  chan *SignozLogV2
	Done  chan *bool
	Error chan error
}

type LogsLiveTailClient struct {
	Name  string
	Logs  chan *SignozLog
	Done  chan *bool
	Error chan error
}

type QueryProgress struct {
	ReadRows uint64 `json:"read_rows"`

	ReadBytes uint64 `json:"read_bytes"`

	ElapsedMs uint64 `json:"elapsed_ms"`
}

func GetLogFieldsV3(ctx context.Context, queryRangeParams *v3.QueryRangeParamsV3, fields *GetFieldsResponse) map[string]v3.AttributeKey {
	data := map[string]v3.AttributeKey{}
	for _, query := range queryRangeParams.CompositeQuery.BuilderQueries {
		if query.DataSource == v3.DataSourceLogs {

			// top level fields meta will always be present in the frontend. (can be support for that as enchancement)
			getType := func(t string) (v3.AttributeKeyType, bool) {
				if t == "attributes" {
					return v3.AttributeKeyTypeTag, false
				} else if t == "resources" {
					return v3.AttributeKeyTypeResource, false
				}
				return "", true
			}

			for _, selectedField := range fields.Selected {
				fieldType, pass := getType(selectedField.Type)
				if pass {
					continue
				}
				name := selectedField.Name + "##" + fieldType.String() + "##" + strings.ToLower(selectedField.DataType)
				data[name] = v3.AttributeKey{
					Key:      selectedField.Name,
					Type:     fieldType,
					DataType: v3.AttributeKeyDataType(strings.ToLower(selectedField.DataType)),
					IsColumn: true,
				}
			}
			for _, interestingField := range fields.Interesting {
				fieldType, pass := getType(interestingField.Type)
				if pass {
					continue
				}
				name := interestingField.Name + "##" + fieldType.String() + "##" + strings.ToLower(interestingField.DataType)
				data[name] = v3.AttributeKey{
					Key:      interestingField.Name,
					Type:     fieldType,
					DataType: v3.AttributeKeyDataType(strings.ToLower(interestingField.DataType)),
					IsColumn: false,
				}

			}
			break
		}
	}
	return data
}
