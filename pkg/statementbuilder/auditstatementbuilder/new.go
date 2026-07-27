package auditstatementbuilder

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/statementbuilder"
	"github.com/SigNoz/signoz/pkg/telemetryschema/audittelemetryschema"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// NewFactory returns a provider factory for the audit statement builder. Its New
// internalizes the FieldMapper, ConditionBuilder, and AggExprRewriter.
func NewFactory(
	metadataStore telemetrytypes.MetadataStore,
	fl flagger.Flagger,
) factory.ProviderFactory[qbtypes.StatementBuilder[qbtypes.LogAggregation], statementbuilder.Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("audit"),
		func(_ context.Context, settings factory.ProviderSettings, _ statementbuilder.Config) (qbtypes.StatementBuilder[qbtypes.LogAggregation], error) {
			fm := audittelemetryschema.NewFieldMapper()
			cb := audittelemetryschema.NewConditionBuilder(fm)
			aggExprRewriter := querybuilder.NewAggExprRewriter(settings, audittelemetryschema.DefaultFullTextColumn, fm, cb, fl)
			return NewAuditQueryStatementBuilder(
				settings, metadataStore, fm, cb, aggExprRewriter, audittelemetryschema.DefaultFullTextColumn, fl,
			), nil
		},
	)
}
