package telemetryai

import (
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	scopedtraces "github.com/SigNoz/signoz/pkg/telemetryscopedtraces"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// NewAITraceStatementBuilder wires the generic scoped-trace builder with the gen_ai
// gate and AI columns. This package holds only gen_ai domain knowledge; the query
// topology lives in telemetryscopedtraces.
func NewAITraceStatementBuilder(
	settings factory.ProviderSettings,
	metadataStore telemetrytypes.MetadataStore,
	traceStmtBuilder qbtypes.StatementBuilder[qbtypes.TraceAggregation],
	fl flagger.Flagger,
) qbtypes.StatementBuilder[qbtypes.TraceAggregation] {
	return scopedtraces.NewScopedTraceStatementBuilder(settings, metadataStore, newGenAIBaseConditionProvider(), newGenAIColumnProvider(), traceStmtBuilder, fl)
}
