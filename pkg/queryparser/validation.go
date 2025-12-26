package queryparser

import (
	clickhouse "github.com/AfterShip/clickhouse-sql-parser/parser"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/prometheus/prometheus/promql/parser"
)

// validatePromQLQuery validates a PromQL query syntax using the Prometheus parser
func validatePromQLQuery(query string) error {
	_, err := parser.ParseExpr(query)
	if err != nil {
		if syntaxErrs, ok := err.(parser.ParseErrors); ok {
			syntaxErr := syntaxErrs[0]
			startPosition := int(syntaxErr.PositionRange.Start)
			endPosition := int(syntaxErr.PositionRange.End)
			return &QueryParseError{
				StartPosition: &startPosition,
				EndPosition:   &endPosition,
				ErrorMessage:  syntaxErr.Error(),
				Query:         query,
			}
		}
	}
	return err
}

// validateClickHouseQuery validates a ClickHouse SQL query syntax using the ClickHouse parser
func validateClickHouseQuery(query string) error {
	p := clickhouse.NewParser(query)
	_, err := p.ParseStmts()
	if err != nil {
		// TODO: errors returned here is errors.errorString, rather than using regex to parser the error
		// we should think on using some other library that parses the CH query in more accurate manner,
		// current CH parser only does very minimal checks.
		// Sample Error: "line 0:36 expected table name or subquery, got ;\nSELECT department, avg(salary) FROM ;\n                                    ^\n"
		return &QueryParseError{
			ErrorMessage: err.Error(),
			Query:        query,
		}
	}
	return nil
}

// checkQueriesDisabled checks if all queries are disabled. Returns true if all queries are disabled, false otherwise.
func checkQueriesDisabled(compositeQuery *v3.CompositeQuery) bool {
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
