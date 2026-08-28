package aitelemetryschema

import (
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
)

var (
	traceAggregateNames = func() map[string]struct{} {
		names := make(map[string]struct{}, len(TraceAggregateFields))
		for name := range TraceAggregateFields {
			names[name] = struct{}{}
		}
		return names
	}()

	genAISpanGate = "(" + aiobservabilitytypes.GenAISpanFilterExpression() + ")"
)

// ScopedExistingQuery narrows value suggestions to gen_ai spans: the caller's
// filter minus its per-trace aggregate atoms (never ingested, so nothing can
// narrow on them), ANDed with the gen_ai span gate. An unparseable filter is
// dropped, matching how the metadata store treats it downstream.
func ScopedExistingQuery(existingQuery string) string {
	spanExpr := ""
	if existingQuery != "" {
		if expr, _, err := querybuilder.SplitFilterForAggregates(existingQuery, traceAggregateNames); err == nil {
			spanExpr = expr
		}
	}

	if spanExpr == "" {
		return genAISpanGate
	}
	return genAISpanGate + " AND (" + spanExpr + ")"
}
