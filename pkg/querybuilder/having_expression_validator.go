package querybuilder

import (
	"sort"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	grammar "github.com/SigNoz/signoz/pkg/parser/grammar/havingexpression"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/antlr4-go/antlr/v4"
)

// havingExpressionSemanticValidator walks a rewritten HavingExpression parse tree and
// validates that every remaining identifier or function-call token is a known SQL column name.
//
// By the time this validator runs, rewriteExpression has already replaced all valid
// user-facing references (aliases, expression strings, __result_N, etc.) with their
// corresponding SQL column names (e.g. __result_0, value). Any identifier or function
// call that survived the rewrite was not in the column map and is therefore invalid.
//
// Validation strategy:
//   - IdentifierContext nodes are checked against validColumns (the SQL column name set).
//   - FunctionCallContext nodes are checked as a unit: if the full call text is not a
//     known SQL column name, the function name is reported as invalid.
//   - FunctionArg children are not visited individually — they are part of a function
//     call unit and are only reported when the whole call is rejected.
type havingExpressionSemanticValidator struct {
	validColumns map[string]bool // SQL column names (the TO side of columnMap)
	invalid      []string        // tokens not recognised as valid SQL columns
	seen         map[string]bool // deduplication
}

func newHavingExpressionSemanticValidator(validColumns map[string]bool) *havingExpressionSemanticValidator {
	return &havingExpressionSemanticValidator{
		validColumns: validColumns,
		seen:         make(map[string]bool),
	}
}

// Visit dispatches on parse-tree node type. Unrecognised nodes recurse into their children.
func (v *havingExpressionSemanticValidator) Visit(tree antlr.ParseTree) {
	switch t := tree.(type) {
	case *grammar.FunctionCallContext:
		// Validate as a single unit; do NOT recurse further so that function-arg
		// IDENTIFIERs are not checked individually.
		v.visitFunctionCall(t)
	case *grammar.IdentifierContext:
		v.visitIdentifier(t)
	default:
		for i := 0; i < tree.GetChildCount(); i++ {
			if child, ok := tree.GetChild(i).(antlr.ParseTree); ok {
				v.Visit(child)
			}
		}
	}
}

// visitFunctionCall checks whether a function call is a known reference. After rewriting,
// all valid function-call references (e.g. "sum(bytes)") have been replaced with SQL
// column names, so any function call seen here was not in the column map. The function
// name is reported as invalid.
func (v *havingExpressionSemanticValidator) visitFunctionCall(ctx *grammar.FunctionCallContext) {
	if v.validColumns[ctx.GetText()] {
		return
	}

	funcName := ctx.IDENTIFIER().GetText()
	if !v.seen[funcName] {
		v.invalid = append(v.invalid, funcName)
		v.seen[funcName] = true
	}
}

// visitIdentifier checks that a bare identifier is a known SQL column name.
// After rewriting, valid references have been replaced (e.g. alias → __result_0),
// so any identifier not in validColumns was not a recognised reference.
func (v *havingExpressionSemanticValidator) visitIdentifier(ctx *grammar.IdentifierContext) {
	name := ctx.IDENTIFIER().GetText()
	if v.validColumns[name] {
		return
	}
	if !v.seen[name] {
		v.invalid = append(v.invalid, name)
		v.seen[name] = true
	}
}

// syntaxErrorMessages parses expression with ANTLR and returns any syntax error strings.
func syntaxErrorMessages(expression string) []string {
	input := antlr.NewInputStream(expression)
	lexer := grammar.NewHavingExpressionLexer(input)
	lexerErr := NewErrorListener()
	lexer.RemoveErrorListeners()
	lexer.AddErrorListener(lexerErr)

	tokens := antlr.NewCommonTokenStream(lexer, antlr.TokenDefaultChannel)
	p := grammar.NewHavingExpressionParser(tokens)
	parserErr := NewErrorListener()
	p.RemoveErrorListeners()
	p.AddErrorListener(parserErr)

	p.Query()

	all := append(lexerErr.SyntaxErrors, parserErr.SyntaxErrors...)
	msgs := make([]string, 0, len(all))
	for _, se := range all {
		if m := se.Error(); m != "" {
			msgs = append(msgs, m)
		}
	}
	return msgs
}

// validateWithANTLR validates the `Having` expression after rewriting.
//
// original is the user-supplied expression before rewriting; rewritten is the result of
// rewriteExpression. Both are required so that syntax error messages can reference the
// original token names (e.g. "count()" or "total") instead of the rewritten SQL column
// names (e.g. "__result_0").
//
// Validation layers:
//  1. Quoted string literals are detected in the original expression → descriptive error.
//  2. ANTLR syntax errors on the rewritten expression → the original expression is
//     re-parsed to produce error messages that reference user-facing token names.
//  3. Semantic errors (unknown identifiers / function calls in the rewritten tree) →
//     lists the offending tokens; valid references from the column map are shown.
func (r *HavingExpressionRewriter) validateWithANTLR(original, rewritten string) error {
	// Layer 1 – Reject quoted string literals before parsing.
	// `Having` expressions compare numeric aggregate results; string literals are not valid.
	for _, ch := range original {
		if ch == '\'' || ch == '"' {
			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"`Having` expression contains string literals",
			).WithAdditional("Aggregator results are numeric")
		}
	}

	// Parse the rewritten expression (authoritative for semantic validation).
	input := antlr.NewInputStream(rewritten)
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

	// Layer 2 – ANTLR syntax errors.
	// If the rewritten expression has syntax errors, re-parse the original so that the
	// error messages reference the user's own token names rather than "__result_0" etc.
	allSyntaxErrors := append(lexerErrListener.SyntaxErrors, parserErrListener.SyntaxErrors...)
	if len(allSyntaxErrors) > 0 {
		msgs := syntaxErrorMessages(original)
		if len(msgs) == 0 {
			// Fallback: use messages from the rewritten expression.
			for _, se := range allSyntaxErrors {
				if m := se.Error(); m != "" {
					msgs = append(msgs, m)
				}
			}
		}
		detail := strings.Join(msgs, "; ")
		if detail == "" {
			detail = "check the expression syntax"
		}
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"Syntax error in `Having` expression",
		).WithAdditional(detail)
	}

	// Layer 3 – Semantic validation: every remaining identifier must be a known
	// SQL column name. Build validColumns from the TO side of columnMap.
	validColumns := make(map[string]bool, len(r.columnMap))
	for _, col := range r.columnMap {
		validColumns[col] = true
	}
	sv := newHavingExpressionSemanticValidator(validColumns)
	sv.Visit(tree)

	if len(sv.invalid) > 0 {
		sort.Strings(sv.invalid)
		hasAggFunc := false
		for _, ref := range sv.invalid {
			if _, isAgg := AggreFuncMap[valuer.NewString(ref)]; isAgg {
				hasAggFunc = true
				break
			}
		}
		if hasAggFunc {
			// At least one invalid ref is an aggregation function — use tailored message
			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"Functions are not allowed in `Having` expression",
			)
		}
		validKeys := make([]string, 0, len(r.columnMap))
		for k := range r.columnMap {
			validKeys = append(validKeys, k)
		}
		sort.Strings(validKeys)
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"Invalid references in `Having` expression: [%s]",
			strings.Join(sv.invalid, ", "),
		).WithAdditional("Valid references are: [" + strings.Join(validKeys, ", ") + "]")
	}

	return nil
}
