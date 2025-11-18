package queryfilterextractor

import (
	"fmt"
	"strings"

	"github.com/AfterShip/clickhouse-sql-parser/parser"
)

// excludedFunctions contains functions that should cause ExtractOriginField to return empty string.
// Map key is the function name in lowercase, value is the original function name.
var excludedFunctions = map[string]string{
	// Time functions
	"now":                     "now",
	"today":                   "today",
	"yesterday":               "yesterday",
	"todatetime":              "toDateTime",
	"todatetime64":            "toDateTime64",
	"todate":                  "toDate",
	"todate32":                "toDate32",
	"tostartofinterval":       "toStartOfInterval",
	"tostartofday":            "toStartOfDay",
	"tostartofweek":           "toStartOfWeek",
	"tostartofmonth":          "toStartOfMonth",
	"tostartofquarter":        "toStartOfQuarter",
	"tostartofyear":           "toStartOfYear",
	"tostartofhour":           "toStartOfHour",
	"tostartofminute":         "toStartOfMinute",
	"tostartofsecond":         "toStartOfSecond",
	"tostartoffiveminutes":    "toStartOfFiveMinutes",
	"tostartoftenminutes":     "toStartOfTenMinutes",
	"tostartoffifteenminutes": "toStartOfFifteenMinutes",
	"tointervalsecond":        "toIntervalSecond",
	"tointervalminute":        "toIntervalMinute",
	"tointervalhour":          "toIntervalHour",
	"tointervalday":           "toIntervalDay",
	"tointervalweek":          "toIntervalWeek",
	"tointervalmonth":         "toIntervalMonth",
	"tointervalquarter":       "toIntervalQuarter",
	"tointervalyear":          "toIntervalYear",
	"parsedatetime":           "parseDateTime",
	"parsedatetimebesteffort": "parseDateTimeBestEffort",

	// Aggregate functions
	"count":          "count",
	"sum":            "sum",
	"avg":            "avg",
	"min":            "min",
	"max":            "max",
	"any":            "any",
	"stddevpop":      "stddevPop",
	"stddevsamp":     "stddevSamp",
	"varpop":         "varPop",
	"varsamp":        "varSamp",
	"grouparray":     "groupArray",
	"groupuniqarray": "groupUniqArray",
	"quantile":       "quantile",
	"quantiles":      "quantiles",
	"quantileexact":  "quantileExact",
	"quantiletiming": "quantileTiming",
	"median":         "median",
	"uniq":           "uniq",
	"uniqexact":      "uniqExact",
	"uniqcombined":   "uniqCombined",
	"uniqhll12":      "uniqHLL12",
	"topk":           "topK",
	"first":          "first",
	"last":           "last",
}

// jsonExtractFunctions contains functions that extract from JSON columns.
// Map key is the function name in lowercase, value is the original function name.
var jsonExtractFunctions = map[string]string{
	"jsonextractstring":        "JSONExtractString",
	"jsonextractint":           "JSONExtractInt",
	"jsonextractuint":          "JSONExtractUInt",
	"jsonextractfloat":         "JSONExtractFloat",
	"jsonextractbool":          "JSONExtractBool",
	"jsonextract":              "JSONExtract",
	"jsonextractraw":           "JSONExtractRaw",
	"jsonextractarrayraw":      "JSONExtractArrayRaw",
	"jsonextractkeysandvalues": "JSONExtractKeysAndValues",
}

// isFunctionPresentInStore checks if a function name exists in the function store map
func isFunctionPresentInStore(funcName string, funcStore map[string]string) bool {
	_, exists := funcStore[strings.ToLower(funcName)]
	return exists
}

// isReservedSelectKeyword checks if a keyword is a reserved keyword for the SELECT statement
// We're only including those which can appear in the SELECT statement without being quoted
func isReservedSelectKeyword(keyword string) bool {
	return strings.ToUpper(keyword) == parser.KeywordSelect || strings.ToUpper(keyword) == parser.KeywordFrom
}

// extractCHOriginField extracts the origin field (column name) from a query string
// or fields getting extracted in case of JSON extraction functions.
func extractCHOriginFieldFromQuery(query string) (string, error) {
	// Parse the query string
	p := parser.NewParser(query)
	stmts, err := p.ParseStmts()
	if err != nil {
		return "", err
	}

	if len(stmts) == 0 {
		return "", fmt.Errorf("no statements found in query")
	}

	// Get the first statement which should be a SELECT
	selectStmt, ok := stmts[0].(*parser.SelectQuery)
	if !ok {
		return "", fmt.Errorf("first statement is not a SELECT query")
	}

	// If query has multiple select items, return blank string as we don't expect multiple select items
	if len(selectStmt.SelectItems) > 1 {
		return "", nil
	}

	if len(selectStmt.SelectItems) == 0 {
		return "", fmt.Errorf("SELECT query has no select items")
	}

	// Extract origin field from the first (and only) select item's expression
	return extractOriginFieldFromExpr(selectStmt.SelectItems[0].Expr)
}

// extractOriginFieldFromExpr extracts the origin field (column name) from an expression.
// This is the internal helper function that contains the original logic.
func extractOriginFieldFromExpr(expr parser.Expr) (string, error) {
	if expr == nil {
		return "", fmt.Errorf("expression is nil")
	}

	// Check if expression contains excluded functions or IF/CASE
	hasExcludedExpressions := false
	hasReservedKeyword := false

	parser.Walk(expr, func(node parser.Expr) bool {
		// exclude reserved keywords because the parser will treat them as valid SQL
		// example: SELECT FROM table here the "FROM" is a reserved keyword,
		// but the parser will treat it as valid SQL
		if ident, ok := node.(*parser.Ident); ok {
			if ident.QuoteType == parser.Unquoted && isReservedSelectKeyword(ident.Name) {
				hasReservedKeyword = true
				return false
			}
		}
		if funcExpr, ok := node.(*parser.FunctionExpr); ok {
			if isFunctionPresentInStore(funcExpr.Name.Name, excludedFunctions) {
				hasExcludedExpressions = true
				return false
			}
			// Check for nested JSON extraction functions
			if isFunctionPresentInStore(funcExpr.Name.Name, jsonExtractFunctions) {
				// Check if any argument contains another JSON extraction function
				if funcExpr.Params != nil && funcExpr.Params.Items != nil {
					for _, arg := range funcExpr.Params.Items.Items {
						if containsJSONExtractFunction(arg) {
							hasExcludedExpressions = true
							return false
						}
					}
				}
			}
		}
		if _, ok := node.(*parser.CaseExpr); ok {
			hasExcludedExpressions = true
			return false
		}
		return true
	})

	// If the expression contains reserved keywords, return error
	if hasReservedKeyword {
		return "", fmt.Errorf("reserved keyword found in query")
	}

	// If the expression contains excluded expressions, return empty string
	if hasExcludedExpressions {
		return "", nil
	}

	// Extract all column names from the expression
	columns := extractColumns(expr)

	// If we found exactly one unique column, return it
	if len(columns) == 1 {
		return columns[0], nil
	}

	// Multiple columns or no columns - return empty string
	return "", nil
}

// containsJSONExtractFunction checks if an expression contains a JSON extraction function
func containsJSONExtractFunction(expr parser.Expr) bool {
	if expr == nil {
		return false
	}

	found := false
	parser.Walk(expr, func(node parser.Expr) bool {
		if funcExpr, ok := node.(*parser.FunctionExpr); ok {
			if isFunctionPresentInStore(funcExpr.Name.Name, jsonExtractFunctions) {
				found = true
				return false
			}
		}
		return true
	})

	return found
}

// extractColumns recursively extracts all unique column names from an expression.
// Note: String literals are also considered as origin fields and will be included in the result.
func extractColumns(expr parser.Expr) []string {
	if expr == nil {
		return nil
	}

	columnMap := make(map[string]bool)
	extractColumnsHelper(expr, columnMap)

	// Convert map to slice
	columns := make([]string, 0, len(columnMap))
	for col := range columnMap {
		columns = append(columns, col)
	}

	return columns
}

// extractColumnsHelper is a recursive helper that finds all column references.
// Note: String literals are also considered as origin fields and will be added to the columnMap.
func extractColumnsHelper(expr parser.Expr, columnMap map[string]bool) {
	if expr == nil {
		return
	}

	switch n := expr.(type) {
	case *parser.Ident:
		// Add identifiers as column references
		columnMap[n.Name] = true

	case *parser.FunctionExpr:
		// Special handling for JSON extraction functions
		// In case of nested JSON extraction, we return blank values (handled at top level)
		if isFunctionPresentInStore(n.Name.Name, jsonExtractFunctions) {
			// For JSON functions, extract from the second argument (the JSON path/key being extracted)
			// The first argument is the column name, the second is the exact data being extracted
			// The extracted data (second argument) is treated as the origin field
			if n.Params != nil && n.Params.Items != nil && len(n.Params.Items.Items) >= 2 {
				secondArg := n.Params.Items.Items[1]
				// If the second argument is a string literal, use its value as the origin field
				// String literals are considered as origin fields
				if strLit, ok := secondArg.(*parser.StringLiteral); ok {
					columnMap[strLit.Literal] = true
				} else {
					// Otherwise, try to extract columns from it
					extractColumnsHelper(secondArg, columnMap)
				}
			}
			return
		}

		// For regular functions, recursively process all arguments
		// Don't mark the function name itself as a column
		if n.Params != nil && n.Params.Items != nil {
			for _, item := range n.Params.Items.Items {
				extractColumnsHelper(item, columnMap)
			}
		}

	case *parser.BinaryOperation:
		extractColumnsHelper(n.LeftExpr, columnMap)
		extractColumnsHelper(n.RightExpr, columnMap)

	case *parser.ColumnExpr:
		extractColumnsHelper(n.Expr, columnMap)

	case *parser.CastExpr:
		extractColumnsHelper(n.Expr, columnMap)

	case *parser.ParamExprList:
		if n.Items != nil {
			extractColumnsHelper(n.Items, columnMap)
		}

	case *parser.ColumnExprList:
		for _, item := range n.Items {
			extractColumnsHelper(item, columnMap)
		}

	case *parser.StringLiteral:
		// String literals are considered as origin fields
		columnMap[n.Literal] = true
		return

	// Support for columns like table.column_name
	case *parser.Path:
		if len(n.Fields) > 0 {
			extractColumnsHelper(n.Fields[len(n.Fields)-1], columnMap)
		}
		return

	// Add more cases as needed for other expression types

	default:
		// For unknown types, return empty (don't extract columns)
		return
	}
}
