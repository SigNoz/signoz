package querybuilder

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	chparser "github.com/AfterShip/clickhouse-sql-parser/parser"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
)

type aggExprRewriter struct {
	logger           *slog.Logger
	fullTextColumn   *telemetrytypes.TelemetryFieldKey
	fieldMapper      qbtypes.FieldMapper
	conditionBuilder qbtypes.ConditionBuilder
	jsonBodyPrefix   string
	jsonKeyToKey     qbtypes.JsonKeyToFieldFunc
}

var _ qbtypes.AggExprRewriter = (*aggExprRewriter)(nil)

func NewAggExprRewriter(
	settings factory.ProviderSettings,
	fullTextColumn *telemetrytypes.TelemetryFieldKey,
	fieldMapper qbtypes.FieldMapper,
	conditionBuilder qbtypes.ConditionBuilder,
	jsonBodyPrefix string,
	jsonKeyToKey qbtypes.JsonKeyToFieldFunc,
) *aggExprRewriter {
	set := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/querybuilder/agg_rewrite")

	return &aggExprRewriter{
		logger:           set.Logger(),
		fullTextColumn:   fullTextColumn,
		fieldMapper:      fieldMapper,
		conditionBuilder: conditionBuilder,
		jsonBodyPrefix:   jsonBodyPrefix,
		jsonKeyToKey:     jsonKeyToKey,
	}
}

// Rewrite parses the given aggregation expression, maps the column, and condition to
// valid data source column and condition expression, and returns the rewritten expression
// and the args if the parametric aggregation function is used.
func (r *aggExprRewriter) Rewrite(
	ctx context.Context,
	expr string,
	rateInterval uint64,
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
) (string, []any, error) {

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

	visitor := newExprVisitor(r.logger, keys,
		r.fullTextColumn,
		r.fieldMapper,
		r.conditionBuilder,
		r.jsonBodyPrefix,
		r.jsonKeyToKey,
	)
	// Rewrite the first select item (our expression)
	if err := sel.SelectItems[0].Accept(visitor); err != nil {
		return "", nil, err
	}

	if visitor.isRate {
		return fmt.Sprintf("%s/%d", sel.SelectItems[0].String(), rateInterval), visitor.chArgs, nil
	}
	return sel.SelectItems[0].String(), visitor.chArgs, nil
}

// RewriteMulti rewrites a slice of expressions.
func (r *aggExprRewriter) RewriteMulti(
	ctx context.Context,
	exprs []string,
	rateInterval uint64,
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
) ([]string, [][]any, error) {
	out := make([]string, len(exprs))
	var errs []error
	var chArgsList [][]any
	for i, e := range exprs {
		w, chArgs, err := r.Rewrite(ctx, e, rateInterval, keys)
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
	logger           *slog.Logger
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
	logger *slog.Logger,
	fieldKeys map[string][]*telemetrytypes.TelemetryFieldKey,
	fullTextColumn *telemetrytypes.TelemetryFieldKey,
	fieldMapper qbtypes.FieldMapper,
	conditionBuilder qbtypes.ConditionBuilder,
	jsonBodyPrefix string,
	jsonKeyToKey qbtypes.JsonKeyToFieldFunc,
) *exprVisitor {
	return &exprVisitor{
		logger:           logger,
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
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "unrecognized function: %s", name)
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

	dataType := telemetrytypes.FieldDataTypeString
	if aggFunc.Numeric {
		dataType = telemetrytypes.FieldDataTypeFloat64
	}

	// Handle *If functions with predicate + values
	if aggFunc.FuncCombinator {
		// Map the predicate (last argument)
		origPred := args[len(args)-1].String()
        whereClause, err := PrepareWhereClause(
			origPred,
			FilterExprVisitorOpts{
				Logger:           v.logger,
				FieldKeys:        v.fieldKeys,
				FieldMapper:      v.fieldMapper,
				ConditionBuilder: v.conditionBuilder,
				FullTextColumn:   v.fullTextColumn,
				JsonBodyPrefix:   v.jsonBodyPrefix,
				JsonKeyToKey:     v.jsonKeyToKey,
            }, 0, 0,
		)
		if err != nil {
			return err
		}

		newPred, chArgs := whereClause.WhereClause.BuildWithFlavor(sqlbuilder.ClickHouse)
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
			fieldKey := telemetrytypes.GetFieldKeyFromKeyText(origVal)
			expr, exprArgs, err := CollisionHandledFinalExpr(context.Background(), &fieldKey, v.fieldMapper, v.conditionBuilder, v.fieldKeys, dataType, v.jsonBodyPrefix, v.jsonKeyToKey)
			if err != nil {
				return errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "failed to get table field name for %q", origVal)
			}
			v.chArgs = append(v.chArgs, exprArgs...)
			newVal := expr
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
			fieldKey := telemetrytypes.GetFieldKeyFromKeyText(orig)
			expr, exprArgs, err := CollisionHandledFinalExpr(context.Background(), &fieldKey, v.fieldMapper, v.conditionBuilder, v.fieldKeys, dataType, v.jsonBodyPrefix, v.jsonKeyToKey)
			if err != nil {
				return err
			}
			v.chArgs = append(v.chArgs, exprArgs...)
			newCol := expr
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
