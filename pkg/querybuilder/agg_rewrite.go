package querybuilder

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	chparser "github.com/AfterShip/clickhouse-sql-parser/parser"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
)

const filterPredicatePlaceholderPrefix = "__signoz_predicate_"

type aggExprRewriter struct {
	logger         *slog.Logger
	fullTextColumn *telemetrytypes.TelemetryFieldKey
	storage        qbtypes.Storage
	flagger        flagger.Flagger
	signal         telemetrytypes.Signal
}

var _ qbtypes.AggExprRewriter = (*aggExprRewriter)(nil)

func NewAggExprRewriter(
	settings factory.ProviderSettings,
	fullTextColumn *telemetrytypes.TelemetryFieldKey,
	storage qbtypes.Storage,
	fl flagger.Flagger,
	signal telemetrytypes.Signal,
) *aggExprRewriter {
	set := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/querybuilder/agg_rewrite")

	return &aggExprRewriter{
		logger:         set.Logger(),
		fullTextColumn: fullTextColumn,
		storage:        storage,
		flagger:        fl,
		signal:         signal,
	}
}

// Rewrite parses the given aggregation expression, maps the column, and condition to
// valid data source column and condition expression, and returns the rewritten expression
// and the args if the parametric aggregation function is used.
func (r *aggExprRewriter) Rewrite(
	ctx context.Context,
	orgID valuer.UUID,
	startNs uint64,
	endNs uint64,
	expr string,
	rateInterval uint64,
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
) (string, []any, error) {

	predicates := map[string]string{}
	wrapped := fmt.Sprintf("SELECT %s", extractFilterPredicates(expr, predicates))
	p := chparser.NewParser(wrapped)
	stmts, err := p.ParseStmts()

	if err != nil {
		return "", nil, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "failed to parse aggregation expression %q", expr)
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

	visitor := &exprVisitor{
		ctx:            ctx,
		query:          NewQueryInfo(ctx, orgID, r.flagger, r.signal, nil, startNs, endNs),
		logger:         r.logger,
		fieldKeys:      keys,
		fullTextColumn: r.fullTextColumn,
		storage:        r.storage,
		predicates:     predicates,
	}
	// Rewrite the first select item (our expression)
	if err := sel.SelectItems[0].Accept(visitor); err != nil {
		return "", nil, err
	}

	if visitor.isRate {
		return fmt.Sprintf("%s/%d", chparser.Format(sel.SelectItems[0]), rateInterval), visitor.chArgs, nil
	}
	return chparser.Format(sel.SelectItems[0]), visitor.chArgs, nil
}

// RewriteMulti rewrites a slice of expressions.
func (r *aggExprRewriter) RewriteMulti(
	ctx context.Context,
	orgID valuer.UUID,
	startNs uint64,
	endNs uint64,
	exprs []string,
	rateInterval uint64,
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
) ([]string, [][]any, error) {
	out := make([]string, len(exprs))
	var errs []error
	var chArgsList [][]any
	for i, e := range exprs {
		w, chArgs, err := r.Rewrite(ctx, orgID, startNs, endNs, e, rateInterval, keys)
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

// exprVisitor walks FunctionExpr nodes and resolves and renders their
// arguments.
type exprVisitor struct {
	ctx   context.Context
	query qbtypes.QueryInfo
	chparser.DefaultASTVisitor
	logger         *slog.Logger
	fieldKeys      map[string][]*telemetrytypes.TelemetryFieldKey
	fullTextColumn *telemetrytypes.TelemetryFieldKey
	storage        qbtypes.Storage
	predicates     map[string]string
	Modified       bool
	chArgs         []any
	isRate         bool
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
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid number of arguments for %q: %d", name, len(args))
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
		origPred, ok := v.predicates[chparser.Format(args[len(args)-1])]
		if !ok {
			return errors.NewInternalf(errors.CodeInternal, "predicate of %q was not extracted before parsing", name)
		}
		whereClause, err := PrepareWhereClause(
			origPred,
			FilterExprVisitorOpts{
				Context:        v.ctx,
				Query:          v.query,
				Storage:        v.storage,
				Logger:         v.logger,
				FieldKeys:      v.fieldKeys,
				FullTextColumn: v.fullTextColumn,
			},
		)
		if err != nil {
			return err
		}
		// not possible for whereClause to be empty here but still adding a check.
		if whereClause.IsEmpty() {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid predicate argument for %q: %q", name, origPred)
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
			origVal := chparser.Format(args[i])
			fieldKey := telemetrytypes.GetFieldKeyFromKeyText(origVal)
			expr, err := ResolveColumn(v.ctx, v.query, v.storage, &fieldKey, dataType, v.fieldKeys)
			if err != nil {
				return errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "failed to get table field name for %q", origVal)
			}
			newVal := sqlbuilder.Escape(expr)
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
			orig := chparser.Format(arg)
			fieldKey := telemetrytypes.GetFieldKeyFromKeyText(orig)
			expr, err := ResolveColumn(v.ctx, v.query, v.storage, &fieldKey, dataType, v.fieldKeys)
			if err != nil {
				return err
			}
			newCol := sqlbuilder.Escape(expr)
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

// extractFilterPredicates replaces the predicate of every filtered aggregation
// with a placeholder kept in predicates, because the ClickHouse parser cannot
// read the filter grammar (EXISTS, CONTAINS, keys with hyphens). Unbalanced
// input is returned unchanged for the parser to reject.
func extractFilterPredicates(expr string, predicates map[string]string) string {
	var out strings.Builder
	written := 0
	for i := 0; i < len(expr); i++ {
		c := expr[i]
		if c == '\'' || c == '"' || c == '`' {
			end := skipQuoted(expr, i)
			if end < 0 {
				return expr
			}
			i = end
			continue
		}
		if !isIdentifierStart(c) || (i > 0 && (isIdentifierPart(expr[i-1]) || expr[i-1] == '.')) {
			continue
		}
		nameEnd := i
		for nameEnd < len(expr) && isIdentifierPart(expr[nameEnd]) {
			nameEnd++
		}
		open := nameEnd
		for open < len(expr) && strings.ContainsRune(" \t\r\n", rune(expr[open])) {
			open++
		}
		aggFunc, ok := AggreFuncMap[valuer.NewString(strings.ToLower(expr[i:nameEnd]))]
		if !ok || !aggFunc.FuncCombinator || open == len(expr) || expr[open] != '(' {
			i = nameEnd - 1
			continue
		}
		lastComma, closing := scanArguments(expr, open)
		if closing < 0 {
			return expr
		}
		predicateStart := open + 1
		if lastComma >= 0 {
			predicateStart = lastComma + 1
		}
		if predicate := strings.TrimSpace(expr[predicateStart:closing]); predicate != "" {
			placeholder := fmt.Sprintf("%s%d", filterPredicatePlaceholderPrefix, len(predicates))
			predicates[placeholder] = predicate
			out.WriteString(expr[written : open+1])
			out.WriteString(extractFilterPredicates(expr[open+1:predicateStart], predicates))
			out.WriteString(placeholder)
			written = closing
		}
		i = closing
	}
	out.WriteString(expr[written:])
	return out.String()
}

// scanArguments returns the last top-level comma and the closing parenthesis
// of the argument list that opens at open, or -1 for either when absent.
func scanArguments(expr string, open int) (int, int) {
	lastComma, depth := -1, 0
	for i := open + 1; i < len(expr); i++ {
		switch expr[i] {
		case '\'', '"', '`':
			end := skipQuoted(expr, i)
			if end < 0 {
				return -1, -1
			}
			i = end
		case '(', '[':
			depth++
		case ']':
			depth--
		case ')':
			if depth == 0 {
				return lastComma, i
			}
			depth--
		case ',':
			if depth == 0 {
				lastComma = i
			}
		}
	}
	return -1, -1
}

// skipQuoted returns the index of the quote closing the one at start, honoring
// backslash escapes and doubled quotes, or -1 when it is unterminated.
func skipQuoted(expr string, start int) int {
	quote := expr[start]
	for i := start + 1; i < len(expr); i++ {
		switch {
		case expr[i] == '\\':
			i++
		case expr[i] == quote && i+1 < len(expr) && expr[i+1] == quote:
			i++
		case expr[i] == quote:
			return i
		}
	}
	return -1
}

func isIdentifierStart(c byte) bool {
	return c == '_' || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')
}

func isIdentifierPart(c byte) bool {
	return isIdentifierStart(c) || (c >= '0' && c <= '9')
}
