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
	Signal  string `json:"signal" required:"true"`
	Context string `json:"context" required:"true"`
	Path    string `json:"path" required:"true"`
	Promote bool   `json:"promote,omitempty"`

	Indexes []WrappedIndex `json:"indexes,omitempty"`
}

func (i *PromotePath) Target() (Target, error) {
	return NewTargetFromText(i.Signal, i.Context)
}

// TargetedPath pairs a validated promote path with its resolved target.
type TargetedPath struct {
	Path   *PromotePath
	Target Target
}

type ListPromotedPathsFilters struct {
	Signal   string `query:"signal" json:"signal"`
	Context  string `query:"context" json:"context"`
	Promoted *bool  `query:"promoted" json:"promoted"`
	Indexes  *bool  `query:"indexes" json:"indexes"`
}

// Validate checks the signal and context words are known; the pair need not
// name a supported domain.
func (f *ListPromotedPathsFilters) Validate() error {
	if f.Signal != "" {
		if _, ok := telemetrytypes.SignalFromText(f.Signal); !ok {
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid signal: %s", f.Signal)
		}
	}
	if f.Context != "" {
		if _, ok := telemetrytypes.FieldContextFromText(f.Context); !ok {
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid context: %s", f.Context)
		}
	}
	return nil
}

func (f *ListPromotedPathsFilters) MatchesTarget(target Target) bool {
	if f.Signal != "" && f.Signal != target.Entry.Signal.StringValue() {
		return false
	}
	if f.Context != "" && f.Context != target.Entry.FieldContext.StringValue() {
		return false
	}
	return true
}

func (f *ListPromotedPathsFilters) MatchesPath(path PromotePath) bool {
	if f.Promoted != nil && *f.Promoted != path.Promote {
		return false
	}
	if f.Indexes != nil && *f.Indexes != (len(path.Indexes) > 0) {
		return false
	}
	return true
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

	if prefix, ok := target.reservedPathPrefix(i.Path); ok {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "path must be a bare attribute name, without the `%s` prefix", prefix)
	}

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
