package metricsstatementbuilder

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/statementbuilder"
	"github.com/SigNoz/signoz/pkg/telemetryschema/metricstelemetryschema"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// NewFactory returns a provider factory for the metrics statement builder. Its
// New internalizes the FieldMapper and ConditionBuilder and yields the concrete
// *StatementBuilder so the meter builder can reuse it.
func NewFactory(
	metadataStore telemetrytypes.MetadataStore,
	fl flagger.Flagger,
) factory.ProviderFactory[*StatementBuilder, statementbuilder.Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("metrics"),
		func(_ context.Context, settings factory.ProviderSettings, _ statementbuilder.Config) (*StatementBuilder, error) {
			fm := metricstelemetryschema.NewFieldMapper()
			cb := metricstelemetryschema.NewConditionBuilder(fm)
			return NewMetricQueryStatementBuilder(settings, metadataStore, fm, cb, fl), nil
		},
	)
}
