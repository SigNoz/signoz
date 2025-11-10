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

	// Extract GROUP BY only from top-level queries
	for query := range topLevelQueries {
		e.extractGroupBy(query, groupBy)
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
	case "!=", "<>":
		// Skip negative filters per spec
	case "NOT IN":
		// Skip negative filters per spec
	case "LIKE", "ILIKE":
		// Skip pattern filters per spec
	case "NOT LIKE", "NOT ILIKE":
		// Skip pattern filters per spec
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

// extractGroupBy extracts GROUP BY columns from a query, and also PARTITION BY from window functions
func (e *ClickHouseFilterExtractor) extractGroupBy(query *clickhouse.SelectQuery, groupBy map[string]bool) {
	// Find GroupByClause in the query
	groupByClause, found := clickhouse.Find(query, func(node clickhouse.Expr) bool {
		_, ok := node.(*clickhouse.GroupByClause)
		return ok
	})

	if found {
		gb, ok := groupByClause.(*clickhouse.GroupByClause)
		if ok {
			// Extract GROUP BY expressions properly
			// Find only the direct child ColumnExprList, not nested ones
			// We use Find instead of FindAll to get only the first (direct child) ColumnExprList
			exprListNode, foundList := clickhouse.Find(gb, func(node clickhouse.Expr) bool {
				_, ok := node.(*clickhouse.ColumnExprList)
				return ok
			})

			if foundList {
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

			// Note: We only extract from the top-level ColumnExprList.Items to avoid extracting nested parts
			// This prevents extracting 'timestamp' from 'toDate(timestamp)' - we only get 'toDate(timestamp)'
		}
	}

	// Also extract PARTITION BY from window functions
	// Find PartitionByClause nodes directly
	partitionBys := clickhouse.FindAll(query, func(node clickhouse.Expr) bool {
		_, ok := node.(*clickhouse.PartitionByClause)
		return ok
	})

	for _, pbNode := range partitionBys {
		if pb, ok := pbNode.(*clickhouse.PartitionByClause); ok {
			e.extractPartitionByExprs(pb, groupBy)
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
		parts := splitIdentifier(fullName)
		if len(parts) > 1 {
			// Has table alias, return just column name
			return parts[len(parts)-1]
		}
		return fullName
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
func (e *ClickHouseFilterExtractor) stripTableAlias(name string) string {
	parts := splitIdentifier(name)
	if len(parts) > 1 {
		return parts[len(parts)-1]
	}
	return name
}

// extractPartitionByExprs extracts expressions from a PartitionByClause
func (e *ClickHouseFilterExtractor) extractPartitionByExprs(pb *clickhouse.PartitionByClause, groupBy map[string]bool) {
	// Extract identifiers from the partition by clause
	idents := clickhouse.FindAll(pb, func(node clickhouse.Expr) bool {
		_, ok1 := node.(*clickhouse.Ident)
		_, ok2 := node.(*clickhouse.NestedIdentifier)
		return ok1 || ok2
	})

	for _, identNode := range idents {
		if ident, ok := identNode.(*clickhouse.Ident); ok {
			groupBy[ident.Name] = true
		} else if nested, ok := identNode.(*clickhouse.NestedIdentifier); ok {
			groupBy[nested.String()] = true
		}
	}

	// Also find function expressions
	funcs := clickhouse.FindAll(pb, func(node clickhouse.Expr) bool {
		_, ok := node.(*clickhouse.FunctionExpr)
		return ok
	})

	for _, fnNode := range funcs {
		if fn, ok := fnNode.(*clickhouse.FunctionExpr); ok {
			groupBy[fn.String()] = true
		}
	}
}

// getColumnName extracts column name from an expression
func (e *ClickHouseFilterExtractor) getColumnName(expr clickhouse.Expr) string {
	switch ex := expr.(type) {
	case *clickhouse.Ident:
		return ex.Name
	case *clickhouse.NestedIdentifier:
		// Use String() and extract the last part (column name)
		fullName := ex.String()
		parts := splitIdentifier(fullName)
		if len(parts) > 0 {
			return parts[len(parts)-1]
		}
		return fullName
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
