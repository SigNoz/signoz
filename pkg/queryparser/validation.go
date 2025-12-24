package queryparser

import (
	clickhouse "github.com/AfterShip/clickhouse-sql-parser/parser"
	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/prometheus/prometheus/promql/parser"
)

// validatePromQLQuery validates a PromQL query syntax using the Prometheus parser
func validatePromQLQuery(query string) error {
	_, err := parser.ParseExpr(query)
	if err != nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to parse promql query: %s", err.Error())
	}
	return nil
}

// validateClickHouseQuery validates a ClickHouse SQL query syntax using the ClickHouse parser
func validateClickHouseQuery(query string) error {
	p := clickhouse.NewParser(query)
	_, err := p.ParseStmts()
	if err != nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to parse clickhouse query: %s", err.Error())
	}
	return nil
}

// checkQueriesDisabled checks if all queries are disabled. Returns true if all queries are disabled, false otherwise.
func checkQueriesDisabled(compositeQuery *qbtypes.CompositeQuery) bool {
	for _, envelope := range compositeQuery.Queries {
		switch envelope.Type {
		case qbtypes.QueryTypeBuilder, qbtypes.QueryTypeSubQuery:
			switch spec := envelope.Spec.(type) {
			case qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]:
				if !spec.Disabled {
					return false
				}
			case qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]:
				if !spec.Disabled {
					return false
				}
			case qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]:
				if !spec.Disabled {
					return false
				}
			}
		case qbtypes.QueryTypeFormula:
			if spec, ok := envelope.Spec.(qbtypes.QueryBuilderFormula); ok && !spec.Disabled {
				return false
			}
		case qbtypes.QueryTypeTraceOperator:
			if spec, ok := envelope.Spec.(qbtypes.QueryBuilderTraceOperator); ok && !spec.Disabled {
				return false
			}
		case qbtypes.QueryTypeJoin:
			if spec, ok := envelope.Spec.(qbtypes.QueryBuilderJoin); ok && !spec.Disabled {
				return false
			}
		case qbtypes.QueryTypePromQL:
			if spec, ok := envelope.Spec.(qbtypes.PromQuery); ok && !spec.Disabled {
				return false
			}
		case qbtypes.QueryTypeClickHouseSQL:
			if spec, ok := envelope.Spec.(qbtypes.ClickHouseQuery); ok && !spec.Disabled {
				return false
			}
		}
	}

	// If we reach here, all queries are disabled
	return true
}
