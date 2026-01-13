package v3

import (
	"bytes"
	"fmt"
	"text/template"
	"time"

	clickhouse "github.com/AfterShip/clickhouse-sql-parser/parser"
	"github.com/SigNoz/signoz/pkg/errors"
	querytemplate "github.com/SigNoz/signoz/pkg/query-service/utils/queryTemplate"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/prometheus/prometheus/promql/parser"
)

type QueryParseError struct {
	StartPosition *int
	EndPosition   *int
	ErrorMessage  string
	Query         string
}

func (e *QueryParseError) Error() string {
	if e.StartPosition != nil && e.EndPosition != nil {
		return fmt.Sprintf("query parse error: %s at position %d:%d", e.ErrorMessage, *e.StartPosition, *e.EndPosition)
	}
	return fmt.Sprintf("query parse error: %s", e.ErrorMessage)
}

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
	// Assign the default template variables with dummy values
	variables := make(map[string]interface{})
	start := time.Now().UnixMilli()
	end := start + 1000
	querytemplate.AssignReservedVars(variables, start, end)

	// Apply the values for default template variables before parsing the query
	tmpl := template.New("clickhouse-query")
	tmpl, err := tmpl.Parse(query)
	if err != nil {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"failed to parse clickhouse query: %s",
			err.Error(),
		)
	}
	var queryBuffer bytes.Buffer
	err = tmpl.Execute(&queryBuffer, variables)
	if err != nil {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"failed to execute clickhouse query template: %s",
			err.Error(),
		)
	}

	// Parse the ClickHouse query with the default template variables applied
	p := clickhouse.NewParser(queryBuffer.String())
	_, err = p.ParseStmts()
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
func checkQueriesDisabled(compositeQuery *CompositeQuery) bool {
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
