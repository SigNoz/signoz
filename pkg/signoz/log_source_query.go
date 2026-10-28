package signoz

import (
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/statementbuilder"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// LogSourceQuery supplies the query stack for one source within the logs
// signal. The resolver is built before the metadata store and the statement
// builder after it, so they arrive as two functions rather than two values.
// Sources nothing registers stay unavailable, which is how the community
// build ships the audit source.
type LogSourceQuery struct {
	Source                  telemetrytypes.Source
	Resolver                func(telemetrystore.TelemetryStore) telemetrytypes.FieldKeyResolver
	StatementBuilderFactory func(telemetrytypes.MetadataStore, flagger.Flagger) factory.ProviderFactory[qbtypes.StatementBuilder[qbtypes.LogAggregation], statementbuilder.Config]
}
