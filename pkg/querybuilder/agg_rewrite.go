package querybuilder

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"unicode"

	chparser "github.com/AfterShip/clickhouse-sql-parser/parser"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	grammar "github.com/SigNoz/signoz/pkg/parser/filterquery/grammar"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/antlr4-go/antlr/v4"
	"github.com/huandu/go-sqlbuilder"
)

const argumentPlaceholderPrefix = "__signoz_argument_"

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

	arguments := map[string]string{}
	wrapped := fmt.Sprintf("SELECT %s", extractArguments(expr, arguments))
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
		arguments:      arguments,
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
	arguments      map[string]string
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

	// count(*) is count()
	if len(args) == 1 && aggFunc.MinArgs == 0 && v.arguments[chparser.Format(args[0])] == "*" {
		fn.Params.Items.Items = nil
		args = nil
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
		origPred, err := v.argumentText(name, args[len(args)-1])
		if err != nil {
			return err
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
		// The search scan budget applies only to the filter.
		if whereClause.RequiresCostGuard {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "%q does not support search(); use search() in the filter", name)
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
		v.chArgs = append(v.chArgs, chArgs...)

		// Map each value column argument
		for i := 0; i < len(args)-1; i++ {
			origVal, err := v.argumentText(name, args[i])
			if err != nil {
				return err
			}
			fieldKey, err := fieldKeyFromArgument(name, origVal)
			if err != nil {
				return err
			}
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
			orig, err := v.argumentText(name, arg)
			if err != nil {
				return err
			}
			fieldKey, err := fieldKeyFromArgument(name, orig)
			if err != nil {
				return err
			}
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

func (v *exprVisitor) argumentText(name string, arg chparser.Expr) (string, error) {
	text, ok := v.arguments[chparser.Format(arg)]
	if !ok {
		return "", errors.NewInternalf(errors.CodeInternal, "argument of %q was not extracted before parsing", name)
	}
	return text, nil
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

// extractArguments replaces every argument of an aggregation call with a
// placeholder kept in arguments, because the ClickHouse parser cannot read
// the filter grammar: predicates such as EXISTS or CONTAINS, and field keys
// with hyphens or slashes. Unbalanced input is returned unchanged for the
// parser to reject.
func extractArguments(expr string, arguments map[string]string) string {
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
		if _, ok := AggreFuncMap[valuer.NewString(strings.ToLower(expr[i:nameEnd]))]; !ok || open == len(expr) || expr[open] != '(' {
			i = nameEnd - 1
			continue
		}
		commas, closing := scanArguments(expr, open)
		if closing < 0 {
			return expr
		}
		out.WriteString(expr[written : open+1])
		bounds := append(append([]int{open}, commas...), closing)
		for j := 1; j < len(bounds); j++ {
			if j > 1 {
				out.WriteString(", ")
			}
			text := strings.TrimSpace(expr[bounds[j-1]+1 : bounds[j]])
			// DISTINCT modifies the whole argument list, so it stays for the parser.
			if end := strings.IndexFunc(text, unicode.IsSpace); j == 1 && end > 0 && strings.EqualFold(text[:end], "DISTINCT") {
				out.WriteString("DISTINCT ")
				text = strings.TrimSpace(text[end:])
			}
			if text == "" {
				continue
			}
			placeholder := fmt.Sprintf("%s%d", argumentPlaceholderPrefix, len(arguments))
			arguments[placeholder] = text
			out.WriteString(placeholder)
		}
		written = closing
		i = closing
	}
	out.WriteString(expr[written:])
	return out.String()
}

// scanArguments returns the top-level commas and the closing parenthesis of
// the argument list that opens at open, with -1 as the closing index when the
// list is unterminated.
func scanArguments(expr string, open int) ([]int, int) {
	var commas []int
	depth := 0
	for i := open + 1; i < len(expr); i++ {
		switch expr[i] {
		case '\'', '"', '`':
			end := skipQuoted(expr, i)
			if end < 0 {
				return nil, -1
			}
			i = end
		case '(', '[':
			depth++
		case ']':
			depth--
		case ')':
			if depth == 0 {
				return commas, i
			}
			depth--
		case ',':
			if depth == 0 {
				commas = append(commas, i)
			}
		}
	}
	return nil, -1
}

// fieldKeyFromArgument reads a value argument as a single key of the filter
// grammar, the lexer that also collects the keys of the expression.
func fieldKeyFromArgument(name string, text string) (telemetrytypes.TelemetryFieldKey, error) {
	lexer := grammar.NewFilterQueryLexer(antlr.NewInputStream(text))
	lexer.RemoveErrorListeners()
	if lexer.NextToken().GetTokenType() != grammar.FilterQueryLexerKEY || lexer.NextToken().GetTokenType() != antlr.TokenEOF {
		return telemetrytypes.TelemetryFieldKey{}, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid argument for %q: %q is not a field name", name, text)
	}
	return telemetrytypes.GetFieldKeyFromKeyText(text), nil
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
