package queryfilter

import (
	"context"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	telemetrytypes "github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

type CompilerOptions struct {
	MetadataStore    telemetrytypes.MetadataStore
	FieldMapper      qbtypes.FieldMapper
	ConditionBuilder qbtypes.ConditionBuilder
	FullTextColumn   *telemetrytypes.TelemetryFieldKey
	JsonBodyPrefix   string
	JsonKeyToKey     qbtypes.JsonKeyToFieldFunc
}

func NewCompiler(opts CompilerOptions) qbtypes.Compiler {
	return &compiler{
		metadataStore:    opts.MetadataStore,
		fieldMapper:      opts.FieldMapper,
		conditionBuilder: opts.ConditionBuilder,
		fullTextColumn:   opts.FullTextColumn,
		jsonBodyPrefix:   opts.JsonBodyPrefix,
		jsonKeyToKey:     opts.JsonKeyToKey,
	}
}

type compiler struct {
	metadataStore    telemetrytypes.MetadataStore
	fieldMapper      qbtypes.FieldMapper
	conditionBuilder qbtypes.ConditionBuilder
	fullTextColumn   *telemetrytypes.TelemetryFieldKey
	jsonBodyPrefix   string
	jsonKeyToKey     qbtypes.JsonKeyToFieldFunc
}

func (c *compiler) Compile(ctx context.Context, query string) (*sqlbuilder.WhereClause, []string, error) {
	keysSelectors, err := QueryStringToKeysSelectors(query)
	if err != nil {
		return nil, nil, err
	}

	keys, err := c.metadataStore.GetKeysMulti(ctx, keysSelectors)
	if err != nil {
		return nil, nil, err
	}

	return prepareWhereClause(query, keys, c.fieldMapper, c.conditionBuilder, c.fullTextColumn, c.jsonBodyPrefix, c.jsonKeyToKey)
}
