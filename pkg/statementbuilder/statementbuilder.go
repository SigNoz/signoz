package statementbuilder

import (
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

// Builders bundles the per-signal statement builders that make up the query stack.
//
// This package is contract-only: it declares Builders (here) and Config (config.go)
// and imports no sub-package. Each <signal>statementbuilder depends on this package
// for Config and exposes its own factory.ProviderFactory[..., Config]; the composition
// root (signoz.go::newQueryStack) is the only place that imports the concrete
// sub-packages and assembles this struct. Keeping the edge as subs -> parent (never
// the reverse) is what lets the sub-packages reference Config without an import cycle.
type Builders struct {
	Trace         qbtypes.StatementBuilder[qbtypes.TraceAggregation]
	AITrace       qbtypes.StatementBuilder[qbtypes.TraceAggregation]
	TraceOperator qbtypes.TraceOperatorStatementBuilder
	Log           qbtypes.StatementBuilder[qbtypes.LogAggregation]
	Audit         qbtypes.StatementBuilder[qbtypes.LogAggregation]
	Metric        qbtypes.StatementBuilder[qbtypes.MetricAggregation]
	Meter         qbtypes.StatementBuilder[qbtypes.MetricAggregation]
}
