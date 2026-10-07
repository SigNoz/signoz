package promotetypes

import (
	"regexp"
	"strconv"
	"strings"

	schemamigrator "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
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
	if f.Signal != "" {
		if signal, ok := telemetrytypes.SignalFromText(f.Signal); !ok || signal != target.Entry.Signal {
			return false
		}
	}
	if f.Context != "" {
		if fieldContext, ok := telemetrytypes.FieldContextFromText(f.Context); !ok || fieldContext != target.Entry.FieldContext {
			return false
		}
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
		if err := validateIndexType(index.Type); err != nil {
			return err
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

func (index WrappedIndex) SkipIndexType() (schemamigrator.IndexType, error) {
	switch {
	case strings.HasPrefix(index.Type, string(schemamigrator.IndexTypeNGramBF)):
		return schemamigrator.IndexTypeNGramBF, nil
	case strings.HasPrefix(index.Type, string(schemamigrator.IndexTypeTokenBF)):
		return schemamigrator.IndexTypeTokenBF, nil
	case strings.HasPrefix(index.Type, string(schemamigrator.IndexTypeMinMax)):
		return schemamigrator.IndexTypeMinMax, nil
	case strings.HasPrefix(index.Type, "bloom_filter"):
		return "bloom_filter", nil
	case strings.HasPrefix(index.Type, "set"):
		return "set", nil
	default:
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid index type: %s", index.Type)
	}
}

// indexTypeRe anchors the whole index type string, so only a whitelisted type
// with bounded numeric parameters can reach the index DDL.
var indexTypeRe = regexp.MustCompile(`^(?:minmax|set\(\s*(\d{1,7})\s*\)|bloom_filter(?:\(\s*(\d+(?:\.\d+)?|\.\d+)\s*\))?|tokenbf_v1\(\s*(\d{1,7})\s*,\s*(\d{1,2})\s*,\s*(\d{1,10})\s*\)|ngrambf_v1\(\s*(\d{1,2})\s*,\s*(\d{1,7})\s*,\s*(\d{1,2})\s*,\s*(\d{1,10})\s*\))$`)

const (
	maxIndexNGramLength      = 64
	maxIndexBloomFilterBytes = 1 << 20
	maxIndexHashFunctions    = 64
)

func validateIndexType(indexType string) error {
	matches := indexTypeRe.FindStringSubmatch(indexType)
	if matches == nil {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid index type: %s", indexType)
	}

	switch {
	case indexType == "minmax" || strings.HasPrefix(indexType, "set"):
		return nil
	case strings.HasPrefix(indexType, "bloom_filter"):
		if matches[2] == "" {
			return nil
		}
		falsePositive, _ := strconv.ParseFloat(matches[2], 64)
		if falsePositive <= 0 || falsePositive >= 1 {
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid false positive rate in index type: %s", indexType)
		}
		return nil
	}

	params := matches[3:6]
	if strings.HasPrefix(indexType, "ngrambf_v1") {
		params = matches[6:10]
	}
	values := make([]uint64, len(params))
	for idx, param := range params {
		values[idx], _ = strconv.ParseUint(param, 10, 64)
	}

	bloomBytes, hashes := 0, 1
	if len(values) == 4 {
		if values[0] < 1 || values[0] > maxIndexNGramLength {
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid n-gram length in index type: %s", indexType)
		}
		bloomBytes, hashes = 1, 2
	}
	if values[bloomBytes] < 1 || values[bloomBytes] > maxIndexBloomFilterBytes {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid bloom filter size in index type: %s", indexType)
	}
	if values[hashes] < 1 || values[hashes] > maxIndexHashFunctions {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid hash function count in index type: %s", indexType)
	}
	return nil
}
