package telemetrystore

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
)

// ErrCodeUnsafeStatement is returned when a statement handed to one of the
// EXPLAIN helpers is not a single statement that can be safely wrapped in an
// EXPLAIN prefix.
var ErrCodeUnsafeStatement = errors.MustNewCode("unsafe_statement")

// scanState is the lexer state while scanning a statement in
// ValidateExplainStatement.
type scanState int

const (
	scanNormal scanState = iota
	scanSingle
	scanDouble
	scanBacktick
	scanLineComment
	scanBlockComment
)

// ValidateExplainStatement guards the EXPLAIN helpers against injection. Values
// are bound as parameters and the EXPLAIN prefix is fixed, so the only vector
// left is stacking a second statement (e.g. `SELECT 1; DROP TABLE t`). It scans
// stmt as ClickHouse SQL — skipping string literals, quoted identifiers, and
// comments so a ';' inside them is ignored — and rejects any content after a
// top-level ';'.
func ValidateExplainStatement(stmt string) error {
	if strings.TrimSpace(stmt) == "" {
		return errors.NewInvalidInputf(ErrCodeUnsafeStatement, "statement is empty")
	}

	state := scanNormal
	// terminated is set once a top-level ';' is seen; after it, only whitespace,
	// further ';', and comments may appear — anything else is a second statement.
	terminated := false

	for i := 0; i < len(stmt); i++ {
		c := stmt[i]
		switch state {
		case scanNormal:
			if terminated {
				switch {
				case isSQLSpace(c) || c == ';':
					// trailing whitespace and empty statements are harmless
				case c == '-' && i+1 < len(stmt) && stmt[i+1] == '-':
					state = scanLineComment
					i++
				case c == '/' && i+1 < len(stmt) && stmt[i+1] == '*':
					state = scanBlockComment
					i++
				default:
					return errors.NewInvalidInputf(ErrCodeUnsafeStatement, "statement must be a single statement; content found after ';'")
				}
				continue
			}
			switch {
			case c == '\'':
				state = scanSingle
			case c == '"':
				state = scanDouble
			case c == '`':
				state = scanBacktick
			case c == '-' && i+1 < len(stmt) && stmt[i+1] == '-':
				state = scanLineComment
				i++
			case c == '/' && i+1 < len(stmt) && stmt[i+1] == '*':
				state = scanBlockComment
				i++
			case c == ';':
				terminated = true
			}
		case scanSingle:
			i = skipQuoted(stmt, i, '\'', &state)
		case scanDouble:
			i = skipQuoted(stmt, i, '"', &state)
		case scanBacktick:
			i = skipQuoted(stmt, i, '`', &state)
		case scanLineComment:
			if c == '\n' {
				state = scanNormal
			}
		case scanBlockComment:
			if c == '*' && i+1 < len(stmt) && stmt[i+1] == '/' {
				state = scanNormal
				i++
			}
		}
	}

	return nil
}

// skipQuoted advances one character within a quoted literal/identifier delimited
// by quote. A backslash escapes the next character and a doubled quote is an
// escaped quote; an unescaped quote ends the literal (resetting *state to
// scanNormal). It returns the index to resume from (the caller's loop adds one).
func skipQuoted(s string, i int, quote byte, state *scanState) int {
	c := s[i]
	switch {
	case c == '\\':
		// skip the escaped character
		return i + 1
	case c == quote:
		if i+1 < len(s) && s[i+1] == quote {
			// doubled quote: an escaped quote, stay inside the literal
			return i + 1
		}
		*state = scanNormal
	}
	return i
}

// isSQLSpace reports whether c is SQL statement whitespace.
func isSQLSpace(c byte) bool {
	switch c {
	case ' ', '\t', '\n', '\r', '\v', '\f':
		return true
	default:
		return false
	}
}
