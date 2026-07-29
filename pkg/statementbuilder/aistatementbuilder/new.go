package aistatementbuilder

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/statementbuilder"
	scopedtraces "github.com/SigNoz/signoz/pkg/statementbuilder/scopedtracesstatementbuilder"
	"github.com/SigNoz/signoz/pkg/statementbuilder/tracesstatementbuilder"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// NewFactory returns a provider factory for the AI trace statement builder
// (builder_ai_query): the gen_ai Scope paired with the domain-neutral scoped-trace
// topology. The span-list path delegates to a trace statement builder built via the
// traces factory — mirroring how the meter factory builds its own metrics builder.
//
// The gen_ai gate/column keys are surfaced by the metadata store itself
// (enrichWithGenAIKeys), so queries work before any gen_ai metadata is ingested.
func NewFactory(
	telemetryStore telemetrystore.TelemetryStore,
	metadataStore telemetrytypes.MetadataStore,
	fl flagger.Flagger,
) factory.ProviderFactory[qbtypes.StatementBuilder[qbtypes.TraceAggregation], statementbuilder.Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("ai"),
		func(ctx context.Context, settings factory.ProviderSettings, cfg statementbuilder.Config) (qbtypes.StatementBuilder[qbtypes.TraceAggregation], error) {
			traceStmtBuilder, err := tracesstatementbuilder.NewFactory(telemetryStore, metadataStore, fl).New(ctx, settings, cfg)
			if err != nil {
				return nil, err
			}
			return scopedtraces.NewScopedTraceStatementBuilder(
				settings, metadataStore, Scope(), traceStmtBuilder, fl,
			), nil
		},
	)
}
