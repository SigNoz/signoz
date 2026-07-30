package sqlschema

import (
	"fmt"
	"hash/fnv"
	"strings"
)

type expressionNormalizer struct {
	input    string
	foldCase bool
}

func (n *expressionNormalizer) hash() string {
	hasher := fnv.New32a()
	_, _ = hasher.Write([]byte(n.normalize()))
	return fmt.Sprintf("%08x", hasher.Sum32())
}

func (n *expressionNormalizer) normalize() string {
	expr := strings.TrimSpace(n.input)
	expr = n.stripOuterParentheses(expr)

	var output strings.Builder
	output.Grow(len(expr))

	for i := 0; i < len(expr); i++ {
		switch expr[i] {
		case ' ', '\t', '\n', '\r':
			if output.Len() > 0 {
				last := output.String()[output.Len()-1]
				if last != ' ' {
					output.WriteByte(' ')
				}
			}
		case '\'':
			end := n.consumeSingleQuotedLiteral(expr, i, &output)
			i = end
		case '"':
			token, end := n.consumeDoubleQuotedToken(expr, i)
			output.WriteString(token)
			i = end
		default:
			c := expr[i]
			if n.foldCase && c >= 'A' && c <= 'Z' {
				c += 'a' - 'A'
			}
			output.WriteByte(c)
		}
	}

	return strings.TrimSpace(output.String())
}

func (n *expressionNormalizer) stripOuterParentheses(s string) string {
	for {
		s = strings.TrimSpace(s)
		if len(s) < 2 || s[0] != '(' || s[len(s)-1] != ')' || !n.hasWrappingParentheses(s) {
			return s
		}
		s = s[1 : len(s)-1]
	}
}

func (n *expressionNormalizer) hasWrappingParentheses(s string) bool {
	depth := 0
	inSingleQuotedLiteral := false
	inDoubleQuotedToken := false

	for i := 0; i < len(s); i++ {
		switch s[i] {
		case '\'':
			if inDoubleQuotedToken {
				continue
			}
			if inSingleQuotedLiteral && i+1 < len(s) && s[i+1] == '\'' {
				i++
				continue
			}
			inSingleQuotedLiteral = !inSingleQuotedLiteral
		case '"':
			if inSingleQuotedLiteral {
				continue
			}
			if inDoubleQuotedToken && i+1 < len(s) && s[i+1] == '"' {
				i++
				continue
			}
			inDoubleQuotedToken = !inDoubleQuotedToken
		case '(':
			if inSingleQuotedLiteral || inDoubleQuotedToken {
				continue
			}
			depth++
		case ')':
			if inSingleQuotedLiteral || inDoubleQuotedToken {
				continue
			}
			depth--
			if depth == 0 && i != len(s)-1 {
				return false
			}
		}
	}

	return depth == 0
}

func (n *expressionNormalizer) consumeSingleQuotedLiteral(s string, start int, output *strings.Builder) int {
	output.WriteByte(s[start])
	for i := start + 1; i < len(s); i++ {
		output.WriteByte(s[i])
		if s[i] == '\'' {
			if i+1 < len(s) && s[i+1] == '\'' {
				i++
				output.WriteByte(s[i])
				continue
			}
			return i
		}
	}

	return len(s) - 1
}

func (n *expressionNormalizer) consumeDoubleQuotedToken(s string, start int) (string, int) {
	var ident strings.Builder

	for i := start + 1; i < len(s); i++ {
		if s[i] == '"' {
			if i+1 < len(s) && s[i+1] == '"' {
				ident.WriteByte('"')
				i++
				continue
			}

			if n.isSimpleUnquotedIdentifier(ident.String()) {
				return ident.String(), i
			}

			return s[start : i+1], i
		}

		ident.WriteByte(s[i])
	}

	return s[start:], len(s) - 1
}

func (n *expressionNormalizer) isSimpleUnquotedIdentifier(s string) bool {
	if s == "" || strings.ToLower(s) != s {
		return false
	}

	for i := 0; i < len(s); i++ {
		ch := s[i]
		if (ch >= 'a' && ch <= 'z') || ch == '_' {
			continue
		}
		if i > 0 && ch >= '0' && ch <= '9' {
			continue
		}
		return false
	}

	return true
}
