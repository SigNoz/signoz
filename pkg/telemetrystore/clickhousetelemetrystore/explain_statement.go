package clickhousetelemetrystore

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
)

// ErrCodeUnsafeStatement is returned when a statement is not a single statement
// safe to wrap in an EXPLAIN prefix.
var ErrCodeUnsafeStatement = errors.MustNewCode("unsafe_statement")

// scanState is the lexer state while scanning a statement.
type scanState int

const (
	scanNormal scanState = iota
	scanSingle
	scanDouble
	scanBacktick
	scanLineComment
	scanBlockComment
)

// ValidateExplainStatement rejects stacked statements (e.g. `SELECT 1; DROP TABLE t`),
// the only injection vector left once values are bound and the EXPLAIN prefix is fixed.
// It scans stmt as ClickHouse SQL — ignoring ';' inside string literals, quoted
// identifiers, and comments — and rejects any content after a top-level ';'.
func ValidateExplainStatement(stmt string) error {
	if strings.TrimSpace(stmt) == "" {
		return errors.NewInvalidInputf(ErrCodeUnsafeStatement, "statement is empty")
	}

	state := scanNormal
	// terminated is set at a top-level ';'; after it only whitespace, ';', and
	// comments may appear — anything else is a second statement.
	terminated := false

	for i := 0; i < len(stmt); i++ {
		c := stmt[i]
		switch state {
		case scanNormal:
			if terminated {
				switch {
				case isSQLSpace(c) || c == ';':
					// harmless trailing whitespace / empty statements
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
// by quote. A backslash or doubled quote escapes; an unescaped quote ends the
// literal (resetting *state). It returns the index to resume from (caller adds one).
func skipQuoted(s string, i int, quote byte, state *scanState) int {
	c := s[i]
	switch c {
	case '\\':
		// skip the escaped character
		return i + 1
	case quote:
		if i+1 < len(s) && s[i+1] == quote {
			// doubled quote: stay inside the literal
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
