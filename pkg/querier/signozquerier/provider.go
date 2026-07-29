package signozquerier

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/statementbuilder"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// NewFactory creates a new factory for the signoz querier provider. The query
// stack (metadata store, statement builders, bucket cache) is assembled once in
// signoz.go and injected here.
func NewFactory(
	telemetryStore telemetrystore.TelemetryStore,
	prometheus prometheus.Prometheus,
	metadataStore telemetrytypes.MetadataStore,
	builders *statementbuilder.Builders,
	bucketCache querier.BucketCache,
	flagger flagger.Flagger,
) factory.ProviderFactory[querier.Querier, querier.Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("signoz"),
		func(
			_ context.Context,
			settings factory.ProviderSettings,
			cfg querier.Config,
		) (querier.Querier, error) {
			return querier.New(
				settings,
				telemetryStore,
				metadataStore,
				prometheus,
				builders,
				bucketCache,
				flagger,
				cfg.LogTraceIDWindowPadding,
				cfg.MaxConcurrentQueries,
			), nil
		},
	)
}
