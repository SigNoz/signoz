// Package plaintext provides a goldmark node renderer that emits plain text:
// no markdown or HTML markers, and links flattened to "text (url)". It is used
// for JSM Ops timeline notes, which render neither HTML nor markdown.
package plaintext

import (
	"bytes"
	"fmt"
	"strings"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/ast"
	"github.com/yuin/goldmark/extension"
	extensionast "github.com/yuin/goldmark/extension/ast"
	"github.com/yuin/goldmark/renderer"
	"github.com/yuin/goldmark/util"
)

// Extender registers the plain-text node renderer plus the GFM extensions it
// handles (tables, strikethrough).
var Extender goldmark.Extender = &extender{}

type extender struct{}

func (e *extender) Extend(m goldmark.Markdown) {
	extension.Table.Extend(m)
	extension.Strikethrough.Extend(m)
	m.Renderer().AddOptions(
		renderer.WithNodeRenderers(util.Prioritized(newRenderer(), 1)),
	)
}

// nodeRenderer holds per-document nesting prefixes, so it is not safe for
// concurrent Convert calls; callers pool one instance per goroutine.
type nodeRenderer struct {
	prefixes []string
}

func newRenderer() renderer.NodeRenderer {
	return &nodeRenderer{}
}

func (r *nodeRenderer) RegisterFuncs(reg renderer.NodeRendererFuncRegisterer) {
	// Blocks
	reg.Register(ast.KindDocument, r.renderDocument)
	reg.Register(ast.KindHeading, r.renderBlock)
	reg.Register(ast.KindBlockquote, r.renderBlock)
	reg.Register(ast.KindCodeBlock, r.renderCodeBlock)
	reg.Register(ast.KindFencedCodeBlock, r.renderCodeBlock)
	reg.Register(ast.KindHTMLBlock, r.renderHTMLBlock)
	reg.Register(ast.KindList, r.renderList)
	reg.Register(ast.KindListItem, r.renderListItem)
	reg.Register(ast.KindParagraph, r.renderBlock)
	reg.Register(ast.KindTextBlock, r.renderTextBlock)
	reg.Register(ast.KindThematicBreak, r.renderThematicBreak)

	// Inlines
	reg.Register(ast.KindAutoLink, r.renderAutoLink)
	reg.Register(ast.KindCodeSpan, r.renderCodeSpan)
	reg.Register(ast.KindEmphasis, r.renderPassthrough)
	reg.Register(ast.KindImage, r.renderLink)
	reg.Register(ast.KindLink, r.renderLink)
	reg.Register(ast.KindText, r.renderText)
	reg.Register(ast.KindString, r.renderString)
	reg.Register(ast.KindRawHTML, r.renderRawHTML)

	// Extensions
	reg.Register(extensionast.KindStrikethrough, r.renderPassthrough)
	reg.Register(extensionast.KindTable, r.renderTable)
}

func (r *nodeRenderer) writePrefix(w util.BufWriter) {
	for _, p := range r.prefixes {
		_, _ = w.WriteString(p)
	}
}

func (r *nodeRenderer) writeLineSeparator(w util.BufWriter) {
	_ = w.WriteByte('\n')
	r.writePrefix(w)
}

// writeBlockSeparator writes a blank line between block-level elements.
func (r *nodeRenderer) writeBlockSeparator(w util.BufWriter) {
	r.writeLineSeparator(w)
	r.writeLineSeparator(w)
}

func (r *nodeRenderer) separateFromPrevious(w util.BufWriter, n ast.Node) {
	if n.PreviousSibling() != nil {
		r.writeBlockSeparator(w)
	}
}

func (r *nodeRenderer) renderDocument(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		// The renderer is pooled; wipe any prefix stack left over from a prior
		// document (e.g. one that errored mid-walk) before starting fresh.
		r.prefixes = r.prefixes[:0]
	}
	return ast.WalkContinue, nil
}

// renderBlock separates block-level nodes (paragraph, heading, blockquote) from
// their previous sibling with a blank line, emitting no markers of their own.
func (r *nodeRenderer) renderBlock(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		r.separateFromPrevious(w, node)
	}
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderCodeBlock(w util.BufWriter, source []byte, n ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		r.separateFromPrevious(w, n)
		l := n.Lines().Len()
		for i := 0; i < l; i++ {
			line := n.Lines().At(i)
			_, _ = w.Write(line.Value(source))
		}
	}
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderList(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering && node.PreviousSibling() != nil {
		r.writeLineSeparator(w)
		if node.Parent() == nil || node.Parent().Kind() != ast.KindListItem {
			r.writeLineSeparator(w)
		}
	}
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderListItem(w util.BufWriter, source []byte, n ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		if n.PreviousSibling() != nil {
			r.writeLineSeparator(w)
		}
		parent := n.Parent().(*ast.List)
		var prefixStr string
		if parent.IsOrdered() {
			index := parent.Start
			for c := parent.FirstChild(); c != nil && c != n; c = c.NextSibling() {
				index++
			}
			prefixStr = fmt.Sprintf("%d. ", index)
		} else {
			prefixStr = "- "
		}
		_, _ = w.WriteString(prefixStr)
		r.prefixes = append(r.prefixes, "  ") // indent wrapped/nested lines
	} else {
		r.prefixes = r.prefixes[:len(r.prefixes)-1]
	}
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderTextBlock(w util.BufWriter, source []byte, n ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering && n.PreviousSibling() != nil {
		r.writeLineSeparator(w)
	}
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderThematicBreak(w util.BufWriter, source []byte, n ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		r.separateFromPrevious(w, n)
		_, _ = w.WriteString("---")
	}
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderAutoLink(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if !entering {
		return ast.WalkContinue, nil
	}
	n := node.(*ast.AutoLink)
	url := string(n.URL(source))
	if n.AutoLinkType == ast.AutoLinkEmail && !strings.HasPrefix(strings.ToLower(url), "mailto:") {
		url = "mailto:" + url
	}
	_, _ = w.WriteString(url)
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderCodeSpan(w util.BufWriter, source []byte, n ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		for c := n.FirstChild(); c != nil; c = c.NextSibling() {
			segment := c.(*ast.Text).Segment
			value := segment.Value(source)
			if bytes.HasSuffix(value, []byte("\n")) {
				_, _ = w.Write(value[:len(value)-1])
				_ = w.WriteByte(' ')
			} else {
				_, _ = w.Write(value)
			}
		}
		return ast.WalkSkipChildren, nil
	}
	return ast.WalkContinue, nil
}

// renderPassthrough emits no markers; the node's children render as plain text
// (used for emphasis/strong and strikethrough).
func (r *nodeRenderer) renderPassthrough(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	return ast.WalkContinue, nil
}

// renderLink flattens links and images to "text (url)": children render the
// label, then the destination is appended in parentheses on exit.
func (r *nodeRenderer) renderLink(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	var dest []byte
	switch n := node.(type) {
	case *ast.Link:
		dest = n.Destination
	case *ast.Image:
		dest = n.Destination
	}
	if !entering && len(dest) > 0 {
		_, _ = fmt.Fprintf(w, " (%s)", dest)
	}
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderText(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if !entering {
		return ast.WalkContinue, nil
	}
	n := node.(*ast.Text)
	_, _ = w.Write(n.Segment.Value(source))
	if n.HardLineBreak() || n.SoftLineBreak() {
		r.writeLineSeparator(w)
	}
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderString(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		_, _ = w.Write(node.(*ast.String).Value)
	}
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderRawHTML(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	// Drop inline raw HTML tags; a plain-text note should never carry markup.
	return ast.WalkSkipChildren, nil
}

func (r *nodeRenderer) renderHTMLBlock(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	// Drop block-level raw HTML for the same reason as inline raw HTML.
	return ast.WalkSkipChildren, nil
}

func (r *nodeRenderer) renderTable(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if !entering {
		return ast.WalkContinue, nil
	}
	r.separateFromPrevious(w, node)

	first := true
	for c := node.FirstChild(); c != nil; c = c.NextSibling() {
		if c.Kind() != extensionast.KindTableHeader && c.Kind() != extensionast.KindTableRow {
			continue
		}
		if !first {
			r.writeLineSeparator(w)
		}
		first = false
		cellFirst := true
		for cc := c.FirstChild(); cc != nil; cc = cc.NextSibling() {
			if cc.Kind() != extensionast.KindTableCell {
				continue
			}
			if !cellFirst {
				_, _ = w.WriteString(" | ")
			}
			cellFirst = false
			_, _ = w.WriteString(extractPlainText(cc, source))
		}
	}
	return ast.WalkSkipChildren, nil
}

// extractPlainText collects the text content of a node.
func extractPlainText(n ast.Node, source []byte) string {
	var buf bytes.Buffer
	_ = ast.Walk(n, func(node ast.Node, entering bool) (ast.WalkStatus, error) {
		if !entering {
			return ast.WalkContinue, nil
		}
		switch t := node.(type) {
		case *ast.Text:
			buf.Write(t.Segment.Value(source))
		case *ast.String:
			buf.Write(t.Value)
		}
		return ast.WalkContinue, nil
	})
	return strings.TrimSpace(buf.String())
}
