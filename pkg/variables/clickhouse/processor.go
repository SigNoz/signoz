package clickhouse

import (
	"strings"

	"github.com/AfterShip/clickhouse-sql-parser/parser"
	"github.com/SigNoz/signoz/pkg/errors"
)

// FilterAction represents what to do with a filter containing a variable
type FilterAction int

const (
	// KeepFilter maintains the original filter
	KeepFilter FilterAction = iota
	// RemoveFilter completely removes the filter
	RemoveFilter
	// ReplaceWithExistsCheck replaces filter with an EXISTS check
	ReplaceWithExistsCheck
)

// FilterTransformer defines the callback function that decides
// what to do with a filter containing a variable
type FilterTransformer func(variableName string, expr parser.Expr) FilterAction

// QueryProcessor handles ClickHouse query modifications
type QueryProcessor struct {
}

// NewQueryProcessor creates a new processor
func NewQueryProcessor() *QueryProcessor {
	return &QueryProcessor{}
}

// ProcessQuery finds variables in WHERE clauses and modifies them according to the transformer function
func (qp *QueryProcessor) ProcessQuery(query string, transformer FilterTransformer) (string, error) {
	p := parser.NewParser(query)
	stmts, err := p.ParseStmts()
	if err != nil {
		return "", errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "failed to parse query")
	}

	if len(stmts) == 0 {
		return query, nil
	}

	// Look for SELECT statements
	modified := false
	for i, stmt := range stmts {
		selectQuery, ok := stmt.(*parser.SelectQuery)
		if !ok {
			continue
		}

		whereModified, err := qp.processWhereClause(selectQuery, transformer)
		if err != nil {
			return "", err
		}
		if whereModified {
			modified = true
			stmts[i] = selectQuery
		}
	}

	if !modified {
		return query, nil
	}

	// Reconstruct the query
	var resultBuilder strings.Builder
	for _, stmt := range stmts {
		resultBuilder.WriteString(stmt.String())
		resultBuilder.WriteString(";")
	}

	return resultBuilder.String(), nil
}

// processWhereClause processes the WHERE clause in a SELECT statement
func (qp *QueryProcessor) processWhereClause(selectQuery *parser.SelectQuery, transformer FilterTransformer) (bool, error) {
	// First, process any subqueries in the FROM clause
	if selectQuery.From != nil {
		subQueryModified, err := qp.processFromClauseSubqueries(selectQuery.From, transformer)
		if err != nil {
			return false, err
		}
		if subQueryModified {
			// Mark as modified if any subqueries were modified
			return true, nil
		}
	}

	// Then process the main WHERE clause
	if selectQuery.Where == nil {
		return false, nil
	}

	// Process the WHERE expression, which may include subqueries
	modified := false
	newExpr, hasChanged, err := qp.transformExpr(selectQuery.Where.Expr, transformer)
	if err != nil {
		return false, err
	}

	if hasChanged {
		modified = true
		if newExpr == nil {
			// If the entire WHERE clause is removed
			selectQuery.Where = nil
		} else {
			selectQuery.Where.Expr = newExpr
		}
	}

	return modified, nil
}

// processFromClauseSubqueries recursively processes subqueries in the FROM clause
func (qp *QueryProcessor) processFromClauseSubqueries(fromClause *parser.FromClause, transformer FilterTransformer) (bool, error) {
	if fromClause == nil {
		return false, nil
	}

	return qp.processExprSubqueries(fromClause.Expr, transformer)
}

// processExprSubqueries processes subqueries found in expressions
func (qp *QueryProcessor) processExprSubqueries(expr parser.Expr, transformer FilterTransformer) (bool, error) {
	if expr == nil {
		return false, nil
	}

	modified := false

	switch e := expr.(type) {
	case *parser.SubQuery:
		// Process the subquery's SELECT statement
		if e.Select != nil {
			subQueryModified, err := qp.processWhereClause(e.Select, transformer)
			if err != nil {
				return false, err
			}
			if subQueryModified {
				modified = true
			}
		}

	case *parser.BinaryOperation:
		// Check left and right expressions for subqueries
		leftModified, err := qp.processExprSubqueries(e.LeftExpr, transformer)
		if err != nil {
			return false, err
		}

		rightModified, err := qp.processExprSubqueries(e.RightExpr, transformer)
		if err != nil {
			return false, err
		}

		if leftModified || rightModified {
			modified = true
		}

	case *parser.JoinExpr:
		// Process both sides of the join
		leftModified, err := qp.processExprSubqueries(e.Left, transformer)
		if err != nil {
			return false, err
		}

		rightModified, err := qp.processExprSubqueries(e.Right, transformer)
		if err != nil {
			return false, err
		}

		// Process join constraints if any
		constraintsModified, err := qp.processExprSubqueries(e.Constraints, transformer)
		if err != nil {
			return false, err
		}

		if leftModified || rightModified || constraintsModified {
			modified = true
		}

	case *parser.TableExpr:
		// Process any subqueries in the table expression
		return qp.processExprSubqueries(e.Expr, transformer)

	case *parser.AliasExpr:
		// Check if the aliased expression contains a subquery
		return qp.processExprSubqueries(e.Expr, transformer)

	case *parser.FunctionExpr:
		// Check function parameters for subqueries
		if e.Params != nil && e.Params.Items != nil {
			for _, item := range e.Params.Items.Items {
				itemModified, err := qp.processExprSubqueries(item, transformer)
				if err != nil {
					return false, err
				}
				if itemModified {
					modified = true
				}
			}
		}
	}

	return modified, nil
}

// transformExpr recursively processes expressions in the WHERE clause
func (qp *QueryProcessor) transformExpr(expr parser.Expr, transformer FilterTransformer) (parser.Expr, bool, error) {
	if expr == nil {
		return nil, false, nil
	}

	// Handle different expression types
	switch e := expr.(type) {
	case *parser.SubQuery:
		// Handle subqueries like "column IN (SELECT...)"
		if e.Select != nil {
			modified, err := qp.processWhereClause(e.Select, transformer)
			if err != nil {
				return nil, false, err
			}
			return expr, modified, nil
		}

	case *parser.BinaryOperation:
		// Handle IN with a subquery on the right
		if e.Operation == "IN" || e.Operation == "NOT IN" {
			_, rightIsSubQuery := e.RightExpr.(*parser.SubQuery)
			if rightIsSubQuery {
				// If right side is a subquery, check if left side has variables
				leftVars := qp.findVariables(e.LeftExpr)
				if len(leftVars) > 0 {
					// Apply action to the entire IN clause
					action := transformer(leftVars[0], expr)
					switch action {
					case RemoveFilter:
						return nil, true, nil
					case ReplaceWithExistsCheck:
						return qp.createExistsCheck(expr, leftVars[0])
					}
				}

				// Process the subquery separately (regardless of whether we modified based on left side)
				newRight, rightChanged, err := qp.transformExpr(e.RightExpr, transformer)
				if err != nil {
					return nil, false, err
				}

				if rightChanged {
					return &parser.BinaryOperation{
						LeftExpr:  e.LeftExpr,
						Operation: e.Operation,
						RightExpr: newRight,
						HasGlobal: e.HasGlobal,
						HasNot:    e.HasNot,
					}, true, nil
				}

				// If no changes, return the original
				return expr, false, nil
			}
		}

		// Check if this specific binary operation directly contains a variable
		leftVars := qp.findVariables(e.LeftExpr)
		rightVars := qp.findVariables(e.RightExpr)

		// If this is a direct filter with a variable (e.g., "column = $var")
		// and not a complex expression, handle it directly
		if len(leftVars) > 0 && len(rightVars) == 0 &&
			!qp.isComplexExpression(e.LeftExpr) && !qp.isComplexExpression(e.RightExpr) {
			action := transformer(leftVars[0], expr)
			switch action {
			case RemoveFilter:
				return nil, true, nil
			case ReplaceWithExistsCheck:
				return qp.createExistsCheck(expr, leftVars[0])
			}
		} else if len(rightVars) > 0 && len(leftVars) == 0 &&
			!qp.isComplexExpression(e.LeftExpr) && !qp.isComplexExpression(e.RightExpr) {
			action := transformer(rightVars[0], expr)
			switch action {
			case RemoveFilter:
				return nil, true, nil
			case ReplaceWithExistsCheck:
				return qp.createExistsCheck(expr, rightVars[0])
			}
		}

		// Otherwise, recursively process left and right sides
		newLeft, leftChanged, err := qp.transformExpr(e.LeftExpr, transformer)
		if err != nil {
			return nil, false, err
		}

		newRight, rightChanged, err := qp.transformExpr(e.RightExpr, transformer)
		if err != nil {
			return nil, false, err
		}

		if leftChanged || rightChanged {
			if e.Operation == "AND" {
				// For AND operations, if either side is nil (removed), we can simplify
				if newLeft == nil {
					return newRight, true, nil
				}
				if newRight == nil {
					return newLeft, true, nil
				}
			} else if (newLeft == nil || newRight == nil) &&
				(e.Operation == "=" || e.Operation == "IN" ||
					e.Operation == "<" || e.Operation == ">" ||
					e.Operation == "<=" || e.Operation == ">=") {
				// For direct comparison operations, if one side is removed, remove the entire expression
				return nil, true, nil
			}

			// Create a new binary operation with the modified sides
			return &parser.BinaryOperation{
				LeftExpr:  newLeft,
				Operation: e.Operation,
				RightExpr: newRight,
				HasGlobal: e.HasGlobal,
				HasNot:    e.HasNot,
			}, true, nil
		}
	}

	// For other expression types that may contain variables
	variables := qp.findVariables(expr)
	if len(variables) > 0 && !qp.isComplexExpression(expr) {
		action := transformer(variables[0], expr)
		switch action {
		case RemoveFilter:
			return nil, true, nil
		case ReplaceWithExistsCheck:
			return qp.createExistsCheck(expr, variables[0])
		}
	}

	return expr, false, nil
}

// isComplexExpression checks if an expression contains nested operations
// that should not be treated as a simple variable reference
func (qp *QueryProcessor) isComplexExpression(expr parser.Expr) bool {
	switch e := expr.(type) {
	case *parser.BinaryOperation:
		// If it's a binary operation, it's complex
		return true
	case *parser.FunctionExpr:
		// If it's a function, examine its parameters
		if e.Params != nil && e.Params.Items != nil {
			for _, item := range e.Params.Items.Items {
				if qp.isComplexExpression(item) {
					return true
				}
			}
		}
	}
	return false
}

// findVariables finds all variables in an expression
func (qp *QueryProcessor) findVariables(expr parser.Expr) []string {
	var variables []string

	if expr == nil {
		return variables
	}

	switch e := expr.(type) {
	case *parser.Ident:
		// we should identify the following ways of using variables
		// whitespace at the end or beginning of the variable name
		// should be trimmed
		// {{.variable_name}}, {{ .variable_name }}, {{  .variable_name}}
		// $variable_name
		// [[variable_name]], [[ variable_name]], [[    variable_name ]]
		// {{variable_name}}, {{ variable_name }}, {{variable_name  }}

		if strings.HasPrefix(e.Name, "$") {
			variables = append(variables, e.Name[1:]) // Remove the $ prefix
		}

	case *parser.BinaryOperation:
		variables = append(variables, qp.findVariables(e.LeftExpr)...)
		variables = append(variables, qp.findVariables(e.RightExpr)...)
	case *parser.FunctionExpr:
		if e.Params != nil && e.Params.Items != nil {
			for _, item := range e.Params.Items.Items {
				variables = append(variables, qp.findVariables(item)...)
			}
		}
	case *parser.ColumnExpr:
		variables = append(variables, qp.findVariables(e.Expr)...)
	case *parser.ParamExprList:
		if e.Items != nil {
			for _, item := range e.Items.Items {
				variables = append(variables, qp.findVariables(item)...)
			}
		}
	case *parser.SelectItem:
		variables = append(variables, qp.findVariables(e.Expr)...)
	case *parser.IndexOperation:
		variables = append(variables, qp.findVariables(e.Object)...)
		variables = append(variables, qp.findVariables(e.Index)...)
	}

	return variables
}

// createExistsCheck creates an EXISTS check for a column/map field
func (qp *QueryProcessor) createExistsCheck(expr parser.Expr, _ string) (parser.Expr, bool, error) {
	switch e := expr.(type) {
	case *parser.BinaryOperation:
		// Handle map field access like "attributes['http.method'] = $http_method"
		if indexOp, ok := e.LeftExpr.(*parser.IndexOperation); ok {
			// Create a "has" function check for maps
			functionName := &parser.Ident{
				Name: "has",
			}

			// Create function parameters with the map and the key
			params := &parser.ParamExprList{
				Items: &parser.ColumnExprList{
					Items: []parser.Expr{
						indexOp.Object, // The map name (e.g., "attributes")
						indexOp.Index,  // The key (e.g., "'http.method'")
					},
				},
			}

			return &parser.FunctionExpr{
				Name:   functionName,
				Params: params,
			}, true, nil
		}

		// Handle direct field comparisons like "field = $variable"
		if ident, ok := e.LeftExpr.(*parser.Ident); ok && !strings.HasPrefix(ident.Name, "$") {
			// For regular columns, we might want to check if the column exists or has a non-null value
			functionName := &parser.Ident{
				Name: "isNotNull",
			}

			// Create function parameters
			params := &parser.ParamExprList{
				Items: &parser.ColumnExprList{
					Items: []parser.Expr{
						ident, // The field name
					},
				},
			}

			return &parser.FunctionExpr{
				Name:   functionName,
				Params: params,
			}, true, nil
		} else if ident, ok := e.RightExpr.(*parser.Ident); ok && !strings.HasPrefix(ident.Name, "$") {
			// For regular columns, but variable is on the left
			functionName := &parser.Ident{
				Name: "isNotNull",
			}

			params := &parser.ParamExprList{
				Items: &parser.ColumnExprList{
					Items: []parser.Expr{
						ident, // The field name
					},
				},
			}

			return &parser.FunctionExpr{
				Name:   functionName,
				Params: params,
			}, true, nil
		}

		// Handle IN clauses like "field IN ($variables)"
		if e.Operation == "IN" || e.Operation == "NOT IN" {
			if ident, ok := e.LeftExpr.(*parser.Ident); ok && !strings.HasPrefix(ident.Name, "$") {
				// For IN clauses, we might just check if the field exists
				functionName := &parser.Ident{
					Name: "isNotNull",
				}

				params := &parser.ParamExprList{
					Items: &parser.ColumnExprList{
						Items: []parser.Expr{
							ident, // The field name
						},
					},
				}

				return &parser.FunctionExpr{
					Name:   functionName,
					Params: params,
				}, true, nil
			}
		}
	}

	// If we couldn't transform it to an EXISTS check, keep the original
	return expr, false, nil
}
