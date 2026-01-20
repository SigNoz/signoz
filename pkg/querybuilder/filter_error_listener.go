package querybuilder

import (
	"fmt"
	"slices"
	"sort"
	"strings"

	"github.com/antlr4-go/antlr/v4"
)

var skipTokens = []string{"WS", "COMMENT"}

// friendly maps SYMBOLIC_NAME -> what the user should see.
var friendly = map[string]string{
	// punctuation & operators
	"LPAREN": "(", "RPAREN": ")",
	"LBRACK": "[", "RBRACK": "]",
	"COMMA":      ",",
	"EQUALS":     "=",
	"NOT_EQUALS": "!=",
	"NEQ":        "<>",
	"LT":         "<", "LE": "<=",
	"GT": ">", "GE": ">=",

	// keywords / functions
	"AND":  "AND",
	"OR":   "OR",
	"NOT":  "NOT",
	"LIKE": "LIKE", "ILIKE": "ILIKE",
	"NOT_LIKE": "NOT LIKE", "NOT_ILIKE": "NOT ILIKE",
	"BETWEEN": "BETWEEN", "IN": "IN", "EXISTS": "EXISTS",
	"REGEXP": "REGEXP", "CONTAINS": "CONTAINS",
	"HAS": "has()", "HASANY": "hasAny()", "HASALL": "hasAll()",
	"HASTOKEN": "hasToken()",

	// literals / identifiers
	"NUMBER":      "number",
	"BOOL":        "boolean",
	"QUOTED_TEXT": "quoted text",
	"KEY":         "field name (ex: service.name)",
}

// prettyToken returns the nicest human label for token type tType.
//
// Order of preference:
//  1. hard-coded friendly table
//  2. literal name from grammar  e.g.  "'('"
//  3. symbolic name              e.g.  AND
//  4. numeric fallback           e.g.  <34>
func prettyToken(p antlr.Parser, tType int) (string, bool) {
	if slices.Contains(skipTokens, tokenName(p, tType)) {
		return "", false
	}

	// symbolic name -> friendly ?
	syms := p.GetSymbolicNames()
	if tType >= 0 && tType < len(syms) {
		if nice, ok := friendly[syms[tType]]; ok {
			return nice, true
		}
	}

	// literal name (the quoted punctuation that ANTLR generates)
	lits := p.GetLiteralNames()
	if tType >= 0 && tType < len(lits) && lits[tType] != "" {
		return lits[tType], true
	}

	// symbolic name as last resort (but hide WS, EOF, …)
	if tType >= 0 && tType < len(syms) && syms[tType] != "" && syms[tType] != "WS" {
		return syms[tType], true
	}

	return "", false // tell caller to skip this entry
}

type SyntaxErr struct {
	Line, Col int
	TokenTxt  string   // offending text (or EOF)
	TokenType int      // offending token type
	Expected  []string // token names the parser still expected
	RuleStack []string
	Msg       string
}

func (e *SyntaxErr) Error() string {
	exp := ""
	if len(e.Expected) > 0 {
		exp = "expecting one of {" + strings.Join(e.Expected, ", ") + "}" + " but got " + e.TokenTxt
	}
	return fmt.Sprintf("line %d:%d %s", e.Line, e.Col, exp)
}

type Ambiguity struct {
	Text   string // slice of raw input that was ambiguous
	Alts   string // e.g. "{1, 3}"
	RStack []string
}

func (a *Ambiguity) Error() string {
	return fmt.Sprintf("ambiguity: %s, alts: %s", a.Text, a.Alts)
}

type ErrorListener struct {
	antlr.DefaultErrorListener

	SyntaxErrors []*SyntaxErr
	Ambigs       []*Ambiguity
}

func NewErrorListener() *ErrorListener { return &ErrorListener{} }

func (l *ErrorListener) SyntaxError(
	rec antlr.Recognizer,
	off any,
	line, column int,
	msg string,
	e antlr.RecognitionException,
) {
	err := &SyntaxErr{Line: line, Col: column, Msg: msg}

	if tok, ok := off.(antlr.Token); ok {
		if tok.GetTokenType() == antlr.TokenEOF {
			err.TokenTxt = "EOF"
			err.TokenType = tok.GetTokenType()
		} else {
			err.TokenTxt = fmt.Sprintf("'%s'", tok.GetText())
			err.TokenType = tok.GetTokenType()
		}
	}

	if p, ok := rec.(antlr.Parser); ok {
		set := p.GetExpectedTokens()

		// Heuristic: if KEY appears in the expected set *alongside* any literal
		// value tokens, we assume it stands for a bare value. Otherwise, it stands
		// for a left‑hand identifier.
		valueTokens := map[int]struct{}{
			pGetTokenType(p, "QUOTED_TEXT"): {},
			pGetTokenType(p, "NUMBER"):      {},
			pGetTokenType(p, "BOOL"):        {},
		}
		hasValueLiterals := false
		for _, iv := range set.GetIntervals() {
			for t := iv.Start; t <= iv.Stop; t++ {
				if _, ok := valueTokens[t]; ok {
					hasValueLiterals = true
					break
				}
			}
			if hasValueLiterals {
				break
			}
		}

		uniq := map[string]struct{}{}
		for _, iv := range set.GetIntervals() {
			for t := iv.Start; t <= iv.Stop; t++ {
				sym := tokenName(p, t)
				if sym == "KEY" {
					if !hasValueLiterals {
						uniq["field name (ex: service.name)"] = struct{}{}
					}
					continue
				}
				if label, ok := prettyToken(p, t); ok {
					uniq[label] = struct{}{}
				}
			}
		}

		err.Expected = make([]string, 0, len(uniq))
		for k := range uniq {
			err.Expected = append(err.Expected, k)
		}
		sort.Strings(err.Expected)
		err.RuleStack = p.GetRuleInvocationStack(nil)
	}

	l.SyntaxErrors = append(l.SyntaxErrors, err)
}

func (l *ErrorListener) ReportAmbiguity(
	rec antlr.Parser,
	dfa *antlr.DFA,
	startIdx, stopIdx int,
	exact bool,
	ambigAlts *antlr.BitSet,
	configs *antlr.ATNConfigSet,
) {
	if !exact {
		return
	}
	stream := rec.GetTokenStream()
	txt := textSlice(stream, startIdx, stopIdx)
	l.Ambigs = append(l.Ambigs, &Ambiguity{
		Text:   txt,
		Alts:   ambigAlts.String(),
		RStack: rec.GetRuleInvocationStack(nil),
	})
}

func pGetTokenType(p antlr.Parser, tName string) int {
	syms := p.GetSymbolicNames()
	for i, sym := range syms {
		if sym == tName {
			return i
		}
	}
	return -1
}

// tokenName prefers literal > symbolic > numeric.
func tokenName(p antlr.Parser, tType int) string {
	lits := p.GetLiteralNames()
	if tType >= 0 && tType < len(lits) && lits[tType] != "" {
		return lits[tType]
	}
	syms := p.GetSymbolicNames()
	if tType >= 0 && tType < len(syms) && syms[tType] != "" {
		return syms[tType]
	}
	return fmt.Sprintf("<%d>", tType)
}

// textSlice pulls raw input text between two token indexes.
func textSlice(ts antlr.TokenStream, start, stop int) string {
	var b strings.Builder
	for i := start; i <= stop && i >= 0; i++ {
		if tok := ts.Get(i); tok != nil && tok.GetTokenType() != antlr.TokenEOF {
			b.WriteString(tok.GetText())
		}
	}
	return b.String()
}
