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
//   - FunctionCallContext nodes are always invalid after rewriting (valid calls were
//     already replaced); their component tokens are reported as unknown.
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

// visitFunctionCall reports any remaining function call as invalid.
// After rewriting, all valid function-call references (e.g. "sum(bytes)") have
// already been replaced with SQL column names, so any function call seen here
// was not in the column map. Report the function name as invalid; for args,
// only report those that are not valid column references (e.g. sum(__result_0)
// should report only "sum", since __result_0 is a valid column).
func (v *havingExpressionSemanticValidator) visitFunctionCall(ctx *grammar.FunctionCallContext) {
	funcName := ctx.IDENTIFIER().GetText()

	if !v.seen[funcName] {
		v.invalid = append(v.invalid, funcName)
		v.seen[funcName] = true
	}

	if ctx.FunctionArgs() != nil {
		for _, arg := range ctx.FunctionArgs().AllFunctionArg() {
			argText := arg.IDENTIFIER().GetText()
			// Only report args that are not valid column references
			if v.validColumns[argText] {
				continue
			}
			if !v.seen[argText] {
				v.invalid = append(v.invalid, argText)
				v.seen[argText] = true
			}
		}
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

// validateWithANTLR parses the HAVING expression with the generated ANTLR lexer/parser
// and then performs semantic validation via havingExpressionSemanticValidator.
//
// It must be called BEFORE rewriteExpression so the expression still contains
// user-facing references (aliases, function-call strings, __result_N, etc.).
//
// Validation layers:
//  1. Quoted string literals are detected early in the token stream (QUOTED_TEXT token
//     is intentionally excluded from the grammar's atom rule) → descriptive error.
//  2. ANTLR syntax errors (unbalanced parentheses, missing comparison operators,
//     dangling AND/OR, etc.) → syntax error wrapping the ANTLR message.
//  3. Semantic errors (unknown identifiers / function calls) → lists the offending tokens.
func (r *HavingExpressionRewriter) validateWithANTLR(expression string) error {
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

	// Layer 1 – Reject quoted string literals before parsing.
	// HAVING expressions compare numeric aggregate results; string literals are not valid.
	for _, ch := range expression {
		if ch == '\'' || ch == '"' {
			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"HAVING expression cannot contain string literals; aggregate results are numeric",
			)
		}
	}

	// Build the parse tree.
	tree := p.Query()

	// Layer 2 – ANTLR syntax errors.
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
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"syntax error in HAVING expression: %s",
			detail,
		)
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
				"aggregation functions are not allowed in HAVING expression",
			)
		}
		validKeys := make([]string, 0, len(r.columnMap))
		for k := range r.columnMap {
			validKeys = append(validKeys, k)
		}
		sort.Strings(validKeys)
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"invalid references in HAVING expression: [%s]. Valid references are: [%s]",
			strings.Join(sv.invalid, ", "),
			strings.Join(validKeys, ", "),
		)
	}

	return nil
}
