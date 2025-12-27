package promotetypes

import (
	"strings"

	"github.com/SigNoz/signoz-otel-collector/constants"
	"github.com/SigNoz/signoz-otel-collector/pkg/keycheck"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

type WrappedIndex struct {
	JSONDataType telemetrytypes.JSONDataType `json:"-"`
	ColumnType   string                      `json:"column_type"`
	Type         string                      `json:"type"`
	Granularity  int                         `json:"granularity"`
}

type PromotePath struct {
	Path    string `json:"path"`
	Promote bool   `json:"promote,omitempty"`

	Indexes []WrappedIndex `json:"indexes,omitempty"`
}

func (i *PromotePath) ValidateAndSetDefaults() error {
	if i.Path == "" {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "path is required")
	}

	if strings.Contains(i.Path, " ") {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "path cannot contain spaces")
	}

	if strings.Contains(i.Path, telemetrytypes.ArraySep) || strings.Contains(i.Path, telemetrytypes.ArrayAnyIndex) {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "array paths can not be promoted or indexed")
	}

	if strings.HasPrefix(i.Path, constants.BodyJSONColumnPrefix) || strings.HasPrefix(i.Path, constants.BodyPromotedColumnPrefix) {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "`%s`, `%s` don't add these prefixes to the path", constants.BodyJSONColumnPrefix, constants.BodyPromotedColumnPrefix)
	}

	if !strings.HasPrefix(i.Path, telemetrytypes.BodyJSONStringSearchPrefix) {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "path must start with `body.`")
	}

	// remove the "body." prefix from the path
	i.Path = strings.TrimPrefix(i.Path, telemetrytypes.BodyJSONStringSearchPrefix)

	isCardinal := keycheck.IsCardinal(i.Path)
	if isCardinal {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "cardinal paths can not be promoted or indexed")
	}

	for idx, index := range i.Indexes {
		if index.Type == "" {
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "index type is required")
		}
		if index.Granularity <= 0 {
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "index granularity must be greater than 0")
		}

		jsonDataType, ok := telemetrytypes.MappingStringToJSONDataType[index.ColumnType]
		if !ok {
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid column type: %s", index.ColumnType)
		}
		if !jsonDataType.IndexSupported {
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "index is not supported for column type: %s", index.ColumnType)
		}

		i.Indexes[idx].JSONDataType = jsonDataType
	}

	return nil
}
