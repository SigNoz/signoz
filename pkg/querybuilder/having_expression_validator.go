package querybuilder

import (
	"regexp"
	"sort"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	grammar "github.com/SigNoz/signoz/pkg/parser/havingexpression/grammar"
	"github.com/antlr4-go/antlr/v4"
)

// havingExpressionRewriteVisitor walks the parse tree of a HavingExpression in a single
// pass, simultaneously rewriting user-facing references to their SQL column names and
// collecting any references that could not be resolved.
//
// Each visit method reconstructs the expression string for its subtree:
//   - Structural nodes (orExpression, andExpression, comparison, arithmetic) are
//     reconstructed with canonical spacing.
//   - andExpression joins ALL primaries with " AND ", which naturally normalises any
//     implicit-AND adjacency (the old normalizeImplicitAND step).
//   - IdentifierContext looks the name up in columnMap; if found the SQL column name is
//     returned. If the name is already a valid SQL column (TO side of columnMap) it is
//     passed through unchanged. Otherwise it is added to invalid.
//   - FunctionCallContext looks the full call text (without whitespace, since WS is
//     skipped) up in columnMap; if found the SQL column name is returned, otherwise the
//     function name is added to invalid without recursing into its arguments.
//
// Complex columnMap keys whose argument contains nested function calls (e.g.
// "avg(sum(cpu_usage))") cannot be parsed by the grammar, so they are substituted via
// a targeted regex pre-pass in rewriteAndValidate before this visitor runs.
type havingExpressionRewriteVisitor struct {
	columnMap    map[string]string
	validColumns map[string]bool // TO-side values; identifiers already in SQL form pass through
	invalid      []string
	seen         map[string]bool
}

func newHavingExpressionRewriteVisitor(columnMap map[string]string) *havingExpressionRewriteVisitor {
	validColumns := make(map[string]bool, len(columnMap))
	for _, col := range columnMap {
		validColumns[col] = true
	}
	return &havingExpressionRewriteVisitor{
		columnMap:    columnMap,
		validColumns: validColumns,
		seen:         make(map[string]bool),
	}
}

func (v *havingExpressionRewriteVisitor) visitQuery(ctx grammar.IQueryContext) string {
	if ctx.Expression() == nil {
		return ""
	}
	return v.visitExpression(ctx.Expression())
}

func (v *havingExpressionRewriteVisitor) visitExpression(ctx grammar.IExpressionContext) string {
	return v.visitOrExpression(ctx.OrExpression())
}

func (v *havingExpressionRewriteVisitor) visitOrExpression(ctx grammar.IOrExpressionContext) string {
	andExprs := ctx.AllAndExpression()
	parts := make([]string, len(andExprs))
	for i, ae := range andExprs {
		parts[i] = v.visitAndExpression(ae)
	}
	return strings.Join(parts, " OR ")
}

// visitAndExpression joins ALL primaries with " AND ".
// The grammar rule `primary ( AND primary | primary )*` allows adjacent primaries
// without an explicit AND (implicit AND). Joining all of them with " AND " here is
// equivalent to the old normalizeImplicitAND step.
func (v *havingExpressionRewriteVisitor) visitAndExpression(ctx grammar.IAndExpressionContext) string {
	primaries := ctx.AllPrimary()
	parts := make([]string, len(primaries))
	for i, p := range primaries {
		parts[i] = v.visitPrimary(p)
	}
	return strings.Join(parts, " AND ")
}

func (v *havingExpressionRewriteVisitor) visitPrimary(ctx grammar.IPrimaryContext) string {
	if ctx.OrExpression() != nil {
		inner := v.visitOrExpression(ctx.OrExpression())
		if ctx.NOT() != nil {
			return "NOT (" + inner + ")"
		}
		return "(" + inner + ")"
	}
	if ctx.Comparison() == nil {
		return ""
	}
	inner := v.visitComparison(ctx.Comparison())
	if ctx.NOT() != nil {
		return "NOT (" + inner + ")"
	}
	return inner
}

func (v *havingExpressionRewriteVisitor) visitComparison(ctx grammar.IComparisonContext) string {
	lhs := v.visitOperand(ctx.Operand(0))
	op := ctx.CompOp().GetText()
	rhs := v.visitOperand(ctx.Operand(1))
	return lhs + " " + op + " " + rhs
}

func (v *havingExpressionRewriteVisitor) visitOperand(ctx grammar.IOperandContext) string {
	if ctx.Operand() != nil {
		left := v.visitOperand(ctx.Operand())
		right := v.visitTerm(ctx.Term())
		op := "+"
		if ctx.MINUS() != nil {
			op = "-"
		}
		return left + " " + op + " " + right
	}
	return v.visitTerm(ctx.Term())
}

func (v *havingExpressionRewriteVisitor) visitTerm(ctx grammar.ITermContext) string {
	if ctx.Term() != nil {
		left := v.visitTerm(ctx.Term())
		right := v.visitFactor(ctx.Factor())
		op := "*"
		if ctx.SLASH() != nil {
			op = "/"
		} else if ctx.PERCENT() != nil {
			op = "%"
		}
		return left + " " + op + " " + right
	}
	return v.visitFactor(ctx.Factor())
}

func (v *havingExpressionRewriteVisitor) visitFactor(ctx grammar.IFactorContext) string {
	if ctx.Operand() != nil {
		return "(" + v.visitOperand(ctx.Operand()) + ")"
	}
	if ctx.Atom() == nil {
		return ""
	}
	return v.visitAtom(ctx.Atom())
}

func (v *havingExpressionRewriteVisitor) visitAtom(ctx grammar.IAtomContext) string {
	if ctx.FunctionCall() != nil {
		return v.visitFunctionCall(ctx.FunctionCall())
	}
	if ctx.Identifier() != nil {
		return v.visitIdentifier(ctx.Identifier())
	}
	// NUMBER token
	return ctx.NUMBER().GetText()
}

// visitFunctionCall looks the full call text up in columnMap (WS is skipped so GetText
// has no spaces, e.g. "sum(bytes)"). If found, returns the SQL column name. Otherwise
// records the function name as invalid without recursing into the arguments.
func (v *havingExpressionRewriteVisitor) visitFunctionCall(ctx grammar.IFunctionCallContext) string {
	fullText := ctx.GetText()
	if col, ok := v.columnMap[fullText]; ok {
		return col
	}
	funcName := ctx.IDENTIFIER().GetText()
	if !v.seen[funcName] {
		v.invalid = append(v.invalid, funcName)
		v.seen[funcName] = true
	}
	return fullText
}

// visitIdentifier looks the identifier up in columnMap. If found, returns the SQL
// column name. If the name is already a valid SQL column (validColumns), it is passed
// through unchanged — this handles cases where the user writes the SQL column name
// directly (e.g. __result_0). Otherwise records it as invalid.
func (v *havingExpressionRewriteVisitor) visitIdentifier(ctx grammar.IIdentifierContext) string {
	name := ctx.IDENTIFIER().GetText()
	if col, ok := v.columnMap[name]; ok {
		return col
	}
	if v.validColumns[name] {
		return name
	}
	if !v.seen[name] {
		v.invalid = append(v.invalid, name)
		v.seen[name] = true
	}
	return name
}

// preSubstituteComplexKeys applies regex substitution for columnMap entries whose keys
// cannot be parsed by the grammar. Specifically, a function-call key whose argument
// part itself contains parentheses (e.g. "avg(sum(cpu_usage))") is a nested call that
// the grammar's functionArg rule (IDENTIFIER only) cannot represent. These keys are
// substituted before ANTLR parsing so the resulting expression is grammar-valid.
//
// Keys are applied longest-first to avoid partial replacements.
func (r *HavingExpressionRewriter) preSubstituteComplexKeys(expression string) string {
	type kv struct{ k, v string }
	var pairs []kv
	for k, v := range r.columnMap {
		if isNestedFunctionCallKey(k) {
			pairs = append(pairs, kv{k, v})
		}
	}
	if len(pairs) == 0 {
		return expression
	}
	sort.Slice(pairs, func(i, j int) bool { return len(pairs[i].k) > len(pairs[j].k) })
	for _, p := range pairs {
		pat := regexp.MustCompile(`\b` + regexp.QuoteMeta(p.k))
		expression = pat.ReplaceAllString(expression, p.v)
	}
	return expression
}

// isNestedFunctionCallKey returns true for keys that look like a function call whose
// argument contains another function call (e.g. "avg(sum(cpu_usage))").
func isNestedFunctionCallKey(key string) bool {
	idx := strings.IndexByte(key, '(')
	if idx < 0 {
		return false
	}
	return strings.ContainsRune(key[idx+1:], '(')
}

// rewriteAndValidate is the single-pass implementation used by all RewriteFor* methods.
//
// Validation layers:
//  1. Quoted string literals detected in the expression → descriptive error.
//  2. The visitor runs on the parse tree, rewriting and collecting invalid references.
//     Unknown references (including unrecognised function calls) → lists valid references.
//  3. ANTLR syntax errors → error with messages referencing the original token names.
func (r *HavingExpressionRewriter) rewriteAndValidate(expression string) (string, error) {
	// Layer 1 – reject quoted string literals.
	for _, ch := range expression {
		if ch == '\'' || ch == '"' {
			return "", errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"`Having` expression contains string literals",
			).WithAdditional("Aggregator results are numeric")
		}
	}

	// Pre-substitute any columnMap keys that the grammar cannot parse (nested calls).
	expression = r.preSubstituteComplexKeys(expression)

	// Parse the expression once.
	input := antlr.NewInputStream(expression)
	lexer := grammar.NewHavingExpressionLexer(input)

	lexerErrListener := NewErrorListener()
	lexer.RemoveErrorListeners()
	lexer.AddErrorListener(lexerErrListener)

	tokens := antlr.NewCommonTokenStream(lexer, antlr.TokenDefaultChannel)
	p := grammar.NewHavingExpressionParser(tokens)

	parserErrListener := NewErrorListener()
	p.RemoveErrorListeners()
	p.AddErrorListener(parserErrListener)

	tree := p.Query()

	// Layer 2 – run the combined visitor and report any unresolved references.
	// This runs before the syntax error check so that expressions with recoverable
	// parse errors (e.g. sum(count())) still produce an actionable "invalid reference"
	// message rather than a raw syntax error.
	v := newHavingExpressionRewriteVisitor(r.columnMap)
	result := v.visitQuery(tree)

	if len(v.invalid) > 0 {
		sort.Strings(v.invalid)
		validKeys := make([]string, 0, len(r.columnMap))
		for k := range r.columnMap {
			validKeys = append(validKeys, k)
		}
		sort.Strings(validKeys)
		return "", errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"Invalid references in `Having` expression: [%s]",
			strings.Join(v.invalid, ", "),
		).WithAdditional("Valid references are: [" + strings.Join(validKeys, ", ") + "]")
	}

	// Layer 3 – ANTLR syntax errors. We parse the original expression, so error messages
	// already reference the user's own token names; no re-parsing is needed.
	allSyntaxErrors := append(lexerErrListener.SyntaxErrors, parserErrListener.SyntaxErrors...)
	if len(allSyntaxErrors) > 0 {
		msgs := make([]string, 0, len(allSyntaxErrors))
		for _, se := range allSyntaxErrors {
			if m := se.Error(); m != "" {
				msgs = append(msgs, m)
			}
		}
		detail := strings.Join(msgs, "; ")
		if detail == "" {
			detail = "check the expression syntax"
		}
		return "", errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"Syntax error in `Having` expression",
		).WithAdditional(detail)
	}

	return result, nil
}
