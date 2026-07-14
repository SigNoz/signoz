package telemetryai

import (
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	scopedtraces "github.com/SigNoz/signoz/pkg/telemetryscopedtraces"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// NewAITraceStatementBuilder wires the generic scoped-trace builder with the gen_ai
// gate and AI columns. This package holds only gen_ai domain knowledge; the query
// topology lives in telemetryscopedtraces.
func NewAITraceStatementBuilder(
	settings factory.ProviderSettings,
	metadataStore telemetrytypes.MetadataStore,
	baseCond scopedtraces.BaseConditionProvider,
	traceStmtBuilder qbtypes.StatementBuilder[qbtypes.TraceAggregation],
	telemetryStore telemetrystore.TelemetryStore,
	fl flagger.Flagger,
	skipResourceFingerprintEnable bool,
	skipResourceFingerprintThreshold uint64,
) qbtypes.StatementBuilder[qbtypes.TraceAggregation] {
	return scopedtraces.NewScopedTraceStatementBuilder(settings, metadataStore, baseCond, NewGenAIColumnProvider(), traceStmtBuilder, telemetryStore, fl, skipResourceFingerprintEnable, skipResourceFingerprintThreshold)
}
