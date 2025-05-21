package querybuilder

import (
	"context"
	"fmt"
	"strings"

	chparser "github.com/AfterShip/clickhouse-sql-parser/parser"
	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
)

type AggExprRewriterOptions struct {
	FieldKeys        map[string][]*telemetrytypes.TelemetryFieldKey
	FullTextColumn   *telemetrytypes.TelemetryFieldKey
	FieldMapper      qbtypes.FieldMapper
	ConditionBuilder qbtypes.ConditionBuilder
	JsonBodyPrefix   string
	JsonKeyToKey     qbtypes.JsonKeyToFieldFunc
	RateInterval     uint64
}

type aggExprRewriter struct {
	opts AggExprRewriterOptions
}

func NewAggExprRewriter(opts AggExprRewriterOptions) *aggExprRewriter {
	return &aggExprRewriter{opts: opts}
}

// Rewrite parses the given aggregation expression, maps the column, and condition to
// valid data source column and condition expression, and returns the rewritten expression
// and the args if the parametric aggregation function is used.
func (r *aggExprRewriter) Rewrite(expr string) (string, []any, error) {
	wrapped := fmt.Sprintf("SELECT %s", expr)
	p := chparser.NewParser(wrapped)
	stmts, err := p.ParseStmts()

	if err != nil {
		return "", nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to parse aggregation expression %q", expr)
	}

	if len(stmts) == 0 {
		return "", nil, errors.NewInternalf(errors.CodeInternal, "no statements found for %q", expr)
	}

	sel, ok := stmts[0].(*chparser.SelectQuery)
	if !ok {
		return "", nil, errors.NewInternalf(errors.CodeInternal, "expected SelectQuery, got %T", stmts[0])
	}

	if len(sel.SelectItems) == 0 {
		return "", nil, errors.NewInternalf(errors.CodeInternal, "no SELECT items for %q", expr)
	}

	visitor := newExprVisitor(r.opts.FieldKeys,
		r.opts.FullTextColumn,
		r.opts.FieldMapper,
		r.opts.ConditionBuilder,
		r.opts.JsonBodyPrefix,
		r.opts.JsonKeyToKey,
	)
	// Rewrite the first select item (our expression)
	if err := sel.SelectItems[0].Accept(visitor); err != nil {
		return "", nil, err
	}
	// If nothing changed, return original
	if !visitor.Modified {
		return expr, nil, nil
	}

	if visitor.isRate {
		return fmt.Sprintf("%s/%d", sel.SelectItems[0].String(), r.opts.RateInterval), visitor.chArgs, nil
	}
	return sel.SelectItems[0].String(), visitor.chArgs, nil
}

// RewriteMultiple rewrites a slice of expressions.
func (r *aggExprRewriter) RewriteMultiple(
	exprs []string,
) ([]string, [][]any, error) {
	out := make([]string, len(exprs))
	var errs []error
	var chArgsList [][]any
	for i, e := range exprs {
		w, chArgs, err := r.Rewrite(e)
		if err != nil {
			errs = append(errs, err)
			out[i] = e
		} else {
			out[i] = w
			chArgsList = append(chArgsList, chArgs)
		}
	}
	if len(errs) > 0 {
		return out, nil, errors.Join(errs...)
	}
	return out, chArgsList, nil
}

// exprVisitor walks FunctionExpr nodes and applies the mappers.
type exprVisitor struct {
	chparser.DefaultASTVisitor
	fieldKeys        map[string][]*telemetrytypes.TelemetryFieldKey
	fullTextColumn   *telemetrytypes.TelemetryFieldKey
	fieldMapper      qbtypes.FieldMapper
	conditionBuilder qbtypes.ConditionBuilder
	jsonBodyPrefix   string
	jsonKeyToKey     qbtypes.JsonKeyToFieldFunc
	Modified         bool
	chArgs           []any
	isRate           bool
}

func newExprVisitor(
	fieldKeys map[string][]*telemetrytypes.TelemetryFieldKey,
	fullTextColumn *telemetrytypes.TelemetryFieldKey,
	fieldMapper qbtypes.FieldMapper,
	conditionBuilder qbtypes.ConditionBuilder,
	jsonBodyPrefix string,
	jsonKeyToKey qbtypes.JsonKeyToFieldFunc,
) *exprVisitor {
	return &exprVisitor{
		fieldKeys:        fieldKeys,
		fullTextColumn:   fullTextColumn,
		fieldMapper:      fieldMapper,
		conditionBuilder: conditionBuilder,
		jsonBodyPrefix:   jsonBodyPrefix,
		jsonKeyToKey:     jsonKeyToKey,
	}
}

// VisitFunctionExpr is invoked for each function call in the AST.
func (v *exprVisitor) VisitFunctionExpr(fn *chparser.FunctionExpr) error {
	name := strings.ToLower(fn.Name.Name)

	aggFunc, ok := AggreFuncMap[valuer.NewString(name)]
	if !ok {
		return nil
	}

	var args []chparser.Expr
	if fn.Params != nil && fn.Params.Items != nil {
		args = fn.Params.Items.Items
	}

	// if we know aggregation function, we must ensure that the number of arguments is correct
	if aggFunc.RequireArgs {
		if len(args) < aggFunc.MinArgs || len(args) > aggFunc.MaxArgs {
			return errors.NewInternalf(errors.CodeInternal, "invalid number of arguments for %q: %d", name, len(args))
		}
	}
	fn.Name.Name = aggFunc.FuncName
	if aggFunc.Rate {
		v.isRate = true
	}

	// Handle *If functions with predicate + values
	if aggFunc.FuncCombinator {
		// Map the predicate (last argument)
		origPred := args[len(args)-1].String()
		whereClause, _, err := PrepareWhereClause(
			origPred,
			FilterExprVisitorOpts{
				FieldKeys:        v.fieldKeys,
				FieldMapper:      v.fieldMapper,
				ConditionBuilder: v.conditionBuilder,
				FullTextColumn:   v.fullTextColumn,
				JsonBodyPrefix:   v.jsonBodyPrefix,
				JsonKeyToKey:     v.jsonKeyToKey,
			},
		)
		if err != nil {
			return err
		}

		newPred, chArgs := whereClause.BuildWithFlavor(sqlbuilder.ClickHouse)
		newPred = strings.TrimPrefix(newPred, "WHERE")
		parsedPred, err := parseFragment(newPred)
		if err != nil {
			return err
		}
		args[len(args)-1] = parsedPred
		v.Modified = true
		v.chArgs = chArgs

		// Map each value column argument
		for i := 0; i < len(args)-1; i++ {
			origVal := args[i].String()
			colName, err := v.fieldMapper.ColumnExpressionFor(context.Background(), &telemetrytypes.TelemetryFieldKey{Name: origVal}, v.fieldKeys)
			if err != nil {
				return errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "failed to get table field name for %q", origVal)
			}
			newVal := colName
			parsedVal, err := parseFragment(newVal)
			if err != nil {
				return err
			}
			args[i] = parsedVal
			v.Modified = true
		}
	} else {
		// Non-If functions: map every argument as a column/value
		for i, arg := range args {
			orig := arg.String()
			colName, err := v.fieldMapper.ColumnExpressionFor(context.Background(), &telemetrytypes.TelemetryFieldKey{Name: orig}, v.fieldKeys)
			if err != nil {
				return errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "failed to get table field name for %q", orig)
			}
			newCol := colName
			parsed, err := parseFragment(newCol)
			if err != nil {
				return err
			}
			args[i] = parsed
			v.Modified = true
		}
		if aggFunc.Rate {
			v.Modified = true
		}
	}

	return nil
}

// parseFragment parses a SQL expression fragment by wrapping in SELECT.
func parseFragment(sql string) (chparser.Expr, error) {
	wrapped := fmt.Sprintf("SELECT %s", sql)
	p := chparser.NewParser(wrapped)
	stmts, err := p.ParseStmts()
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to parse re-written expression %q", sql)
	}
	sel, ok := stmts[0].(*chparser.SelectQuery)
	if !ok {
		return nil, errors.NewInternalf(errors.CodeInternal, "unexpected statement type in re-written expression %q: %T", sql, stmts[0])
	}
	if len(sel.SelectItems) == 0 {
		return nil, errors.NewInternalf(errors.CodeInternal, "no select items in re-written expression %q", sql)
	}
	return sel.SelectItems[0].Expr, nil
}
