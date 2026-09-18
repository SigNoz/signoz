package promotetypes

import (
	"strings"

	"github.com/SigNoz/signoz-otel-collector/pkg/keycheck"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

type WrappedIndex struct {
	JSONDataType  telemetrytypes.JSONDataType  `json:"-"`
	FieldDataType telemetrytypes.FieldDataType `json:"fieldDataType"`
	Type          string                       `json:"type"`
	Granularity   int                          `json:"granularity"`
}

type PromotePath struct {
	Path    string `json:"path"`
	Promote bool   `json:"promote,omitempty"`

	Indexes []WrappedIndex `json:"indexes,omitempty"`
}

func (i *PromotePath) ValidateAndSetDefaults(target Target) error {
	if i.Path == "" {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "path is required")
	}

	if strings.Contains(i.Path, " ") {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "path cannot contain spaces")
	}

	if strings.Contains(i.Path, telemetrytypes.ArraySep) || strings.Contains(i.Path, telemetrytypes.ArrayAnyIndex) {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "array paths can not be promoted or indexed")
	}

	if strings.HasPrefix(i.Path, target.BaseColumnPrefix()) || strings.HasPrefix(i.Path, target.PromotedColumnPrefix()) {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "`%s`, `%s` don't add these prefixes to the path", target.BaseColumnPrefix(), target.PromotedColumnPrefix())
	}

	if target.RequiredPathPrefix != "" {
		if !strings.HasPrefix(i.Path, target.RequiredPathPrefix) {
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "path must start with `%s`", target.RequiredPathPrefix)
		}
		// remove the required prefix from the path
		i.Path = strings.TrimPrefix(i.Path, target.RequiredPathPrefix)
	}

	isCardinal := keycheck.IsCardinal(i.Path)
	if isCardinal {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "cardinal paths can not be promoted or indexed")
	}

	if len(i.Indexes) > 0 && !target.IndexesSupported {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "indexes are not supported for %s %s", target.Entry.Signal.StringValue(), target.Entry.FieldContext.StringValue())
	}

	for idx, index := range i.Indexes {
		if index.Type == "" {
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "index type is required")
		}
		if index.Granularity <= 0 {
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "index granularity must be greater than 0")
		}

		jsonDataType, ok := telemetrytypes.MappingFieldDataTypeToJSONDataType[index.FieldDataType]
		if !ok {
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid column type: %s", index.FieldDataType)
		}
		if !jsonDataType.IndexSupported {
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "index is not supported for column type: %s", index.FieldDataType)
		}

		i.Indexes[idx].JSONDataType = jsonDataType
	}

	return nil
}
