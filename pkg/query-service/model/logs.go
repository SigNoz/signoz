package model

import (
	"context"
	"strings"

	schemamigrator "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz-otel-collector/constants"
	"github.com/SigNoz/signoz-otel-collector/pkg/keycheck"
	"github.com/SigNoz/signoz/pkg/errors"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/telemetrylogs"
)

const (
	NgramIndexType = "ngrambf_v1(4, 60000, 5, 0)"
	TokenIndexType = "tokenbf_v1(10000, 2, 0)"
)

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

type PromotePathItem struct {
	Path    string `json:"path"`
	Promote bool   `json:"promote,omitempty"`
	Index   bool   `json:"index,omitempty"`

	Indexes []schemamigrator.Index `json:"indexes,omitempty"`
}

func (i *PromotePathItem) Validate() error {
	if i.Path == "" {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "path is required")
	}

	if strings.Contains(i.Path, " ") {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "path cannot contain spaces")
	}

	// TODO(Piyush): Replace with ArraySeparator once we have it
	if strings.Contains(i.Path, "[]") {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "array paths can not be promoted or indexed")
	}

	if strings.HasPrefix(i.Path, constants.BodyJSONColumnPrefix) || strings.HasPrefix(i.Path, constants.BodyPromotedColumnPrefix) {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "`%s`, `%s` don't add these prefixes to the path", constants.BodyJSONColumnPrefix, constants.BodyPromotedColumnPrefix)
	}

	if !strings.HasPrefix(i.Path, telemetrylogs.BodyJSONStringSearchPrefix) {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "path must start with `body.`")
	}

	isCardinal := keycheck.IsCardinal(i.Path)
	if isCardinal {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "cardinal paths can not be promoted or indexed")
	}

	// set default indexes if not provided
	if i.Index {
		if len(i.Indexes) > 2 {
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "too many indexes for path %s", i.Path)
		}
		for _, index := range i.Indexes {
			if index.Type == "" {
				return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "index type is required for path %s", i.Path)
			}
			if !strings.Contains(index.Type, "ngrambf_v1") && !strings.Contains(index.Type, "tokenbf_v1") {
				return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "index type must be ngrambf_v1 or tokenbf_v1 for path %s", i.Path)
			}
			if index.Granularity < 1 {
				return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "index granularity is required for path %s", i.Path)
			}
		}
		if len(i.Indexes) == 0 {
			// set default indexes if not provided
			i.Indexes = []schemamigrator.Index{
				{
					Type:        NgramIndexType,
					Granularity: 1,
				},
				{
					Type:        TokenIndexType,
					Granularity: 1,
				},
			}
		}

	}

	return nil
}
