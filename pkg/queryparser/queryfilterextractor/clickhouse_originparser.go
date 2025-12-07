package queryfilterextractor

import (
	"strings"

	"github.com/AfterShip/clickhouse-sql-parser/parser"
	"github.com/SigNoz/signoz/pkg/errors"
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
		return "", errors.NewInternalf(errors.CodeInternal, "failed to parse origin field from query: %s", err.Error())
	}

	// Get the first statement which should be a SELECT
	selectStmt := stmts[0].(*parser.SelectQuery)

	// If query has multiple select items, return blank string as we don't expect multiple select items
	if len(selectStmt.SelectItems) > 1 {
		return "", nil
	}

	if len(selectStmt.SelectItems) == 0 {
		return "", errors.NewInternalf(errors.CodeInternal, "SELECT query has no select items")
	}

	// Extract origin field from the first (and only) select item's expression
	return extractOriginFieldFromExpr(selectStmt.SelectItems[0].Expr)
}

// extractOriginFieldFromExpr extracts the origin field (column name) from an expression.
// This is the internal helper function that contains the original logic.
func extractOriginFieldFromExpr(expr parser.Expr) (string, error) {
	// Check if expression contains excluded functions or IF/CASE
	hasExcludedExpressions := false
	hasReservedKeyword := false

	parser.Walk(expr, func(node parser.Expr) bool {
		// exclude reserved keywords because the parser will treat them as valid SQL
		// example: SELECT FROM table here the "FROM" is a reserved keyword,
		// but the parser will treat it as valid column to be extracted.
		if ident, ok := node.(*parser.Ident); ok {
			if ident.QuoteType == parser.Unquoted && isReservedSelectKeyword(ident.Name) {
				hasReservedKeyword = true
				return false
			}
		}
		// for functions, we need to check if the function is excluded function or a JSON extraction function with nested JSON extraction
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
		return "", errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "reserved keyword found in select clause")
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
	switch n := expr.(type) {
	// Ident is a simple identifier like "region" or "timestamp"
	case *parser.Ident:
		// Add identifiers as column references
		columnMap[n.Name] = true

	// FunctionExpr is a function call like "toDate(timestamp)", "JSONExtractString(labels, 'service.name')"
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

		// For regular functions, recursively process all arguments, ex: lower(name)
		if n.Params != nil && n.Params.Items != nil {
			for _, item := range n.Params.Items.Items {
				extractColumnsHelper(item, columnMap)
			}
		}

	// BinaryOperation is a binary operation like "region = 'us-east-1'" or "unix_milli / 1000"
	case *parser.BinaryOperation:
		extractColumnsHelper(n.LeftExpr, columnMap)
		extractColumnsHelper(n.RightExpr, columnMap)

	// ColumnExpr is a column expression like "m.region", "service.name"
	case *parser.ColumnExpr:
		extractColumnsHelper(n.Expr, columnMap)

	// CastExpr is a cast expression like "CAST(unix_milli AS String)"
	case *parser.CastExpr:
		extractColumnsHelper(n.Expr, columnMap)

	case *parser.ParamExprList:
		if n.Items != nil {
			extractColumnsHelper(n.Items, columnMap)
		}

		// Ex: coalesce(cpu_usage, 0) + coalesce(mem_usage, 0)
	case *parser.ColumnExprList:
		for _, item := range n.Items {
			extractColumnsHelper(item, columnMap)
		}

	// StringLiteral is a string literal like "us-east-1" or "cpu.usage"
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
