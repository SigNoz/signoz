// Package adf converts Markdown into Atlassian Document Format (ADF) nodes,
// the JSON rich-text format used by Jira Cloud's v3 API.
package adf

import (
	"strings"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/ast"
	"github.com/yuin/goldmark/extension"
	extast "github.com/yuin/goldmark/extension/ast"
	"github.com/yuin/goldmark/text"
)

// parser is stateless across Parse calls and safe for concurrent use; only
// goldmark's renderers hold per-document state (which we don't use). Strikethrough
// is included for the strike mark; linkify is deliberately omitted since it
// fragments plain text into word tokens while scanning for bare URLs.
var parser = goldmark.New(goldmark.WithExtensions(extension.Strikethrough)).Parser()

// Render returns the ADF block nodes for markdown (without the doc wrapper),
// so callers can embed them alongside their own nodes (panels, links, …).
func Render(markdown string) []any {
	src := []byte(markdown)
	return blockChildren(parser.Parse(text.NewReader(src)), src)
}

func blockChildren(parent ast.Node, src []byte) []any {
	var out []any
	for c := parent.FirstChild(); c != nil; c = c.NextSibling() {
		if b := block(c, src); b != nil {
			out = append(out, b)
		}
	}
	return out
}

func block(n ast.Node, src []byte) any {
	switch node := n.(type) {
	case *ast.Heading:
		return map[string]any{"type": "heading", "attrs": map[string]any{"level": node.Level}, "content": inlineChildren(node, src, nil)}
	case *ast.Paragraph:
		return paragraph(inlineChildren(node, src, nil))
	case *ast.TextBlock:
		return paragraph(inlineChildren(node, src, nil))
	case *ast.List:
		typ := "bulletList"
		if node.IsOrdered() {
			typ = "orderedList"
		}
		return map[string]any{"type": typ, "content": blockChildren(node, src)}
	case *ast.ListItem:
		return map[string]any{"type": "listItem", "content": blockChildren(node, src)}
	case *ast.Blockquote:
		return map[string]any{"type": "blockquote", "content": blockChildren(node, src)}
	case *ast.FencedCodeBlock:
		return codeBlock(codeText(node, src), string(node.Language(src)))
	case *ast.CodeBlock:
		return codeBlock(codeText(node, src), "")
	case *ast.ThematicBreak:
		return map[string]any{"type": "rule"}
	default:
		return nil
	}
}

func paragraph(content []any) map[string]any {
	p := map[string]any{"type": "paragraph"}
	if len(content) > 0 {
		p["content"] = content
	}
	return p
}

func codeBlock(code, lang string) map[string]any {
	cb := map[string]any{"type": "codeBlock"}
	if lang != "" {
		cb["attrs"] = map[string]any{"language": lang}
	}
	if code = strings.TrimRight(code, "\n"); code != "" {
		cb["content"] = []any{map[string]any{"type": "text", "text": code}}
	}
	return cb
}

// inlineChildren flattens an inline subtree into ADF text nodes, carrying the
// active marks (strong/em/code/strike/link) down the tree.
func inlineChildren(parent ast.Node, src []byte, marks []any) []any {
	var out []any
	for c := parent.FirstChild(); c != nil; c = c.NextSibling() {
		switch node := c.(type) {
		case *ast.Text:
			if t := string(node.Segment.Value(src)); t != "" {
				out = append(out, textNode(t, marks))
			}
			if node.HardLineBreak() {
				out = append(out, map[string]any{"type": "hardBreak"})
			} else if node.SoftLineBreak() {
				out = append(out, textNode(" ", marks))
			}
		case *ast.String:
			if len(node.Value) > 0 {
				out = append(out, textNode(string(node.Value), marks))
			}
		case *ast.CodeSpan:
			if t := rawText(node, src); t != "" {
				out = append(out, textNode(t, withMark(marks, mark("code"))))
			}
		case *ast.Emphasis:
			m := "em"
			if node.Level == 2 {
				m = "strong"
			}
			out = append(out, inlineChildren(node, src, withMark(marks, mark(m)))...)
		case *extast.Strikethrough:
			out = append(out, inlineChildren(node, src, withMark(marks, mark("strike")))...)
		case *ast.Link:
			out = append(out, inlineChildren(node, src, withMark(marks, linkMark(string(node.Destination))))...)
		case *ast.AutoLink:
			if u := string(node.URL(src)); u != "" {
				out = append(out, textNode(u, withMark(marks, linkMark(u))))
			}
		default:
			out = append(out, inlineChildren(c, src, marks)...)
		}
	}
	return out
}

func textNode(s string, marks []any) map[string]any {
	tn := map[string]any{"type": "text", "text": s}
	if len(marks) > 0 {
		tn["marks"] = marks
	}
	return tn
}

func mark(typ string) any { return map[string]any{"type": typ} }

func linkMark(href string) any {
	return map[string]any{"type": "link", "attrs": map[string]any{"href": href}}
}

func withMark(marks []any, m any) []any {
	out := make([]any, 0, len(marks)+1)
	out = append(out, marks...)
	return append(out, m)
}

func rawText(n ast.Node, src []byte) string {
	var b strings.Builder
	for c := n.FirstChild(); c != nil; c = c.NextSibling() {
		switch t := c.(type) {
		case *ast.Text:
			b.Write(t.Segment.Value(src))
		case *ast.String:
			b.Write(t.Value)
		default:
			b.WriteString(rawText(c, src))
		}
	}
	return b.String()
}

func codeText(n ast.Node, src []byte) string {
	var b strings.Builder
	lines := n.Lines()
	for i := 0; i < lines.Len(); i++ {
		seg := lines.At(i)
		b.Write(seg.Value(src))
	}
	return b.String()
}
