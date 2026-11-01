package implannotations

import (
	"context"
	"strings"

	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
)

// Returns an empty clause when the expression is empty or holds no resource condition.
func (m *module) buildFilterClause(ctx context.Context, orgID valuer.UUID, signal telemetrytypes.Signal, filter *qbtypes.Filter, startMillis, endMillis int64) (*sqlbuilder.WhereClause, error) {
	expression := ""
	if filter != nil {
		expression = strings.TrimSpace(filter.Expression)
	}
	if expression == "" {
		return sqlbuilder.NewWhereClause(), nil
	}

	whereClauseSelectors := querybuilder.QueryStringToKeysSelectors(expression)
	for idx := range whereClauseSelectors {
		whereClauseSelectors[idx].Signal = signal
		whereClauseSelectors[idx].SelectorMatchType = telemetrytypes.FieldSelectorMatchTypeExact
	}

	whereClauseSelectors = querybuilder.ExpandKeySelectorsForFamilies(ctx, orgID, m.fl, whereClauseSelectors)
	keys, _, err := m.telemetryMetadataStore.GetKeysMulti(ctx, orgID, whereClauseSelectors)
	if err != nil {
		return nil, err
	}

	opts := querybuilder.FilterExprVisitorOpts{
		Context:            ctx,
		Query:              querybuilder.NewQueryInfo(ctx, orgID, m.fl, signal, nil, querybuilder.ToNanoSecs(uint64(startMillis)), querybuilder.ToNanoSecs(uint64(endMillis))),
		Storage:            m.storage,
		Logger:             m.logger,
		FieldKeys:          keys,
		SkipFullTextFilter: true,
	}

	whereClause, err := querybuilder.PrepareWhereClause(expression, opts)
	if err != nil {
		return nil, err
	}

	if whereClause.IsEmpty() {
		return sqlbuilder.NewWhereClause(), nil
	}

	return whereClause.WhereClause, nil
}
