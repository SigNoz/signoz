package queryfilterextractor

import (
	"strings"

	clickhouse "github.com/AfterShip/clickhouse-sql-parser/parser"
)

const (
	// MetricNameColumn is the column name used for filtering metrics
	MetricNameColumn = "metric_name"
)

// ClickHouseFilterExtractor extracts metric names and grouping keys from ClickHouse SQL queries
type ClickHouseFilterExtractor struct{}

// NewClickHouseFilterExtractor creates a new ClickHouse filter extractor
func NewClickHouseFilterExtractor() *ClickHouseFilterExtractor {
	return &ClickHouseFilterExtractor{}
}

// Extract parses a ClickHouse query and extracts metric names and grouping keys
func (e *ClickHouseFilterExtractor) Extract(query string) (*FilterResult, error) {
	p := clickhouse.NewParser(query)
	stmts, err := p.ParseStmts()
	if err != nil {
		return nil, err
	}

	result := &FilterResult{MetricNames: []string{}, GroupBy: []string{}}

	metricNames := make(map[string]bool)
	groupBy := make(map[string]bool)

	// Track top-level queries for GROUP BY extraction
	topLevelQueries := make(map[*clickhouse.SelectQuery]bool)

	// Process all statements
	for _, stmt := range stmts {
		selectQuery, ok := stmt.(*clickhouse.SelectQuery)
		if !ok {
			continue
		}

		// Mark as top-level
		topLevelQueries[selectQuery] = true

		// Walk the AST to extract metrics
		clickhouse.Walk(selectQuery, func(node clickhouse.Expr) bool {
			e.extractFromNode(node, metricNames)
			return true // Continue traversal
		})
	}

	// Extract GROUP BY from the top-level queries by first building a map of CTEs and
	// then recursively extracting the GROUP BY from the CTEs and subqueries.

	// Build CTE map for all top-level queries
	cteMap := make(map[string]*clickhouse.SelectQuery)
	for query := range topLevelQueries {
		e.buildCTEMap(query, cteMap)
	}

	// Extract GROUP BY from the CTEs and subqueries using recursive approach
	visited := make(map[*clickhouse.SelectQuery]bool)
	for query := range topLevelQueries {
		e.extractGroupByRecursive(query, cteMap, groupBy, visited)
	}

	// Convert sets to slices
	for metric := range metricNames {
		result.MetricNames = append(result.MetricNames, metric)
	}
	for groupKey := range groupBy {
		result.GroupBy = append(result.GroupBy, groupKey)
	}

	return result, nil
}

// extractFromNode extracts metric names from various node types
func (e *ClickHouseFilterExtractor) extractFromNode(node clickhouse.Expr, metricNames map[string]bool) {
	if node == nil {
		return
	}

	switch n := node.(type) {
	case *clickhouse.BinaryOperation:
		e.extractFromBinaryOp(n, metricNames)
	}
}

// extractFromBinaryOp extracts metrics from binary operations
func (e *ClickHouseFilterExtractor) extractFromBinaryOp(op *clickhouse.BinaryOperation, metricNames map[string]bool) {
	// Check if left side is metric_name column
	leftCol := e.getColumnName(op.LeftExpr)
	rightCol := e.getColumnName(op.RightExpr)

	// Handle metric_name on left side: metric_name = 'value'
	if leftCol == MetricNameColumn {
		e.extractMetricFromBinaryOp(op, op.RightExpr, metricNames)
		return
	}

	// Handle metric_name on right side: 'value' = metric_name
	if rightCol == MetricNameColumn {
		e.extractMetricFromBinaryOp(op, op.LeftExpr, metricNames)
		return
	}

	// If neither side is metric_name, the Walk function will continue traversing
	// nested nodes automatically, so we don't need to do anything here
}

// extractMetricFromBinaryOp extracts metric names from the value side of a binary operation
func (e *ClickHouseFilterExtractor) extractMetricFromBinaryOp(op *clickhouse.BinaryOperation, valueExpr clickhouse.Expr, metricNames map[string]bool) {
	switch op.Operation {
	case "=", "==":
		// metric_name = 'value' or metric_name = any(['a', 'b'])
		// Skip if value side is a function call (per spec - function-wrapped literals are ignored, CH59)
		if fn, ok := valueExpr.(*clickhouse.FunctionExpr); ok {
			// Only handle any() function, skip others like lowercase('cpu')
			if fn.Name != nil && fn.Name.Name == "any" {
				e.extractFromAnyFunction(valueExpr, metricNames)
			}
			// Otherwise skip function-wrapped literals per spec
		} else if val := e.extractStringLiteral(valueExpr); val != "" {
			metricNames[val] = true
		}
	case "IN":
		// metric_name IN ('a', 'b', 'c')
		// Skip if value side is a function call (per spec - function-wrapped literals are ignored, CH59)
		if _, ok := valueExpr.(*clickhouse.FunctionExpr); !ok {
			e.extractInValues(valueExpr, metricNames)
		}
	case "!=", "<>", "NOT IN", "NOT LIKE", "NOT ILIKE":
		// Skip negative filters for now
	case "LIKE", "ILIKE":
		// Skip pattern filters for now
	case "OR":
		// Handle OR conditions: metric_name='a' OR metric_name='b'
		// The Walk function will traverse both sides, so we don't need to do anything special
	case "AND":
		// Handle AND conditions - Walk will traverse both sides
	case "GLOBAL IN":
		// Handle GLOBAL IN - same as IN for our purposes
		// Skip if value side is a function call (per spec - function-wrapped literals are ignored, CH59)
		if _, ok := valueExpr.(*clickhouse.FunctionExpr); !ok {
			e.extractInValues(valueExpr, metricNames)
		}
	}
}

// extractGroupFromGroupByClause extracts GROUP BY columns from a specific GroupByClause
func (e *ClickHouseFilterExtractor) extractGroupFromGroupByClause(groupByClause *clickhouse.GroupByClause, groupBy map[string]bool) {
	if groupByClause == nil {
		return
	}

	// Extract GROUP BY expressions properly
	// Find only the direct child ColumnExprList, not nested ones
	// We use Find instead of FindAll to get only the first (direct child) ColumnExprList
	exprListNode, foundList := clickhouse.Find(groupByClause, func(node clickhouse.Expr) bool {
		_, ok := node.(*clickhouse.ColumnExprList)
		return ok
	})

	if !foundList {
		return
	}

	// Note: We only extract from the top-level ColumnExprList.Items to avoid extracting nested parts
	// This prevents extracting 'timestamp' from 'toDate(timestamp)' - we only get 'toDate(timestamp)'
	if exprList, ok := exprListNode.(*clickhouse.ColumnExprList); ok {
		seen := make(map[string]bool)
		// Extract each expression from the list - these are top-level only
		if exprList.Items != nil {
			for _, item := range exprList.Items {
				groupKey := e.extractGroupByExpr(item)
				if groupKey != "" {
					// Strip table alias if present (e.g., "m.region" -> "region")
					groupKey = e.stripTableAlias(groupKey)
					if !seen[groupKey] {
						groupBy[groupKey] = true
						seen[groupKey] = true
					}
				}
			}
		}
	}

}

// extractGroupByExpr extracts a single GROUP BY expression as a string
func (e *ClickHouseFilterExtractor) extractGroupByExpr(expr clickhouse.Expr) string {
	if expr == nil {
		return ""
	}

	switch ex := expr.(type) {
	case *clickhouse.Ident:
		// Handling for backticks which are native to ClickHouse and used for literal names.
		// CH Parser removes the backticks from the identifier, so we need to add them back.
		if ex.QuoteType == clickhouse.BackTicks {
			return "`" + ex.Name + "`"
		}
		return ex.Name
	case *clickhouse.NestedIdentifier:
		// For nested identifiers like "m.region" or "toDate(timestamp)"
		// Check if it's actually a function call by looking at the structure
		fullName := ex.String()
		// If it contains parentheses, it might be a function - return as-is
		if strings.Contains(fullName, "(") {
			return fullName
		}
		// Otherwise, extract just the column name (last part) to strip table alias
		return e.stripTableAlias(fullName)
	case *clickhouse.FunctionExpr:
		// For function expressions, return the complete function call string
		return ex.String()
	case *clickhouse.ColumnExpr:
		// ColumnExpr wraps another expression - extract the underlying expression
		if ex.Expr != nil {
			return e.extractGroupByExpr(ex.Expr)
		}
		return ex.String()
	case *clickhouse.AliasExpr:
		// For aliases, use the alias name if available, otherwise underlying expression
		if ex.Alias != nil {
			if ident, ok := ex.Alias.(*clickhouse.Ident); ok {
				return ident.Name
			}
			// If alias is not an Ident, use its string representation
			return ex.Alias.String()
		}
		return e.extractGroupByExpr(ex.Expr)
	default:
		// For other expression types, return the string representation
		return expr.String()
	}
}

// stripTableAlias removes table alias prefix from a column name (e.g., "m.region" -> "region")
// but for literals with backticks, we need preserve the entire string. (e.g., `os.type` -> "os.type")
func (e *ClickHouseFilterExtractor) stripTableAlias(name string) string {
	// Handling for backticks which are native to ClickHouse and used for literal names.
	if strings.HasPrefix(name, "`") && strings.HasSuffix(name, "`") {
		return strings.Trim(name, "`")
	}

	parts := splitIdentifier(name)
	if len(parts) > 1 {
		return parts[len(parts)-1]
	}
	return name
}

// getColumnName extracts column name from an expression
func (e *ClickHouseFilterExtractor) getColumnName(expr clickhouse.Expr) string {
	switch ex := expr.(type) {
	case *clickhouse.Ident:
		return ex.Name
	case *clickhouse.NestedIdentifier:
		// Use String() and extract the last part (column name)
		fullName := ex.String()
		return e.stripTableAlias(fullName)
	case *clickhouse.Path:
		// Handle Path type for qualified column names like "m.metric_name"
		// Extract the last field which is the column name
		if len(ex.Fields) > 0 {
			return ex.Fields[len(ex.Fields)-1].Name
		}
		return ""
	case *clickhouse.AliasExpr:
		// If it's aliased, check the underlying expression
		return e.getColumnName(ex.Expr)
	}
	return ""
}

// splitIdentifier splits a dotted identifier like "table.column" or "alias.column"
func splitIdentifier(ident string) []string {
	// Simple split on dot - may need to handle quoted identifiers in the future
	parts := []string{}
	current := ""
	inQuotes := false
	quoteChar := byte(0)

	for i := 0; i < len(ident); i++ {
		char := ident[i]
		if !inQuotes && (char == '"' || char == '`' || char == '\'') {
			inQuotes = true
			quoteChar = char
		} else if inQuotes && char == quoteChar {
			inQuotes = false
			quoteChar = 0
		} else if !inQuotes && char == '.' {
			if current != "" {
				parts = append(parts, current)
				current = ""
			}
			continue
		}
		current += string(char)
	}
	if current != "" {
		parts = append(parts, current)
	}
	return parts
}

// extractStringLiteral extracts a string literal value from an expression
func (e *ClickHouseFilterExtractor) extractStringLiteral(expr clickhouse.Expr) string {
	switch ex := expr.(type) {
	case *clickhouse.StringLiteral:
		return ex.Literal
	}
	return ""
}

// extractInValues extracts values from IN expressions
func (e *ClickHouseFilterExtractor) extractInValues(expr clickhouse.Expr, metricNames map[string]bool) {
	// Find all string literals in the expression
	strLits := clickhouse.FindAll(expr, func(node clickhouse.Expr) bool {
		// metric_name passed in `in` condition will be string literal.
		_, ok := node.(*clickhouse.StringLiteral)
		return ok
	})

	for _, strLitNode := range strLits {
		if strLit, ok := strLitNode.(*clickhouse.StringLiteral); ok {
			// Unquote the string literal
			val := e.extractStringLiteral(strLit)
			if val != "" {
				metricNames[val] = true
			}
		}
	}
}

// extractFromAnyFunction extracts values from any() function calls like any(['a', 'b'])
func (e *ClickHouseFilterExtractor) extractFromAnyFunction(expr clickhouse.Expr, metricNames map[string]bool) {
	if fn, ok := expr.(*clickhouse.FunctionExpr); ok {
		if fn.Name != nil && fn.Name.Name == "any" {
			// Extract string literals from the function parameters
			e.extractInValues(expr, metricNames)
		}
	}
}

// ========================================
// CTE and Subquery GROUP BY Support
// ========================================

// buildCTEMap builds a map of CTE names to their SelectQuery nodes by recursively
// traversing all queries and their nested expressions
func (e *ClickHouseFilterExtractor) buildCTEMap(query *clickhouse.SelectQuery, cteMap map[string]*clickhouse.SelectQuery) {
	if query == nil {
		return
	}

	// Access CTEs directly from WithClause if it exists
	if query.With != nil && query.With.CTEs != nil {
		for _, cte := range query.With.CTEs {
			cteName := e.extractCTEName(cte)
			cteQuery := e.extractCTEQuery(cte)
			if cteName != "" && cteQuery != nil {
				cteMap[cteName] = cteQuery
				// Recursively build CTE map for nested CTEs
				e.buildCTEMap(cteQuery, cteMap)
			}
		}
	}

	// Also check for CTEs in subqueries and other expressions
	e.buildCTEMapFromExpr(query, cteMap)
}

// buildCTEMapFromExpr recursively extracts CTEs from various expression types
func (e *ClickHouseFilterExtractor) buildCTEMapFromExpr(expr clickhouse.Expr, cteMap map[string]*clickhouse.SelectQuery) {
	if expr == nil {
		return
	}

	// Walk through all nodes to find SelectQuery nodes that might contain CTEs
	clickhouse.Walk(expr, func(node clickhouse.Expr) bool {
		switch n := node.(type) {
		case *clickhouse.SelectQuery:
			// Don't process the same query we started with to avoid infinite recursion
			if n != expr {
				e.buildCTEMap(n, cteMap)
			}
		case *clickhouse.TableExpr:
			if n.Expr != nil {
				e.buildCTEMapFromExpr(n.Expr, cteMap)
			}
		case *clickhouse.JoinTableExpr:
			if n.Table != nil {
				e.buildCTEMapFromExpr(n.Table, cteMap)
			}
		}
		return true // Continue traversal
	})
}

// extractGroupByRecursive implements the recursive GROUP BY extraction logic
// It follows the top-down approach where outer GROUP BY overrides inner GROUP BY
func (e *ClickHouseFilterExtractor) extractGroupByRecursive(query *clickhouse.SelectQuery, cteMap map[string]*clickhouse.SelectQuery, groupBy map[string]bool, visited map[*clickhouse.SelectQuery]bool) {
	if query == nil || visited[query] {
		return
	}

	// Mark this query as visited to prevent cycles
	visited[query] = true

	// First, check if this query has its own GROUP BY using direct field access
	hasGroupBy := query.GroupBy != nil

	// If this query has GROUP BY, use it (outer overrides inner)
	if hasGroupBy {
		tempGroupBy := make(map[string]bool)
		e.extractGroupFromGroupByClause(query.GroupBy, tempGroupBy)
		for key := range tempGroupBy {
			groupBy[key] = true
		}
		return
	}

	// If no GROUP BY in this query, follow CTE/subquery references
	sourceQuery := e.extractSourceQuery(query, cteMap)
	if sourceQuery != nil {
		e.extractGroupByRecursive(sourceQuery, cteMap, groupBy, visited)
	}
}

// extractSourceQuery extracts the SelectQuery from FROM expressions
// Handles CTE references, subqueries, and table expressions
func (e *ClickHouseFilterExtractor) extractSourceQuery(query *clickhouse.SelectQuery, cteMap map[string]*clickhouse.SelectQuery) *clickhouse.SelectQuery {
	if query == nil || query.From == nil {
		return nil
	}

	// Find the FROM clause and extract the source
	fromExprs := clickhouse.FindAll(query.From, func(node clickhouse.Expr) bool {
		switch node.(type) {
		case *clickhouse.Ident, *clickhouse.NestedIdentifier, *clickhouse.SelectQuery, *clickhouse.TableExpr:
			return true
		}
		return false
	})

	for _, fromExpr := range fromExprs {
		switch expr := fromExpr.(type) {
		case *clickhouse.Ident:
			// CTE reference by simple name
			if cteQuery, exists := cteMap[expr.Name]; exists {
				return cteQuery
			}
		case *clickhouse.NestedIdentifier:
			// CTE reference by nested name
			cteName := expr.String()
			if cteQuery, exists := cteMap[cteName]; exists {
				return cteQuery
			}
		case *clickhouse.SelectQuery:
			// Direct subquery
			return expr
		case *clickhouse.TableExpr:
			// Table expression - check if it contains a subquery or CTE reference
			if expr.Expr != nil {
				if subQuery, ok := expr.Expr.(*clickhouse.SelectQuery); ok {
					return subQuery
				}
				// Check for CTE references in table expressions
				if ident, ok := expr.Expr.(*clickhouse.Ident); ok {
					if cteQuery, exists := cteMap[ident.Name]; exists {
						return cteQuery
					}
				}
				if nested, ok := expr.Expr.(*clickhouse.NestedIdentifier); ok {
					cteName := nested.String()
					if cteQuery, exists := cteMap[cteName]; exists {
						return cteQuery
					}
				}
			}
		}
	}

	return nil
}

// extractCTEName extracts the CTE name from a CTEStmt
func (e *ClickHouseFilterExtractor) extractCTEName(cte *clickhouse.CTEStmt) string {
	if cte == nil || cte.Expr == nil {
		return ""
	}

	switch name := cte.Expr.(type) {
	case *clickhouse.Ident:
		return name.Name
	case *clickhouse.NestedIdentifier:
		return name.String()
	default:
		return cte.Expr.String()
	}
}

// extractCTEQuery extracts the SelectQuery from a CTEStmt
func (e *ClickHouseFilterExtractor) extractCTEQuery(cte *clickhouse.CTEStmt) *clickhouse.SelectQuery {
	if cte == nil || cte.Alias == nil {
		return nil
	}

	// The Alias field should contain a SelectQuery
	if selectQuery, ok := cte.Alias.(*clickhouse.SelectQuery); ok {
		return selectQuery
	}

	// In some cases, the query might be wrapped in another expression
	// Try to find a SelectQuery within the expression
	var foundQuery *clickhouse.SelectQuery
	clickhouse.Walk(cte.Alias, func(node clickhouse.Expr) bool {
		if selectQuery, ok := node.(*clickhouse.SelectQuery); ok {
			foundQuery = selectQuery
			return false // Stop traversal
		}
		return true
	})

	return foundQuery
}
