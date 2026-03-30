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
		if isComplexKey(k) {
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

// isComplexKey returns true for keys that the ANTLR grammar cannot parse directly and
// therefore need regex pre-substitution before parsing. This covers:
//   - Nested function calls: "avg(sum(cpu_usage))" — the functionArg rule only accepts IDENTIFIER.
//   - Keys containing quoted strings: "countif(level = \"error\")" — the grammar has no string-literal token.
func isComplexKey(key string) bool {
	if strings.ContainsAny(key, `'"`) {
		return true
	}
	_, after, found := strings.Cut(key, "(")
	return found && strings.ContainsRune(after, '(')
}

// rewriteAndValidate is the single-pass implementation used by all RewriteFor* methods.
//
// Validation layers:
//  0. Complex columnMap keys (nested calls, quoted-string arguments) are substituted via
//     regex before parsing, so references like countif(level="error") survive into step 1.
//  1. Quoted string literals that remain after step 0 are not valid aggregation references
//     → descriptive error ("aggregator results are numeric").
//  2. The visitor runs on the parse tree, rewriting and collecting invalid references.
//     Unknown references (including unrecognised function calls) → lists valid references.
//  3. ANTLR syntax errors → error with messages referencing the original token names.
func (r *HavingExpressionRewriter) rewriteAndValidate(expression string) (string, error) {
	// Save the user-visible expression before pre-substitution for use in suggestions.
	original := strings.TrimSpace(expression)

	// Pre-substitute any columnMap keys that the grammar cannot parse (nested calls,
	// quoted-string arguments, etc.) before checking for bare string literals.
	expression = r.preSubstituteComplexKeys(expression)

	// Layer 1 – reject quoted string literals that were not part of a valid aggregation key.
	for _, ch := range expression {
		if ch == '\'' || ch == '"' {
			return "", errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"`Having` expression contains string literals",
			).WithAdditional("Aggregator results are numeric")
		}
	}

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
		additional := []string{detail}
		// For single-error expressions, try to produce an actionable suggestion.
		if len(allSyntaxErrors) == 1 {
			if s := havingSuggestion(allSyntaxErrors[0], original); s != "" {
				additional = append(additional, "Suggestion: `"+s+"`")
			}
		}
		return "", errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"Syntax error in `Having` expression",
		).WithAdditional(additional...)
	}

	return result, nil
}

// havingSuggestion returns a corrected expression string to show as a suggestion when
// the error matches a well-known single-mistake pattern, or "" when no suggestion
// can be formed. Only call this when there is exactly one syntax error.
//
// Recognised patterns (all produce a minimal, valid completion):
//  1. Bare aggregation — comparison operator expected at EOF:    count()            → count() > 0
//  2. Missing right operand after comparison op at EOF:          count() >          → count() > 0
//  3. Unclosed parenthesis — only ) expected at EOF:             (total > 100       → (total > 100)
//  4. Dangling AND/OR at end of expression:                      total > 100 AND    → total > 100
//  5. Leading OR at position 0:                                  OR total > 100     → total > 100
func havingSuggestion(se *SyntaxErr, original string) string {
	trimmed := strings.TrimSpace(original)
	upper := strings.ToUpper(trimmed)

	if se.TokenTxt == "EOF" {
		// Pattern 1: bare aggregation reference — comparison operator is expected.
		// e.g.  count()  →  count() > 0
		if expectedContains(se, ">") {
			return trimmed + " > 0"
		}

		// Pattern 2: comparison operator already written but right operand missing.
		// e.g.  count() >  →  count() > 0
		if expectedContains(se, "number") && endsWithComparisonOp(trimmed) {
			return trimmed + " 0"
		}

		// Pattern 3: unclosed parenthesis — only ) (and possibly ,) expected.
		// e.g.  (total > 100 AND count() < 500  →  (total > 100 AND count() < 500)
		if expectedContains(se, ")") && !expectedContains(se, "number") {
			return trimmed + ")"
		}

		// Pattern 4: dangling AND or OR at end of expression.
		// e.g.  total > 100 AND  →  total > 100
		if strings.HasSuffix(upper, " AND") {
			return strings.TrimSpace(trimmed[:len(trimmed)-4])
		}
		if strings.HasSuffix(upper, " OR") {
			return strings.TrimSpace(trimmed[:len(trimmed)-3])
		}

		return ""
	}

	// Pattern 5: leading OR at position 0.
	// e.g.  OR total > 100  →  total > 100
	if se.TokenTxt == "'OR'" && se.Col == 0 && strings.HasPrefix(upper, "OR ") {
		return strings.TrimSpace(trimmed[3:])
	}

	return ""
}

// expectedContains reports whether label is present in se.Expected.
func expectedContains(se *SyntaxErr, label string) bool {
	for _, e := range se.Expected {
		if e == label {
			return true
		}
	}
	return false
}

// endsWithComparisonOp reports whether s ends with a comparison operator token
// (longer operators are checked first to avoid ">=" being matched by ">").
func endsWithComparisonOp(s string) bool {
	for _, op := range []string{">=", "<=", "!=", "<>", "==", ">", "<", "="} {
		if strings.HasSuffix(s, op) {
			return true
		}
	}
	return false
}
