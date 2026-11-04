// Package wikimarkup provides a goldmark node renderer that emits Jira wiki
// markup, the text format the self-hosted Jira v2 API renders for issue
// descriptions and comments.
package wikimarkup

import (
	"bytes"
	"fmt"
	"strings"
	"unicode"
	"unicode/utf8"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/ast"
	"github.com/yuin/goldmark/extension"
	extensionast "github.com/yuin/goldmark/extension/ast"
	"github.com/yuin/goldmark/renderer"
	"github.com/yuin/goldmark/util"
)

// Extender registers the wiki markup node renderer plus the GFM extensions it
// handles (tables, strikethrough).
var Extender goldmark.Extender = &extender{}

// inlineMarkers open or close an effect in wiki markup when they sit at a word
// boundary; one between two letters or digits (host-1, snake_case) is literal.
const inlineMarkers = "*_-+^~"

type extender struct{}

func (e *extender) Extend(m goldmark.Markdown) {
	extension.Table.Extend(m)
	extension.Strikethrough.Extend(m)
	m.Renderer().AddOptions(
		renderer.WithNodeRenderers(util.Prioritized(newRenderer(), 1)),
	)
}

// nodeRenderer holds the per-document list marker stack and the last text rune
// written (goldmark splits text around unmatched emphasis delimiters, so the
// word-boundary check needs it), so it is not safe for concurrent Convert
// calls; callers pool one instance per goroutine.
type nodeRenderer struct {
	listMarkers []byte
	lastRune    rune
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
	reg.Register(ast.KindHTMLBlock, r.renderSkip)
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
	reg.Register(ast.KindRawHTML, r.renderSkip)

	// Extensions
	reg.Register(extensionast.KindStrikethrough, r.renderStrikethrough)
	reg.Register(extensionast.KindTable, r.renderTable)
}

func (r *nodeRenderer) inList() bool {
	return len(r.listMarkers) > 0
}

// separateFromPrevious puts a blank line between top-level blocks and a single
// newline inside a list, where a blank line would end the list.
func (r *nodeRenderer) separateFromPrevious(w util.BufWriter, n ast.Node) {
	if n.PreviousSibling() == nil {
		return
	}
	_ = w.WriteByte('\n')
	if !r.inList() {
		_ = w.WriteByte('\n')
	}
}

func (r *nodeRenderer) renderDocument(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		// The renderer is pooled; wipe any marker stack left over from a prior
		// document (e.g. one that errored mid-walk) before starting fresh.
		r.listMarkers = r.listMarkers[:0]
		r.lastRune = ' '
	}
	return ast.WalkContinue, nil
}

// writeText escapes and writes a text run; the runes around it come from the
// neighbouring runs so a marker on a run boundary is judged against the real
// surrounding characters.
func (r *nodeRenderer) writeText(w util.BufWriter, s string, next rune) {
	if s == "" {
		return
	}
	_, _ = w.WriteString(escapeBetween(s, r.lastRune, next))
	r.lastRune, _ = utf8.DecodeLastRuneInString(s)
}

// runeAfter is the first rune of the following text run, or a space when the
// next node is not plain text.
func runeAfter(node ast.Node, source []byte) rune {
	switch next := node.NextSibling().(type) {
	case *ast.Text:
		if c, _ := utf8.DecodeRune(next.Segment.Value(source)); c != utf8.RuneError {
			return c
		}
	case *ast.String:
		if c, _ := utf8.DecodeRune(next.Value); c != utf8.RuneError {
			return c
		}
	}
	return ' '
}

func (r *nodeRenderer) renderBlock(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		r.separateFromPrevious(w, node)
	}
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderHeading(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		r.separateFromPrevious(w, node)
		_, _ = fmt.Fprintf(w, "h%d. ", node.(*ast.Heading).Level)
	}
	return ast.WalkContinue, nil
}

// renderBlockquote uses the one-paragraph bq. form when it can and the
// {quote} block otherwise.
func (r *nodeRenderer) renderBlockquote(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	single := node.ChildCount() == 1 && node.FirstChild().Kind() == ast.KindParagraph
	if entering {
		r.separateFromPrevious(w, node)
		if single {
			_, _ = w.WriteString("bq. ")
		} else {
			_, _ = w.WriteString("{quote}\n")
		}
		return ast.WalkContinue, nil
	}
	if !single {
		_, _ = w.WriteString("\n{quote}")
	}
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderCodeBlock(w util.BufWriter, source []byte, n ast.Node, entering bool) (ast.WalkStatus, error) {
	if !entering {
		return ast.WalkContinue, nil
	}
	r.separateFromPrevious(w, n)
	_, _ = w.WriteString("{code")
	if fenced, ok := n.(*ast.FencedCodeBlock); ok {
		if language := fenced.Language(source); len(language) > 0 {
			_, _ = w.WriteString(":" + string(language))
		}
	}
	_, _ = w.WriteString("}\n")
	lines := n.Lines()
	for i := 0; i < lines.Len(); i++ {
		line := lines.At(i)
		_, _ = w.Write(line.Value(source))
	}
	_, _ = w.WriteString("{code}")
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderList(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	marker := byte('*')
	if node.(*ast.List).IsOrdered() {
		marker = '#'
	}
	if entering {
		r.separateFromPrevious(w, node)
		r.listMarkers = append(r.listMarkers, marker)
	} else {
		r.listMarkers = r.listMarkers[:len(r.listMarkers)-1]
	}
	return ast.WalkContinue, nil
}

// renderListItem writes the wiki marker chain for the item's depth, such as
// "* " or "*# ", since nesting is expressed by repeated markers, not indentation.
func (r *nodeRenderer) renderListItem(w util.BufWriter, source []byte, n ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		if n.PreviousSibling() != nil {
			_ = w.WriteByte('\n')
		}
		_, _ = w.Write(r.listMarkers)
		_ = w.WriteByte(' ')
	}
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderTextBlock(w util.BufWriter, source []byte, n ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering && n.PreviousSibling() != nil {
		_ = w.WriteByte('\n')
	}
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderThematicBreak(w util.BufWriter, source []byte, n ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		r.separateFromPrevious(w, n)
		_, _ = w.WriteString("----")
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
	if !entering {
		return ast.WalkContinue, nil
	}
	_, _ = w.WriteString("{{")
	for c := n.FirstChild(); c != nil; c = c.NextSibling() {
		value := c.(*ast.Text).Segment.Value(source)
		if bytes.HasSuffix(value, []byte("\n")) {
			_, _ = w.Write(value[:len(value)-1])
			_ = w.WriteByte(' ')
		} else {
			_, _ = w.Write(value)
		}
	}
	_, _ = w.WriteString("}}")
	return ast.WalkSkipChildren, nil
}

func (r *nodeRenderer) renderEmphasis(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	marker := "_"
	if node.(*ast.Emphasis).Level == 2 {
		marker = "*"
	}
	_, _ = w.WriteString(marker)
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderStrikethrough(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	_, _ = w.WriteString("-")
	return ast.WalkContinue, nil
}

// renderLink writes [label|url]: children render the label, the destination
// closes it on exit.
func (r *nodeRenderer) renderLink(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		_, _ = w.WriteString("[")
		return ast.WalkContinue, nil
	}
	_, _ = fmt.Fprintf(w, "|%s]", node.(*ast.Link).Destination)
	return ast.WalkContinue, nil
}

// renderImage writes !url!; wiki markup has no alt text, so the label is dropped.
func (r *nodeRenderer) renderImage(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		_, _ = fmt.Fprintf(w, "!%s!", node.(*ast.Image).Destination)
	}
	return ast.WalkSkipChildren, nil
}

func (r *nodeRenderer) renderText(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if !entering {
		return ast.WalkContinue, nil
	}
	n := node.(*ast.Text)
	next := runeAfter(node, source)
	if n.HardLineBreak() || n.SoftLineBreak() {
		next = '\n'
	}
	r.writeText(w, string(n.Segment.Value(source)), next)
	if n.HardLineBreak() || n.SoftLineBreak() {
		_ = w.WriteByte('\n')
		r.lastRune = '\n'
	}
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderString(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		r.writeText(w, string(node.(*ast.String).Value), runeAfter(node, source))
	}
	return ast.WalkContinue, nil
}

// renderSkip drops raw HTML, inline or block; wiki markup renders tags literally.
func (r *nodeRenderer) renderSkip(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	return ast.WalkSkipChildren, nil
}

// renderTable writes ||h|| for the header row and |c| for body rows, with cell
// text flattened and pipes escaped so a cell cannot split the row.
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
			_ = w.WriteByte('\n')
		}
		first = false
		separator := "|"
		if c.Kind() == extensionast.KindTableHeader {
			separator = "||"
		}
		_, _ = w.WriteString(separator)
		for cc := c.FirstChild(); cc != nil; cc = cc.NextSibling() {
			if cc.Kind() != extensionast.KindTableCell {
				continue
			}
			cell := strings.ReplaceAll(Escape(extractPlainText(cc, source)), "|", "\\|")
			if cell == "" {
				cell = " "
			}
			_, _ = w.WriteString(cell)
			_, _ = w.WriteString(separator)
		}
	}
	return ast.WalkSkipChildren, nil
}

// Escape neutralises the wiki control characters in plain text so alert
// content cannot open markup: { and [ always, ! when it could open an image,
// and an inline effect marker unless it sits between two letters or digits.
func Escape(s string) string {
	return escapeBetween(s, ' ', ' ')
}

// escapeBetween escapes s as Escape does, with prev and after standing in for
// the characters just before and just after it.
func escapeBetween(s string, prev, after rune) string {
	var out strings.Builder
	out.Grow(len(s))
	for i, c := range s {
		next, _ := utf8.DecodeRuneInString(s[i+utf8.RuneLen(c):])
		if next == utf8.RuneError {
			next = after
		}
		switch {
		case c == '{' || c == '[':
			out.WriteByte('\\')
		case c == '!' && next != utf8.RuneError && !unicode.IsSpace(next):
			out.WriteByte('\\')
		case strings.ContainsRune(inlineMarkers, c) && (!isWordRune(prev) || !isWordRune(next)):
			out.WriteByte('\\')
		}
		out.WriteRune(c)
		prev = c
	}
	return out.String()
}

func isWordRune(c rune) bool {
	return unicode.IsLetter(c) || unicode.IsDigit(c)
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
