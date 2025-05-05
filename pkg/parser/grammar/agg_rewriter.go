package parser

import (
	"context"
	"fmt"
	"strings"

	clickhouse "github.com/AfterShip/clickhouse-sql-parser/parser"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

// Rewriter rewrites aggregation expressions using user-provided mappers.
type aggExprRewriter struct {
}

var DefaultAggExprRewriter = &aggExprRewriter{}

// Rewrite parses the given aggregation expression, maps the aggregation field to
// table column and condition to valid CH condition expression, and returns the rewritten expression.
func (r *aggExprRewriter) Rewrite(
	exprSQL string,
	fieldKeys map[string][]*telemetrytypes.TelemetryFieldKey,
	fullTextColumn *telemetrytypes.TelemetryFieldKey,
	fieldMapper qbtypes.FieldMapper,
	conditionBuilder qbtypes.ConditionBuilder,
	jsonBodyPrefix string,
	jsonKeyToKey func(context.Context, *telemetrytypes.TelemetryFieldKey, qbtypes.FilterOperator, any) (string, any),
) (string, []any, error) {
	// Wrap in a SELECT so the parser returns a full AST
	wrapped := fmt.Sprintf("SELECT %s", exprSQL)
	p := clickhouse.NewParser(wrapped)
	stmts, err := p.ParseStmts()
	if err != nil {
		return "", nil, fmt.Errorf("error parsing expression %q: %v", exprSQL, err)
	}

	if len(stmts) == 0 {
		return "", nil, fmt.Errorf("no statements found for %q", exprSQL)
	}

	sel, ok := stmts[0].(*clickhouse.SelectQuery)
	if !ok {
		return "", nil, fmt.Errorf("expected SelectQuery, got %T", stmts[0])
	}
	if len(sel.SelectItems) == 0 {
		return "", nil, fmt.Errorf("no SELECT items for %q", exprSQL)
	}

	visitor := newExprVisitor(fieldKeys, fullTextColumn, fieldMapper, conditionBuilder, jsonBodyPrefix, jsonKeyToKey)
	// Rewrite the first select item (our expression)
	if err := sel.SelectItems[0].Accept(visitor); err != nil {
		return "", nil, fmt.Errorf("error rewriting expression %q: %v", exprSQL, err)
	}
	// If nothing changed, return original
	if !visitor.Modified {
		return exprSQL, nil, nil
	}
	// Otherwise emit the rewritten SQL
	return sel.SelectItems[0].String(), visitor.chArgs, nil
}

// exprVisitor walks FunctionExpr nodes and applies the mappers.
type exprVisitor struct {
	clickhouse.DefaultASTVisitor
	fieldKeys        map[string][]*telemetrytypes.TelemetryFieldKey
	fullTextColumn   *telemetrytypes.TelemetryFieldKey
	fieldMapper      qbtypes.FieldMapper
	conditionBuilder qbtypes.ConditionBuilder
	jsonBodyPrefix   string
	jsonKeyToKey     func(context.Context, *telemetrytypes.TelemetryFieldKey, qbtypes.FilterOperator, any) (string, any)
	Modified         bool
	chArgs           []any
}

func newExprVisitor(fieldKeys map[string][]*telemetrytypes.TelemetryFieldKey, fullTextColumn *telemetrytypes.TelemetryFieldKey, fieldMapper qbtypes.FieldMapper, conditionBuilder qbtypes.ConditionBuilder, jsonBodyPrefix string, jsonKeyToKey func(context.Context, *telemetrytypes.TelemetryFieldKey, qbtypes.FilterOperator, any) (string, any)) *exprVisitor {
	return &exprVisitor{fieldKeys: fieldKeys, fullTextColumn: fullTextColumn, fieldMapper: fieldMapper, conditionBuilder: conditionBuilder, jsonBodyPrefix: jsonBodyPrefix, jsonKeyToKey: jsonKeyToKey}
}

// VisitFunctionExpr is invoked for each function call in the AST.
func (v *exprVisitor) VisitFunctionExpr(fn *clickhouse.FunctionExpr) error {
	name := strings.ToLower(fn.Name.Name)
	// If no params, nothing to do
	if fn.Params == nil || fn.Params.Items == nil {
		return nil
	}
	args := fn.Params.Items.Items

	// Handle *If functions with predicate + values
	if strings.HasSuffix(name, "if") && ((name == "countif" && len(args) == 1) || len(args) >= 2) {
		// Map the predicate (first argument)
		origPred := args[0].String()
		whereClause, _, err := PrepareWhereClause(
			origPred,
			v.fieldKeys,
			v.fieldMapper,
			v.conditionBuilder,
			v.fullTextColumn,
			v.jsonBodyPrefix,
			v.jsonKeyToKey,
		)
		if err != nil {
			return fmt.Errorf("failed to parse rewritten predicate %q: %v", origPred, err)
		}
		newPred, chArgs := whereClause.BuildWithFlavor(sqlbuilder.ClickHouse)
		newPred = strings.TrimPrefix(newPred, "WHERE")
		parsedPred, err := parseFragment(newPred)
		if err != nil {
			return fmt.Errorf("failed to parse rewritten predicate %q: %v", newPred, err)
		}
		args[0] = parsedPred
		v.Modified = true
		v.chArgs = chArgs

		// Map each value column argument
		for i := 1; i < len(args); i++ {
			origVal := args[i].String()
			colName, err := v.fieldMapper.GetTableColumnExpression(context.Background(), &telemetrytypes.TelemetryFieldKey{Name: origVal}, v.fieldKeys)
			if err != nil {
				return fmt.Errorf("failed to get table field name for %q: %v", origVal, err)
			}
			newVal := colName
			parsedVal, err := parseFragment(newVal)
			if err != nil {
				return fmt.Errorf("failed to parse rewritten value %q: %v", newVal, err)
			}
			args[i] = parsedVal
			v.Modified = true
		}
	} else {
		// Non-If functions: map every argument as a column/value
		for i, arg := range args {
			orig := arg.String()
			colName, err := v.fieldMapper.GetTableColumnExpression(context.Background(), &telemetrytypes.TelemetryFieldKey{Name: orig}, v.fieldKeys)
			if err != nil {
				return fmt.Errorf("failed to get table field name for %q: %v", orig, err)
			}
			newCol := colName
			parsed, err := parseFragment(newCol)
			if err != nil {
				return fmt.Errorf("failed to parse rewritten arg %q: %v", newCol, err)
			}
			args[i] = parsed
			v.Modified = true
		}
	}
	return nil
}

// parseFragment parses a SQL expression fragment by wrapping in SELECT.
func parseFragment(sql string) (clickhouse.Expr, error) {
	wrapped := fmt.Sprintf("SELECT %s", sql)
	p := clickhouse.NewParser(wrapped)
	stmts, err := p.ParseStmts()
	if err != nil {
		return nil, err
	}
	sel, ok := stmts[0].(*clickhouse.SelectQuery)
	if !ok {
		return nil, fmt.Errorf("expected SelectQuery, got %T", stmts[0])
	}
	if len(sel.SelectItems) == 0 {
		return nil, fmt.Errorf("no select items in fragment %q", sql)
	}
	return sel.SelectItems[0].Expr, nil
}

// RewriteMultiple rewrites a slice of expressions.
func (r *aggExprRewriter) RewriteMultiple(
	exprs []string,
	fieldKeys map[string][]*telemetrytypes.TelemetryFieldKey,
	fullTextColumn *telemetrytypes.TelemetryFieldKey,
	fieldMapper qbtypes.FieldMapper,
	conditionBuilder qbtypes.ConditionBuilder,
	jsonBodyPrefix string,
	jsonKeyToKey func(context.Context, *telemetrytypes.TelemetryFieldKey, qbtypes.FilterOperator, any) (string, any),
) ([]string, [][]any, error) {
	out := make([]string, len(exprs))
	var errs []string
	var chArgsList [][]any
	for i, e := range exprs {
		w, chArgs, err := r.Rewrite(e, fieldKeys, fullTextColumn, fieldMapper, conditionBuilder, jsonBodyPrefix, jsonKeyToKey)
		if err != nil {
			errs = append(errs, fmt.Sprintf("%q: %v", e, err))
			out[i] = e
		} else {
			out[i] = w
			chArgsList = append(chArgsList, chArgs)
		}
	}
	if len(errs) > 0 {
		return out, nil, fmt.Errorf("rewrite errors: %s", strings.Join(errs, "; "))
	}
	return out, chArgsList, nil
}
