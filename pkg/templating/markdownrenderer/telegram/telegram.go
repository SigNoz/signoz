// Package telegram provides a goldmark node renderer that emits the HTML
// subset Telegram's parse_mode HTML accepts. Telegram rejects the whole
// message when it meets a tag outside that set, so constructs with no
// equivalent (headings, lists, tables, images) are flattened to text rather
// than rendered with their usual tags.
// https://core.telegram.org/bots/api#html-style
package telegram

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

// textEscaper covers the three characters Telegram requires as entities in
// message text. attrEscaper additionally covers the quote that would end an
// href value early.
var (
	textEscaper = strings.NewReplacer("&", "&amp;", "<", "&lt;", ">", "&gt;")
	attrEscaper = strings.NewReplacer("&", "&amp;", "<", "&lt;", ">", "&gt;", `"`, "&quot;")
)

// Extender registers the Telegram node renderer plus the GFM extensions it
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
	reg.Register(ast.KindHeading, r.renderHeading)
	reg.Register(ast.KindBlockquote, r.renderBlockquote)
	reg.Register(ast.KindCodeBlock, r.renderCodeBlock)
	reg.Register(ast.KindFencedCodeBlock, r.renderCodeBlock)
	reg.Register(ast.KindHTMLBlock, r.renderRawHTML)
	reg.Register(ast.KindList, r.renderList)
	reg.Register(ast.KindListItem, r.renderListItem)
	reg.Register(ast.KindParagraph, r.renderBlock)
	reg.Register(ast.KindTextBlock, r.renderTextBlock)
	reg.Register(ast.KindThematicBreak, r.renderThematicBreak)

	// Inlines
	reg.Register(ast.KindAutoLink, r.renderAutoLink)
	reg.Register(ast.KindCodeSpan, r.renderCodeSpan)
	reg.Register(ast.KindEmphasis, r.renderEmphasis)
	reg.Register(ast.KindImage, r.renderImage)
	reg.Register(ast.KindLink, r.renderLink)
	reg.Register(ast.KindText, r.renderText)
	reg.Register(ast.KindString, r.renderString)
	reg.Register(ast.KindRawHTML, r.renderRawHTML)

	// Extensions
	reg.Register(extensionast.KindStrikethrough, r.renderStrikethrough)
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

func (r *nodeRenderer) writeBlockSeparator(w util.BufWriter) {
	r.writeLineSeparator(w)
	r.writeLineSeparator(w)
}

func (r *nodeRenderer) separateFromPrevious(w util.BufWriter, n ast.Node) {
	if n.PreviousSibling() != nil {
		r.writeBlockSeparator(w)
	}
}

// wrap emits an opening tag on the way in and its closing tag on the way out.
func wrap(w util.BufWriter, tag string, entering bool) (ast.WalkStatus, error) {
	if entering {
		_, _ = w.WriteString("<" + tag + ">")
	} else {
		_, _ = w.WriteString("</" + tag + ">")
	}
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderDocument(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		r.prefixes = r.prefixes[:0]
	}
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderBlock(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		r.separateFromPrevious(w, node)
	}
	return ast.WalkContinue, nil
}

// renderHeading emits bold text: Telegram has no heading tag.
func (r *nodeRenderer) renderHeading(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		r.separateFromPrevious(w, node)
	}
	return wrap(w, "b", entering)
}

func (r *nodeRenderer) renderBlockquote(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		r.separateFromPrevious(w, node)
	}
	return wrap(w, "blockquote", entering)
}

func (r *nodeRenderer) renderEmphasis(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	tag := "i"
	if node.(*ast.Emphasis).Level >= 2 {
		tag = "b"
	}
	return wrap(w, tag, entering)
}

func (r *nodeRenderer) renderStrikethrough(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	return wrap(w, "s", entering)
}

func (r *nodeRenderer) renderCodeBlock(w util.BufWriter, source []byte, n ast.Node, entering bool) (ast.WalkStatus, error) {
	if !entering {
		return ast.WalkContinue, nil
	}
	r.separateFromPrevious(w, n)

	var body bytes.Buffer
	for i := 0; i < n.Lines().Len(); i++ {
		line := n.Lines().At(i)
		body.Write(line.Value(source))
	}

	_, _ = w.WriteString("<pre>")
	_, _ = w.WriteString(textEscaper.Replace(strings.TrimRight(body.String(), "\n")))
	_, _ = w.WriteString("</pre>")

	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderCodeSpan(w util.BufWriter, source []byte, n ast.Node, entering bool) (ast.WalkStatus, error) {
	if !entering {
		return ast.WalkContinue, nil
	}

	var body bytes.Buffer
	for c := n.FirstChild(); c != nil; c = c.NextSibling() {
		value := c.(*ast.Text).Segment.Value(source)
		if bytes.HasSuffix(value, []byte("\n")) {
			body.Write(value[:len(value)-1])
			body.WriteByte(' ')
		} else {
			body.Write(value)
		}
	}

	_, _ = w.WriteString("<code>" + textEscaper.Replace(body.String()) + "</code>")

	return ast.WalkSkipChildren, nil
}

// renderList and renderListItem mirror the plain-text renderer: Telegram has no
// list tag, so items become prefixed lines.
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
	if !entering {
		r.prefixes = r.prefixes[:len(r.prefixes)-1]
		return ast.WalkContinue, nil
	}

	if n.PreviousSibling() != nil {
		r.writeLineSeparator(w)
	}

	parent := n.Parent().(*ast.List)
	if parent.IsOrdered() {
		index := parent.Start
		for c := parent.FirstChild(); c != nil && c != n; c = c.NextSibling() {
			index++
		}
		_, _ = fmt.Fprintf(w, "%d. ", index)
	} else {
		_, _ = w.WriteString("• ")
	}
	r.prefixes = append(r.prefixes, "  ")

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
		_, _ = w.WriteString("———")
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
	_, _ = w.WriteString(`<a href="` + attrEscaper.Replace(url) + `">` + textEscaper.Replace(url) + "</a>")

	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderLink(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	n := node.(*ast.Link)
	if entering {
		_, _ = w.WriteString(`<a href="` + attrEscaper.Replace(string(n.Destination)) + `">`)
	} else {
		_, _ = w.WriteString("</a>")
	}
	return ast.WalkContinue, nil
}

// renderImage flattens to "alt (url)": a Telegram text message cannot carry an
// inline image, and <img> is not on the allowlist.
func (r *nodeRenderer) renderImage(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if !entering {
		n := node.(*ast.Image)
		if len(n.Destination) > 0 {
			_, _ = fmt.Fprintf(w, " (%s)", textEscaper.Replace(string(n.Destination)))
		}
	}
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderText(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if !entering {
		return ast.WalkContinue, nil
	}

	n := node.(*ast.Text)
	_, _ = w.WriteString(textEscaper.Replace(string(n.Segment.Value(source))))
	if n.HardLineBreak() || n.SoftLineBreak() {
		r.writeLineSeparator(w)
	}

	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderString(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		_, _ = w.WriteString(textEscaper.Replace(string(node.(*ast.String).Value)))
	}
	return ast.WalkContinue, nil
}

// renderRawHTML drops markup the author embedded by hand. Passing it through
// would hand Telegram tags outside the allowlist and fail the whole send.
func (r *nodeRenderer) renderRawHTML(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	return ast.WalkSkipChildren, nil
}

// renderTable flattens to "cell | cell" lines: Telegram has no table tag.
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
			_, _ = w.WriteString(textEscaper.Replace(extractPlainText(cc, source)))
		}
	}

	return ast.WalkSkipChildren, nil
}

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
