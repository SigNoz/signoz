package noopauditstatementbuilder

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/statementbuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// NewFactory builds the audit statement builder for builds that do not ship
// audit logging. Audit records are written by an enterprise-only auditor, so
// there is nothing for a query to read and it is refused rather than served
// from the plain logs tables.
func NewFactory(_ telemetrytypes.MetadataStore, _ flagger.Flagger) factory.ProviderFactory[qbtypes.StatementBuilder[qbtypes.LogAggregation], statementbuilder.Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("noop"),
		func(_ context.Context, _ factory.ProviderSettings, _ statementbuilder.Config) (qbtypes.StatementBuilder[qbtypes.LogAggregation], error) {
			return statementBuilder{}, nil
		},
	)
}

type statementBuilder struct{}

func (statementBuilder) Build(_ context.Context, _ valuer.UUID, _, _ uint64, _ qbtypes.RequestType, _ qbtypes.QueryBuilderQuery[qbtypes.LogAggregation], _ map[string]qbtypes.VariableItem) (*qbtypes.Statement, error) {
	return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeUnsupported, "audit logs are not available in this build")
}
