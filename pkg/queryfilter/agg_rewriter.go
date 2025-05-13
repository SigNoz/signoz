package queryfilter

import (
	"context"
	"fmt"
	"strings"

	chparser "github.com/AfterShip/clickhouse-sql-parser/parser"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
)

type rewriteStep struct {
	valuer.String
}

var (
	rewriteStepParse = rewriteStep{String: valuer.NewString("parse")}
	rewriteStepMap   = rewriteStep{String: valuer.NewString("map")}
	rewriteStepCond  = rewriteStep{String: valuer.NewString("cond")}
)

type RewriteError struct {
	step rewriteStep
	err  error
}

func (e *RewriteError) Error() string {
	return fmt.Sprintf("%s: %v", e.step, e.err)
}

func (e *RewriteError) Unwrap() error {
	return e.err
}

type AggExprRewriterOptions struct {
	MetadataStore    telemetrytypes.MetadataStore
	FullTextColumn   *telemetrytypes.TelemetryFieldKey
	FieldMapper      qbtypes.FieldMapper
	ConditionBuilder qbtypes.ConditionBuilder
	JsonBodyPrefix   string
	JsonKeyToKey     qbtypes.JsonKeyToFieldFunc
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
		return "", nil, &RewriteError{
			step: rewriteStepParse,
			err:  err,
		}
	}

	if len(stmts) == 0 {
		return "", nil, &RewriteError{
			step: rewriteStepParse,
			err:  fmt.Errorf("no statements found for %q", expr),
		}
	}

	sel, ok := stmts[0].(*chparser.SelectQuery)
	if !ok {
		return "", nil, &RewriteError{
			step: rewriteStepParse,
			err:  fmt.Errorf("expected SelectQuery, got %T", stmts[0]),
		}
	}

	if len(sel.SelectItems) == 0 {
		return "", nil, &RewriteError{
			step: rewriteStepParse,
			err:  fmt.Errorf("no SELECT items for %q", expr),
		}
	}

	keysSelectors, err := QueryStringToKeysSelectors(expr)
	if err != nil {
		return "", nil, &RewriteError{
			step: rewriteStepParse,
			err:  err,
		}
	}

	keys, err := r.opts.MetadataStore.GetKeysMulti(context.Background(), keysSelectors)
	if err != nil {
		return "", nil, &RewriteError{
			step: rewriteStepParse,
			err:  err,
		}
	}

	visitor := newExprVisitor(keys,
		r.opts.FullTextColumn,
		r.opts.FieldMapper,
		r.opts.ConditionBuilder,
		r.opts.JsonBodyPrefix,
		r.opts.JsonKeyToKey,
	)
	// Rewrite the first select item (our expression)
	if err := sel.SelectItems[0].Accept(visitor); err != nil {
		return "", nil, fmt.Errorf("error rewriting expression %q: %v", expr, err)
	}
	// If nothing changed, return original
	if !visitor.Modified {
		return expr, nil, nil
	}
	// Otherwise emit the rewritten SQL
	return sel.SelectItems[0].String(), visitor.chArgs, nil
}

// RewriteMultiple rewrites a slice of expressions.
func (r *aggExprRewriter) RewriteMultiple(
	exprs []string,
) ([]string, [][]any, error) {
	out := make([]string, len(exprs))
	var errs []string
	var chArgsList [][]any
	for i, e := range exprs {
		w, chArgs, err := r.Rewrite(e)
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

// exprVisitor walks FunctionExpr nodes and applies the mappers.
type exprVisitor struct {
	chparser.DefaultASTVisitor
	fieldKeys        map[string][]telemetrytypes.TelemetryFieldKey
	fullTextColumn   *telemetrytypes.TelemetryFieldKey
	fieldMapper      qbtypes.FieldMapper
	conditionBuilder qbtypes.ConditionBuilder
	jsonBodyPrefix   string
	jsonKeyToKey     qbtypes.JsonKeyToFieldFunc
	Modified         bool
	chArgs           []any
}

func newExprVisitor(
	fieldKeys map[string][]telemetrytypes.TelemetryFieldKey,
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

	// If no params, nothing to do
	if fn.Params == nil || fn.Params.Items == nil {
		return nil
	}
	args := fn.Params.Items.Items

	// Handle *If functions with predicate + values
	if strings.HasSuffix(name, "if") && ((name == "countif" && len(args) == 1) || len(args) >= 2) {
		// Map the predicate (last argument)
		origPred := args[len(args)-1].String()
		whereClause, _, err := prepareWhereClause(
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
		args[len(args)-1] = parsedPred
		v.Modified = true
		v.chArgs = chArgs

		// Map each value column argument
		for i := 0; i < len(args)-1; i++ {
			origVal := args[i].String()
			colName, err := v.fieldMapper.ColumnExpressionFor(context.Background(), telemetrytypes.TelemetryFieldKey{Name: origVal}, v.fieldKeys)
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
			colName, err := v.fieldMapper.ColumnExpressionFor(context.Background(), telemetrytypes.TelemetryFieldKey{Name: orig}, v.fieldKeys)
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
func parseFragment(sql string) (chparser.Expr, error) {
	wrapped := fmt.Sprintf("SELECT %s", sql)
	p := chparser.NewParser(wrapped)
	stmts, err := p.ParseStmts()
	if err != nil {
		return nil, err
	}
	sel, ok := stmts[0].(*chparser.SelectQuery)
	if !ok {
		return nil, fmt.Errorf("expected SelectQuery, got %T", stmts[0])
	}
	if len(sel.SelectItems) == 0 {
		return nil, fmt.Errorf("no select items in fragment %q", sql)
	}
	return sel.SelectItems[0].Expr, nil
}
