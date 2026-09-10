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

// Target identifies a JSON column whose paths can be promoted: where the
// promotion is recorded in the column evolution table (signal, promoted
// column, field context), which table per-path indexes are created on, and
// the path rules enforced by the API.
type Target struct {
	Signal       telemetrytypes.Signal
	FieldContext telemetrytypes.FieldContext

	DBName         string
	LocalTableName string

	// BaseColumn holds every path; PromotedColumn additionally holds the
	// promoted paths. Indexes are created on PromotedColumn for promoted
	// paths and on BaseColumn otherwise.
	BaseColumn     string
	PromotedColumn string

	// RequiredPathPrefix is the prefix paths must carry in the API ("body."
	// for the logs body); it is stripped before storing. Empty for bare
	// names (trace attributes).
	RequiredPathPrefix string

	// IndexesSupported reports whether per-path skip indexes can be created
	// for this target. Index support is optional: a target may support
	// promotion only.
	IndexesSupported bool
}

func (t Target) BaseColumnPrefix() string { return t.BaseColumn + "." }

func (t Target) PromotedColumnPrefix() string { return t.PromotedColumn + "." }

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
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "indexes are not supported for %s %s", target.Signal.StringValue(), target.FieldContext.StringValue())
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
