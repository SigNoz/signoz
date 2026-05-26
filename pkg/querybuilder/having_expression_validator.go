package querybuilder

import (
	"sort"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	grammar "github.com/SigNoz/signoz/pkg/parser/havingexpression/grammar"
	"github.com/antlr4-go/antlr/v4"
	"github.com/huandu/go-sqlbuilder"
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
//     The grammar now accepts complex function arguments (nested calls, string predicates),
//     so all aggregation expression forms can be looked up directly via ctx.GetText().
//   - STRING atoms (string literals in comparison position) set hasStringLiteral so a
//     friendly "aggregator results are numeric" error can be returned.
type havingExpressionRewriteVisitor struct {
	columnMap        map[string]string
	validColumns     map[string]bool // TO-side values; identifiers already in SQL form pass through
	invalid          []string
	seen             map[string]bool
	hasStringLiteral bool
	sb               *sqlbuilder.SelectBuilder
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
		sb:           sqlbuilder.NewSelectBuilder(),
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
	if len(parts) == 1 {
		return parts[0]
	}
	return v.sb.Or(parts...)
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
	if len(parts) == 1 {
		return parts[0]
	}
	return v.sb.And(parts...)
}

func (v *havingExpressionRewriteVisitor) visitPrimary(ctx grammar.IPrimaryContext) string {
	if ctx.OrExpression() != nil {
		inner := v.visitOrExpression(ctx.OrExpression())
		if ctx.NOT() != nil {
			return v.sb.Not(inner)
		}
		return v.sb.And(inner)
	}
	if ctx.Comparison() == nil {
		return ""
	}
	inner := v.visitComparison(ctx.Comparison())
	if ctx.NOT() != nil {
		return v.sb.Not(inner)
	}
	return inner
}

func (v *havingExpressionRewriteVisitor) visitComparison(ctx grammar.IComparisonContext) string {
	if ctx.IN() != nil {
		if ctx.Operand(0) == nil || ctx.InList() == nil {
			return ""
		}
		lhs := v.visitOperand(ctx.Operand(0))
		signedNumbers := ctx.InList().AllSignedNumber()
		vals := make([]interface{}, len(signedNumbers))
		for i, n := range signedNumbers {
			vals[i] = sqlbuilder.Raw(n.GetText())
		}
		if ctx.NOT() != nil {
			// Here we need to compile because In generates lhs IN $1 syntax
			sql, _ := v.sb.Args.CompileWithFlavor(v.sb.NotIn(lhs, vals...), sqlbuilder.ClickHouse)
			return sql
		}
		// Here we need to compile because In generates lhs IN $1 syntax
		sql, _ := v.sb.Args.CompileWithFlavor(v.sb.In(lhs, vals...), sqlbuilder.ClickHouse)
		return sql
	}
	if ctx.CompOp() == nil || ctx.Operand(0) == nil || ctx.Operand(1) == nil {
		return ""
	}
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
	if ctx.Factor() != nil {
		// Unary sign: (PLUS | MINUS) factor
		sign := "+"
		if ctx.MINUS() != nil {
			sign = "-"
		}
		return sign + v.visitFactor(ctx.Factor())
	}
	if ctx.Operand() != nil {
		return v.sb.And(v.visitOperand(ctx.Operand()))
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
	if ctx.STRING() != nil {
		// String literals are never valid aggregation results; flag for a friendly error.
		v.hasStringLiteral = true
		return ctx.STRING().GetText()
	}
	text := ctx.NUMBER().GetText()
	return text
}

// visitFunctionCall looks the full call text up in columnMap. WS tokens are skipped by
// the lexer, so ctx.GetText() returns the expression with all whitespace removed
// (e.g. "countIf(level='error')", "avg(sum(cpu_usage))", "count_distinct(a,b)").
// The column map stores both the original expression and a space-stripped version as
// keys, so the lookup is whitespace-insensitive regardless of how the user typed it.
// If not found, the function name is recorded as invalid.
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

// rewriteAndValidate is the single-pass implementation used by all RewriteFor* methods.
//
// Validation layers:
//  1. The visitor runs on the parse tree, rewriting and collecting invalid references.
//     Unknown references (including unrecognised function calls) → lists valid references.
//     The grammar now supports complex function arguments (nested calls, string predicates)
//     so all aggregation expression forms are handled directly by the parser without any
//     regex pre-substitution.
//  2. String literals in comparison-operand position → descriptive error
//     ("aggregator results are numeric").
//  3. ANTLR syntax errors → error with messages referencing the original token names.
func (r *HavingExpressionRewriter) rewriteAndValidate(expression string) (string, error) {
	original := strings.TrimSpace(expression)

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

	// Layer 1 – run the combined visitor and report any unresolved references.
	// This runs before the syntax error check so that expressions with recoverable
	// parse errors (e.g. sum(count())) still produce an actionable "invalid reference"
	// message rather than a raw syntax error.
	v := newHavingExpressionRewriteVisitor(r.columnMap)
	result := v.visitQuery(tree)

	// Layer 2 – string literals in comparison-operand position (atom rule).
	// The grammar accepts STRING tokens in atom so the parser can recover and continue,
	// but the visitor flags them; aggregator results are always numeric.
	// This is checked before invalid references so that "contains string literals" takes
	// priority when a bare string literal is also an unresolvable operand.
	if v.hasStringLiteral {
		return "", errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"`Having` expression contains string literals",
		).WithAdditional("Aggregator results are numeric")
	}

	if len(v.invalid) > 0 {
		sort.Strings(v.invalid)
		validKeys := make([]string, 0, len(r.columnMap))
		for k := range r.columnMap {
			validKeys = append(validKeys, k)
		}
		sort.Strings(validKeys)
		additional := []string{"Valid references are: [" + strings.Join(validKeys, ", ") + "]"}
		if len(v.invalid) == 1 {
			inv := v.invalid[0]
			// Only suggest for plain identifier typos, not for unresolved function
			// calls: a function call will appear as "name(" in the expression, and
			// the closest valid key may itself contain "(" (e.g. "sum(a)"), making
			// a simple string substitution produce a corrupt expression.
			isFuncCall := strings.Contains(original, inv+"(")
			if match, dist := closestMatch(inv, validKeys); !isFuncCall && !strings.Contains(match, "(") && dist <= 3 {
				corrected := strings.ReplaceAll(original, inv, match)
				additional = append(additional, "Suggestion: `"+corrected+"`")
			}
		}
		return "", errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"Invalid references in `Having` expression: [%s]",
			strings.Join(v.invalid, ", "),
		).WithAdditional(additional...)
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
		// Pattern 4: dangling AND or OR at end of expression.
		// e.g.  total > 100 AND  →  total > 100
		// Checked before Pattern 1 so that "expr AND" does not match Pattern 1.
		if strings.HasSuffix(upper, " AND") {
			return strings.TrimSpace(trimmed[:len(trimmed)-4])
		}
		if strings.HasSuffix(upper, " OR") {
			return strings.TrimSpace(trimmed[:len(trimmed)-3])
		}

		// Pattern 1: bare aggregation reference — no comparison operator yet.
		// Detected by: IDENTIFIER in expected (operand-continuation set), expression
		// does not already end with a comparison operator (Pattern 2 handles that case),
		// and no unclosed parenthesis (Pattern 3 handles that case).
		// e.g.  count()     →  count() > 0
		//       total_logs  →  total_logs > 0
		if expectedContains(se, "IDENTIFIER") && !endsWithComparisonOp(trimmed) && !hasUnclosedParen(trimmed) {
			return trimmed + " > 0"
		}

		// Pattern 2: comparison operator already written but right operand missing.
		// e.g.  count() >  →  count() > 0
		if expectedContains(se, "number") && endsWithComparisonOp(trimmed) {
			return trimmed + " 0"
		}

		// Pattern 3: unclosed parenthesis with content inside.
		// e.g.  (total > 100 AND count() < 500  →  (total > 100 AND count() < 500)
		// Guard len > 1 avoids a useless "()" suggestion for a bare "(".
		if expectedContains(se, ")") && hasUnclosedParen(trimmed) && len(trimmed) > 1 {
			return trimmed + ")"
		}

		// Pattern 6: unclosed IN bracket list.
		// e.g.  count() IN [1, 2, 3  →  count() IN [1, 2, 3]
		if expectedContains(se, "]") && hasUnclosedBracket(trimmed) && len(trimmed) > 1 {
			return trimmed + "]"
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

// hasUnclosedParen reports whether s contains more '(' than ')'.
func hasUnclosedParen(s string) bool {
	count := 0
	for _, c := range s {
		switch c {
		case '(':
			count++
		case ')':
			count--
		}
	}
	return count > 0
}

// hasUnclosedBracket reports whether s contains more '[' than ']'.
func hasUnclosedBracket(s string) bool {
	count := 0
	for _, c := range s {
		switch c {
		case '[':
			count++
		case ']':
			count--
		}
	}
	return count > 0
}

// closestMatch returns the element of candidates with the smallest Levenshtein
// distance to query, along with that distance.
func closestMatch(query string, candidates []string) (string, int) {
	best, bestDist := "", -1
	for _, c := range candidates {
		if d := levenshtein(query, c); bestDist < 0 || d < bestDist {
			best, bestDist = c, d
		}
	}
	return best, bestDist
}

// levenshtein computes the edit distance between a and b.
func levenshtein(a, b string) int {
	ra, rb := []rune(a), []rune(b)
	la, lb := len(ra), len(rb)
	row := make([]int, lb+1)
	for j := range row {
		row[j] = j
	}
	for i := 1; i <= la; i++ {
		prev := row[0]
		row[0] = i
		for j := 1; j <= lb; j++ {
			tmp := row[j]
			if ra[i-1] == rb[j-1] {
				row[j] = prev
			} else {
				row[j] = 1 + min(prev, min(row[j], row[j-1]))
			}
			prev = tmp
		}
	}
	return row[lb]
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
