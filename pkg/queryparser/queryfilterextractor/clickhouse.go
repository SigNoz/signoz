package queryfilterextractor

import (
	"fmt"
	"strings"

	clickhouse "github.com/AfterShip/clickhouse-sql-parser/parser"
	"github.com/SigNoz/signoz/pkg/errors"
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
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to parse clickhouse query: %s", err.Error())
	}

	result := &FilterResult{MetricNames: []string{}, GroupByColumns: []ColumnInfo{}}

	metricNames := make(map[string]bool)

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
			e.fillMetricNamesFromExpr(node, metricNames)
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

	// Extract GROUP BY with aliases and origins from the CTEs and subqueries using recursive approach
	// Use a map to handle duplicates (last ColumnInfo wins across queries)
	groupByColumnsMap := make(map[string]ColumnInfo) // column name -> ColumnInfo
	visited := make(map[*clickhouse.SelectQuery]bool)
	for query := range topLevelQueries {
		columns, err := e.extractGroupByColumns(query, cteMap, visited)
		if err != nil {
			return nil, err
		}
		for _, col := range columns {
			// Last column info wins for duplicate columns across multiple queries
			groupByColumnsMap[col.Name] = col
		}
	}

	// Convert sets to slices
	for metric := range metricNames {
		result.MetricNames = append(result.MetricNames, metric)
	}

	// Build GroupByColumns from the map
	for _, colInfo := range groupByColumnsMap {
		result.GroupByColumns = append(result.GroupByColumns, colInfo)
	}

	return result, nil
}

// ========================================
// Metric Name Extraction
// ========================================

// fillMetricNamesFromExpr extracts metric names from various node types
func (e *ClickHouseFilterExtractor) fillMetricNamesFromExpr(node clickhouse.Expr, metricNames map[string]bool) {

	switch n := node.(type) {
	case *clickhouse.BinaryOperation:
		e.fillMetricFromBinaryOp(n, metricNames)
	}
}

// fillMetricFromBinaryOp extracts metrics from binary operations
func (e *ClickHouseFilterExtractor) fillMetricFromBinaryOp(op *clickhouse.BinaryOperation, metricNames map[string]bool) {
	// Check if left side is metric_name column
	leftCol := e.getColumnName(op.LeftExpr)
	rightCol := e.getColumnName(op.RightExpr)

	// Handle metric_name on left side: metric_name = 'value'
	if leftCol == MetricNameColumn {
		e.fillMetricWithBinaryOpConditions(op, op.RightExpr, metricNames)
		return
	}

	// Handle metric_name on right side: 'value' = metric_name
	if rightCol == MetricNameColumn {
		e.fillMetricWithBinaryOpConditions(op, op.LeftExpr, metricNames)
		return
	}
}

// fillMetricWithBinaryOpConditions extracts metric names from the value side of a binary operation
//
// Supported operators:
//   - "=", "==": Extracts literal string values or values from any() function
//   - "IN", "GLOBAL IN": Extracts all literal string values from the list
//
// Unsupported operators (can be added later if needed):
//   - "!=", "<>", "NOT IN": Negative filters. (e.g., metric_name != 'a')
//   - "LIKE", "ILIKE": Pattern matching filters
//   - "NOT LIKE", "NOT ILIKE": Negative pattern matching filters
//   - "OR", "AND": Boolean operators as the Walk function will automatically traverse both sides
//     of OR/AND operations and extract metrics from each branch. (e.g., metric_name='a' OR metric_name='b')
func (e *ClickHouseFilterExtractor) fillMetricWithBinaryOpConditions(op *clickhouse.BinaryOperation, valueExpr clickhouse.Expr, metricNames map[string]bool) {
	switch op.Operation {
	case clickhouse.TokenKindSingleEQ, clickhouse.TokenKindDoubleEQ:
		// metric_name = 'value' or metric_name = any(['a', 'b'])
		// Skip if value side is a function call (function-wrapped literals are ignored, test case: CH59)
		if fn, ok := valueExpr.(*clickhouse.FunctionExpr); ok {
			// Only handle any() function, skip others like lowercase('cpu')
			if fn.Name != nil && fn.Name.Name == "any" {
				e.extractInValues(valueExpr, metricNames)
			}
			// Otherwise skip function-wrapped literals
		} else if val := e.extractStringLiteral(valueExpr); val != "" {
			metricNames[val] = true
		}
	case "IN", "GLOBAL IN":
		// metric_name IN ('a', 'b', 'c')
		// GLOBAL IN behaves the same as IN for metric extraction purposes
		// Skip if value side is a function call (function-wrapped literals are ignored, test case: CH59)
		if _, ok := valueExpr.(*clickhouse.FunctionExpr); !ok {
			e.extractInValues(valueExpr, metricNames)
		}
	}
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

// ========================================
// GROUP BY Column Extraction
// ========================================

// extractGroupByColumns extracts the GROUP BY columns from a query
// It follows the top-down approach where outer GROUP BY overrides inner GROUP BY in subqueries and CTEs.
// Returns a slice of ColumnInfo with column names, aliases, and origins
func (e *ClickHouseFilterExtractor) extractGroupByColumns(query *clickhouse.SelectQuery, cteMap map[string]*clickhouse.SelectQuery, visited map[*clickhouse.SelectQuery]bool) ([]ColumnInfo, error) {
	if visited[query] {
		return nil, nil
	}

	// Mark this query as visited to prevent cycles
	visited[query] = true

	// First, check if this query has its own GROUP BY using direct field access
	hasGroupBy := query.GroupBy != nil

	// If this query has GROUP BY, use it (outer overrides inner)
	if hasGroupBy {
		// Extract GROUP BY columns
		tempGroupBy := make(map[string]bool)
		e.fillGroupsFromGroupByClause(query.GroupBy, tempGroupBy)

		// Extract SELECT columns and their aliases from the same query level
		selectAliases := e.extractSelectColumns(query)

		// Build ColumnInfo array by matching GROUP BY with SELECT aliases and origins
		result := []ColumnInfo{}

		for groupByCol := range tempGroupBy {
			alias := selectAliases[groupByCol] // Will be "" if not in SELECT

			// Extract originExpr by tracing back through queries
			originVisited := make(map[*clickhouse.SelectQuery]bool)
			originExpr := e.extractColumnOrigin(groupByCol, query, cteMap, originVisited)
			originField, err := extractCHOriginFieldFromQuery(fmt.Sprintf("SELECT %s", originExpr))
			if err != nil {
				return nil, err
			}

			result = append(result, ColumnInfo{
				Name:        groupByCol,
				Alias:       alias,
				OriginExpr:  originExpr,
				OriginField: originField,
			})
		}
		return result, nil
	}

	// If no GROUP BY in this query, follow CTE/subquery references
	// It might have grouping inside the CTE/subquery
	sourceQuery := e.extractSourceQuery(query, cteMap)
	if sourceQuery != nil {
		return e.extractGroupByColumns(sourceQuery, cteMap, visited)
	}

	return nil, nil
}

// fillGroupsFromGroupByClause extracts GROUP BY columns from a specific GroupByClause and fills the map with the column names
func (e *ClickHouseFilterExtractor) fillGroupsFromGroupByClause(groupByClause *clickhouse.GroupByClause, groupBy map[string]bool) {

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
		// Extract each expression from the list - these are top-level only
		if exprList.Items != nil {
			for _, item := range exprList.Items {
				groupKey := e.extractColumnStrByExpr(item)
				if groupKey != "" {
					// Strip table alias if present (e.g., "m.region" -> "region")
					groupKey = e.stripTableAlias(groupKey)
					groupBy[groupKey] = true
				}
			}
		}
	}

}

// extractColumnStrByExpr extracts the complete string representation of different expression types
// Supports:
//   - Ident: Simple identifier like "region" or "timestamp"
//   - FunctionExpr: Function call like "toDate(timestamp)"
//   - ColumnExpr: Column expression like "m.region", "toDate(timestamp)"
//   - Other expression types: Return the string representation of the expression
//
// For example:
//   - "region" -> "region"
//   - "toDate(timestamp)" -> "toDate(timestamp)"
//   - "`m.region`" -> "`m.region`"
func (e *ClickHouseFilterExtractor) extractColumnStrByExpr(expr clickhouse.Expr) string {
	if expr == nil {
		return ""
	}

	switch ex := expr.(type) {
	// Ident is a simple identifier like "region" or "timestamp"
	case *clickhouse.Ident:
		// Handling for backticks which are native to ClickHouse and used for literal names.
		// CH Parser removes the backticks from the identifier, so we need to add them back.
		if ex.QuoteType == clickhouse.BackTicks {
			return "`" + ex.Name + "`"
		}
		return ex.Name
	// FunctionExpr is a function call like "toDate(timestamp)"
	case *clickhouse.FunctionExpr:
		// For function expressions, return the complete function call string
		return ex.String()
	// ColumnExpr is a column expression like "m.region", "toDate(timestamp)"
	case *clickhouse.ColumnExpr:
		// ColumnExpr wraps another expression - extract the underlying expression
		if ex.Expr != nil {
			return e.extractColumnStrByExpr(ex.Expr)
		}
		return ex.String()
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

	// split the name by dot and return the last part
	parts := strings.Split(name, ".")
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
	case *clickhouse.Path:
		// Handle Path type for qualified column names like "m.metric_name"
		// Extract the last field which is the column name
		if len(ex.Fields) > 0 {
			return ex.Fields[len(ex.Fields)-1].Name
		}
		return ""
	}
	return ""
}

// extractSourceQuery extracts the SelectQuery from FROM expressions
// Handles CTE references, subqueries, and table expressions
// For example: from the below query We'll try to extract the name of the source query
// which in the below case is "aggregated". Once we find it we return the SelectQuery node
// from the cteMap, which acts as the source for the GROUP BY extraction.
//
//	 WITH aggregated AS (
//		SELECT region as region_alias, sum(value) AS total
//		FROM metrics
//		WHERE metric_name = 'cpu_usage'
//		GROUP BY region
//	 )
//	 SELECT * FROM aggregated
func (e *ClickHouseFilterExtractor) extractSourceQuery(query *clickhouse.SelectQuery, cteMap map[string]*clickhouse.SelectQuery) *clickhouse.SelectQuery {
	if query.From == nil {
		return nil
	}

	// Find the FROM clause and extract the source
	fromExprs := clickhouse.FindAll(query.From, func(node clickhouse.Expr) bool {
		switch node.(type) {
		case *clickhouse.Ident, *clickhouse.SelectQuery:
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
		case *clickhouse.SelectQuery:
			// Direct subquery
			return expr
		}
	}

	return nil
}

// ========================================
// Column Origin Tracing
// ========================================

// extractColumnOrigin recursively traces a column back to its original expression
// Returns the original expression string (e.g., "JSONExtractString(labels, 'service.name')")
// or the column name itself if it's a direct column reference
func (e *ClickHouseFilterExtractor) extractColumnOrigin(
	columnName string,
	query *clickhouse.SelectQuery,
	cteMap map[string]*clickhouse.SelectQuery,
	visited map[*clickhouse.SelectQuery]bool,
) string {
	if query == nil {
		return columnName
	}

	// Prevent infinite recursion and redundant work
	// Once a query is visited, we don't need to check it again
	if visited[query] {
		return columnName
	}
	visited[query] = true
	// this is to prevent infinite recursion in a single query search
	// but we don't want this to affect the other queries searches
	// so we delete it after the search is done for current query
	defer delete(visited, query)

	// Step 1: Search in CTE and Joins, this will take us to very end of the SubQueries and CTE
	sourceQuery := e.extractSourceQuery(query, cteMap)
	if sourceQuery != nil {
		returningOrigin := e.extractColumnOrigin(columnName, sourceQuery, cteMap, visited)
		if returningOrigin != columnName {
			return returningOrigin
		}
	}

	// Step 2: Once we're sure there are no SubQueries and CTE we just find all the selectItem
	// and then get their column origin values
	selectItems := clickhouse.FindAll(query, func(node clickhouse.Expr) bool {
		_, ok := node.(*clickhouse.SelectItem)
		return ok
	})

	// extractOriginFromSelectItem extracts the origin from a SelectItem
	extractOriginFromSelectItem := func(selectItem *clickhouse.SelectItem) *string {
		// Check if this SelectItem matches our column (by alias or by name)
		alias := e.extractSelectItemAlias(selectItem)
		exprStr := e.extractSelectItemName(selectItem)
		normalizedExpr := e.stripTableAlias(exprStr)

		// Case 1: Column matches an alias in SELECT
		if alias == columnName {
			// This is an alias - get the expression it's aliasing
			if selectItem.Expr != nil {
				originExpr := e.extractFullExpression(selectItem.Expr)
				// If the expression is just a column name, trace it back further
				if normalizedExpr == columnName || e.isSimpleColumnReference(selectItem.Expr) {
					// It's referencing another column - trace back through source query
					sourceQuery := e.extractSourceQuery(query, cteMap)
					if sourceQuery != nil {
						originExpr := e.extractColumnOrigin(normalizedExpr, sourceQuery, cteMap, visited)
						return &originExpr
					}
				}
				return &originExpr
			}
		}

		// Case 2: Column matches the expression itself (no alias)
		if normalizedExpr == columnName {
			// Check if this is a simple column reference or a complex expression
			if e.isSimpleColumnReference(selectItem.Expr) {
				// Simple column - trace back through source query
				sourceQuery := e.extractSourceQuery(query, cteMap)
				if sourceQuery != nil {
					originExpr := e.extractColumnOrigin(columnName, sourceQuery, cteMap, visited)
					return &originExpr
				}
				return &columnName
			} else {
				// Complex expression - return it as origin
				originExpr := e.extractFullExpression(selectItem.Expr)
				return &originExpr
			}
		}
		return nil
	}

	var finalColumnOrigin string
	for _, itemNode := range selectItems {
		if selectItem, ok := itemNode.(*clickhouse.SelectItem); ok {
			// We call the extractOriginFromSelectItem function for each SelectItem
			// and if the origin is not nil, we set the finalColumnOrigin to the origin
			// this has to be done to get to the most nested origin of column where selectItem is present
			origin := extractOriginFromSelectItem(selectItem)
			if origin != nil {
				finalColumnOrigin = *origin
			}
		}
	}
	if finalColumnOrigin != "" {
		return finalColumnOrigin
	}

	return columnName
}

// extractFullExpression extracts the complete string representation of an expression
func (e *ClickHouseFilterExtractor) extractFullExpression(expr clickhouse.Expr) string {
	if expr == nil {
		return ""
	}
	return expr.String()
}

// isSimpleColumnReference checks if an expression is just a simple column reference
// (not a function call or complex expression)
func (e *ClickHouseFilterExtractor) isSimpleColumnReference(expr clickhouse.Expr) bool {
	if expr == nil {
		return false
	}
	switch ex := expr.(type) {
	case *clickhouse.Ident:
		// backticks are treated as non simple column reference
		// so that we can return the origin expression with backticks
		// origin parser will handle the backticks and extract the column name from it
		if ex.QuoteType == clickhouse.BackTicks {
			return false
		}
		return true
	case *clickhouse.Path:
		return true
	case *clickhouse.ColumnExpr:
		// Check if it wraps a simple reference
		if ex.Expr != nil {
			return e.isSimpleColumnReference(ex.Expr)
		}
	}
	return false
}

// ========================================
// SELECT Column Alias Extraction
// ========================================

// extractSelectColumns extracts column names and their aliases from SELECT clause of a specific query
// Returns a map where key is normalized column name and value is the alias
// For duplicate columns with different aliases, the last alias wins
// This follows the same pattern as extractGroupFromGroupByClause - finding direct children only
func (e *ClickHouseFilterExtractor) extractSelectColumns(query *clickhouse.SelectQuery) map[string]string {
	aliasMap := make(map[string]string)

	if query == nil {
		return aliasMap
	}

	// Find SelectItem nodes which represent columns in the SELECT clause
	// SelectItem has an Expr field (the column/expression) and an Alias field
	selectItems := clickhouse.FindAll(query, func(node clickhouse.Expr) bool {
		_, ok := node.(*clickhouse.SelectItem)
		return ok
	})

	// Process each SelectItem and extract column name and alias
	for _, itemNode := range selectItems {
		if selectItem, ok := itemNode.(*clickhouse.SelectItem); ok {
			// Extract the column name/expression from SelectItem.Expr
			columnName := e.extractSelectItemName(selectItem)
			if columnName == "" {
				continue
			}

			// Normalize column name (strip table alias)
			normalizedName := e.stripTableAlias(columnName)

			// Extract alias from SelectItem.Alias
			alias := e.extractSelectItemAlias(selectItem)

			// Store in map - last alias wins for duplicates
			aliasMap[normalizedName] = alias
		}
	}

	return aliasMap
}

// extractSelectItemName extracts the column name or expression from a SelectItem
func (e *ClickHouseFilterExtractor) extractSelectItemName(selectItem *clickhouse.SelectItem) string {
	if selectItem == nil || selectItem.Expr == nil {
		return ""
	}

	return e.extractColumnStrByExpr(selectItem.Expr)
}

// extractSelectItemAlias extracts the alias from a SelectItem
// Returns empty string if no alias is present
func (e *ClickHouseFilterExtractor) extractSelectItemAlias(selectItem *clickhouse.SelectItem) string {
	if selectItem == nil || selectItem.Alias == nil {
		return ""
	}

	// The Alias field is an *Ident (pointer type)
	if selectItem.Alias.Name != "" {
		return selectItem.Alias.Name
	}

	return ""
}

// ========================================
// CTE and Subquery Extraction
// ========================================

// buildCTEMap builds a map of CTE names to their SelectQuery nodes by recursively
// traversing all queries and their nested expressions
func (e *ClickHouseFilterExtractor) buildCTEMap(query *clickhouse.SelectQuery, cteMap map[string]*clickhouse.SelectQuery) {

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

// extractCTEName extracts the CTE name from a CTEStmt, the Expr field is the name of the CTE
func (e *ClickHouseFilterExtractor) extractCTEName(cte *clickhouse.CTEStmt) string {
	if cte == nil || cte.Expr == nil {
		return ""
	}

	switch name := cte.Expr.(type) {
	case *clickhouse.Ident:
		return name.Name
	default:
		return cte.Expr.String()
	}
}

// extractCTEQuery extracts the SelectQuery from a CTEStmt, the Alias field is the SelectQuery
func (e *ClickHouseFilterExtractor) extractCTEQuery(cte *clickhouse.CTEStmt) *clickhouse.SelectQuery {
	if cte == nil || cte.Alias == nil {
		return nil
	}

	// The Alias field should contain a SelectQuery
	if selectQuery, ok := cte.Alias.(*clickhouse.SelectQuery); ok {
		return selectQuery
	}

	return nil
}

// buildCTEMapFromExpr recursively extracts CTEs from various expression types
func (e *ClickHouseFilterExtractor) buildCTEMapFromExpr(expr clickhouse.Expr, cteMap map[string]*clickhouse.SelectQuery) {

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
