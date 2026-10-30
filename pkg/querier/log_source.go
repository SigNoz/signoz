package querier

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// logStmtBuilderFor returns the statement builder for a log query's source. A
// source this build registered no builder for resolves to one that reports it
// unavailable, so the query fails with that instead of silently reading the
// plain logs tables.
func (q *querier) logStmtBuilderFor(source telemetrytypes.Source) qbtypes.StatementBuilder[qbtypes.LogAggregation] {
	if source == telemetrytypes.SourceUnspecified {
		return q.logStmtBuilder
	}
	if builder, ok := q.sourceLogStmtBuilders[source]; ok {
		return builder
	}
	return unavailableSourceStmtBuilder{source: source}
}

type unavailableSourceStmtBuilder struct {
	source telemetrytypes.Source
}

func (b unavailableSourceStmtBuilder) Build(_ context.Context, _ valuer.UUID, _, _ uint64, _ qbtypes.RequestType, _ qbtypes.QueryBuilderQuery[qbtypes.LogAggregation], _ map[string]qbtypes.VariableItem) (*qbtypes.Statement, error) {
	return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeUnsupported, "log source %q is not available in this build", b.source.StringValue())
}
