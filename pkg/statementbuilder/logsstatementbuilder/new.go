package logsstatementbuilder

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/statementbuilder"
	"github.com/SigNoz/signoz/pkg/telemetryschema/logstelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// NewFactory returns a provider factory for the logs statement builder. Its New
// internalizes the FieldMapper, ConditionBuilder, and AggExprRewriter, and reads
// SkipResourceFingerprint from the config.
func NewFactory(
	telemetryStore telemetrystore.TelemetryStore,
	metadataStore telemetrytypes.MetadataStore,
	fl flagger.Flagger,
) factory.ProviderFactory[qbtypes.StatementBuilder[qbtypes.LogAggregation], statementbuilder.Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("logs"),
		func(_ context.Context, settings factory.ProviderSettings, cfg statementbuilder.Config) (qbtypes.StatementBuilder[qbtypes.LogAggregation], error) {
			fm := logstelemetryschema.NewFieldMapper(fl)
			cb := logstelemetryschema.NewConditionBuilder(fm, fl)
			aggExprRewriter := querybuilder.NewAggExprRewriter(settings, logstelemetryschema.DefaultFullTextColumn, fm, cb, fl)
			return NewLogQueryStatementBuilder(
				settings, metadataStore, fm, cb, aggExprRewriter, logstelemetryschema.DefaultFullTextColumn,
				fl, telemetryStore, cfg.SkipResourceFingerprint.Enabled, cfg.SkipResourceFingerprint.Threshold,
			), nil
		},
	)
}
