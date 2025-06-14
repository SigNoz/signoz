package telemetrylogs

import (
	"context"

	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

type FilterCompilerOpts struct {
	FieldMapper        qbtypes.FieldMapper
	ConditionBuilder   qbtypes.ConditionBuilder
	MetadataStore      telemetrytypes.MetadataStore
	FullTextColumn     *telemetrytypes.TelemetryFieldKey
	JsonBodyPrefix     string
	JsonKeyToKey       qbtypes.JsonKeyToFieldFunc
	SkipResourceFilter bool
}

type filterCompiler struct {
	opts FilterCompilerOpts
}

func NewFilterCompiler(opts FilterCompilerOpts) *filterCompiler {
	return &filterCompiler{
		opts: opts,
	}
}

func (c *filterCompiler) Compile(ctx context.Context, expr string) (*sqlbuilder.WhereClause, []string, error) {
	selectors := querybuilder.QueryStringToKeysSelectors(expr)

	keys, err := c.opts.MetadataStore.GetKeysMulti(ctx, selectors)
	if err != nil {
		return nil, nil, err
	}

	filterWhereClause, warnings, err := querybuilder.PrepareWhereClause(expr, querybuilder.FilterExprVisitorOpts{
		FieldMapper:        c.opts.FieldMapper,
		ConditionBuilder:   c.opts.ConditionBuilder,
		FieldKeys:          keys,
		FullTextColumn:     c.opts.FullTextColumn,
		JsonBodyPrefix:     c.opts.JsonBodyPrefix,
		JsonKeyToKey:       c.opts.JsonKeyToKey,
		SkipResourceFilter: c.opts.SkipResourceFilter,
	})

	if err != nil {
		return nil, nil, err
	}

	return filterWhereClause, warnings, nil
}
