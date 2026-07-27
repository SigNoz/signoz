package meterstatementbuilder

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/statementbuilder"
	"github.com/SigNoz/signoz/pkg/statementbuilder/metricsstatementbuilder"
	"github.com/SigNoz/signoz/pkg/telemetryschema/metricstelemetryschema"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// NewFactory returns a provider factory for the meter statement builder. Its New
// reuses the metrics FieldMapper/ConditionBuilder and delegates the final SELECT
// to a metrics statement builder built via the metrics factory.
func NewFactory(
	metadataStore telemetrytypes.MetadataStore,
	fl flagger.Flagger,
) factory.ProviderFactory[qbtypes.StatementBuilder[qbtypes.MetricAggregation], statementbuilder.Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("meter"),
		func(ctx context.Context, settings factory.ProviderSettings, cfg statementbuilder.Config) (qbtypes.StatementBuilder[qbtypes.MetricAggregation], error) {
			metricsStatementBuilder, err := metricsstatementbuilder.NewFactory(metadataStore, fl).New(ctx, settings, cfg)
			if err != nil {
				return nil, err
			}
			fm := metricstelemetryschema.NewFieldMapper()
			cb := metricstelemetryschema.NewConditionBuilder(fm)
			return NewMeterQueryStatementBuilder(settings, metadataStore, fm, cb, metricsStatementBuilder), nil
		},
	)
}
