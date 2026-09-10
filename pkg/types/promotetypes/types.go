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

// Target identifies a promotion domain: the column evolution entry recorded
// for each promoted path, the table per-path indexes are created on, and the
// path rules enforced by the API.
type Target struct {
	// Entry templates the column evolution row recorded per promoted path:
	// signal, promoted column name and type, and field context. FieldName
	// and ReleaseTime are filled in per write.
	Entry telemetrytypes.EvolutionEntry

	// DBName and LocalTableName hold the table per-path indexes are created
	// on. They are index DDL config, not part of the evolution record, and
	// are used only when IndexesSupported.
	DBName         string
	LocalTableName string

	// BaseColumn holds every path. Indexes are created on the promoted
	// column for promoted paths and on BaseColumn otherwise.
	BaseColumn string

	// RequiredPathPrefix is the prefix paths must carry in the API ("body."
	// for the logs body); it is stripped before storing. Empty for bare
	// names (trace attributes).
	RequiredPathPrefix string

	// IndexesSupported reports whether per-path skip indexes can be created
	// for this target. Index support is optional: a target may support
	// promotion only.
	IndexesSupported bool
}

func (t Target) PromotedColumn() string { return t.Entry.ColumnName }

func (t Target) BaseColumnPrefix() string { return t.BaseColumn + "." }

func (t Target) PromotedColumnPrefix() string { return t.PromotedColumn() + "." }

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
