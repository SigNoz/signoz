package mrkdwn

import (
	"bytes"
	"fmt"
	"strings"
	"unicode/utf8"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/ast"
	"github.com/yuin/goldmark/extension"
	extensionast "github.com/yuin/goldmark/extension/ast"
	"github.com/yuin/goldmark/renderer"
	"github.com/yuin/goldmark/util"
)

// Extender is a goldmark.Extender that registers the Slack mrkdwn node
// renderer together with the GFM extensions it relies on (tables,
// strikethrough).
var Extender goldmark.Extender = &extender{}

type extender struct{}

func (e *extender) Extend(m goldmark.Markdown) {
	extension.Table.Extend(m)
	extension.Strikethrough.Extend(m)
	m.Renderer().AddOptions(
		renderer.WithNodeRenderers(util.Prioritized(newRenderer(), 1)),
	)
}

// nodeRenderer renders nodes as Slack mrkdwn.
type nodeRenderer struct {
	prefixes []string
}

func newRenderer() renderer.NodeRenderer {
	return &nodeRenderer{}
}

// RegisterFuncs implements NodeRenderer.RegisterFuncs.
func (r *nodeRenderer) RegisterFuncs(reg renderer.NodeRendererFuncRegisterer) {
	// Blocks
	reg.Register(ast.KindDocument, r.renderDocument)
	reg.Register(ast.KindHeading, r.renderHeading)
	reg.Register(ast.KindBlockquote, r.renderBlockquote)
	reg.Register(ast.KindCodeBlock, r.renderCodeBlock)
	reg.Register(ast.KindFencedCodeBlock, r.renderCodeBlock)
	reg.Register(ast.KindList, r.renderList)
	reg.Register(ast.KindListItem, r.renderListItem)
	reg.Register(ast.KindParagraph, r.renderParagraph)
	reg.Register(ast.KindTextBlock, r.renderTextBlock)
	reg.Register(ast.KindRawHTML, r.renderRawHTML)
	reg.Register(ast.KindThematicBreak, r.renderThematicBreak)

	// Inlines
	reg.Register(ast.KindAutoLink, r.renderAutoLink)
	reg.Register(ast.KindCodeSpan, r.renderCodeSpan)
	reg.Register(ast.KindEmphasis, r.renderEmphasis)
	reg.Register(ast.KindImage, r.renderImage)
	reg.Register(ast.KindLink, r.renderLink)
	reg.Register(ast.KindText, r.renderText)

	// Extensions
	reg.Register(extensionast.KindStrikethrough, r.renderStrikethrough)
	reg.Register(extensionast.KindTable, r.renderTable)
}

func (r *nodeRenderer) writePrefix(w util.BufWriter) {
	for _, p := range r.prefixes {
		_, _ = w.WriteString(p)
	}
}

// writeLineSeparator writes a newline followed by the current prefix.
// Used for tight separations (e.g., between list items or text blocks).
func (r *nodeRenderer) writeLineSeparator(w util.BufWriter) {
	_ = w.WriteByte('\n')
	r.writePrefix(w)
}

// writeBlockSeparator writes a blank line separator between block-level elements,
// respecting any active prefixes for proper nesting (e.g., inside blockquotes).
func (r *nodeRenderer) writeBlockSeparator(w util.BufWriter) {
	r.writeLineSeparator(w)
	r.writeLineSeparator(w)
}

// separateFromPrevious writes a block separator if the node has a previous sibling.
func (r *nodeRenderer) separateFromPrevious(w util.BufWriter, n ast.Node) {
	if n.PreviousSibling() != nil {
		r.writeBlockSeparator(w)
	}
}

func (r *nodeRenderer) renderDocument(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		// The renderer is pooled, so wipe any prefix stack left over from a
		// prior document (e.g. one that errored mid-walk and left push/pop
		// unbalanced) before starting a fresh convert.
		r.prefixes = r.prefixes[:0]
	} else {
		_, _ = w.WriteString("\n\n")
	}
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderHeading(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		r.separateFromPrevious(w, node)
	}
	_, _ = w.WriteString("*")
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderBlockquote(w util.BufWriter, source []byte, n ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		r.separateFromPrevious(w, n)
		r.prefixes = append(r.prefixes, "> ")
		_, _ = w.WriteString("> ")
	} else {
		r.prefixes = r.prefixes[:len(r.prefixes)-1]
	}
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderCodeBlock(w util.BufWriter, source []byte, n ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		r.separateFromPrevious(w, n)
		// start code block and write code line by line
		_, _ = w.WriteString("```\n")
		l := n.Lines().Len()
		for i := 0; i < l; i++ {
			line := n.Lines().At(i)
			v := line.Value(source)
			_, _ = w.Write(v)
		}
	} else {
		_, _ = w.WriteString("```")
	}
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderList(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		if node.PreviousSibling() != nil {
			r.writeLineSeparator(w)
			// another line break if not a nested list item and starting another block
			if node.Parent() == nil || node.Parent().Kind() != ast.KindListItem {
				r.writeLineSeparator(w)
			}
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
		// compute and write the prefix based on list type and index
		var prefixStr string
		if parent.IsOrdered() {
			index := parent.Start
			for c := parent.FirstChild(); c != nil && c != n; c = c.NextSibling() {
				index++
			}
			prefixStr = fmt.Sprintf("%d. ", index)
		} else {
			prefixStr = "• "
		}
		_, _ = w.WriteString(prefixStr)
		r.prefixes = append(r.prefixes, "\t") // add tab for nested list items
	} else {
		r.prefixes = r.prefixes[:len(r.prefixes)-1]
	}
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderParagraph(w util.BufWriter, source []byte, n ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		r.separateFromPrevious(w, n)
	}
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderTextBlock(w util.BufWriter, source []byte, n ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering && n.PreviousSibling() != nil {
		r.writeLineSeparator(w)
	}
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderRawHTML(w util.BufWriter, source []byte, n ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		n := n.(*ast.RawHTML)
		l := n.Segments.Len()
		for i := 0; i < l; i++ {
			segment := n.Segments.At(i)
			_, _ = w.Write(segment.Value(source))
		}
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
	label := string(n.Label(source))

	if n.AutoLinkType == ast.AutoLinkEmail && !strings.HasPrefix(strings.ToLower(url), "mailto:") {
		url = "mailto:" + url
	}

	if url == label {
		_, _ = fmt.Fprintf(w, "<%s>", url)
	} else {
		_, _ = fmt.Fprintf(w, "<%s|%s>", url, label)
	}
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderCodeSpan(w util.BufWriter, source []byte, n ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		_ = w.WriteByte('`')
		for c := n.FirstChild(); c != nil; c = c.NextSibling() {
			segment := c.(*ast.Text).Segment
			value := segment.Value(source)
			if bytes.HasSuffix(value, []byte("\n")) { // replace newline with space
				_, _ = w.Write(value[:len(value)-1])
				_ = w.WriteByte(' ')
			} else {
				_, _ = w.Write(value)
			}
		}
		return ast.WalkSkipChildren, nil
	}
	_ = w.WriteByte('`')
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderEmphasis(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	n := node.(*ast.Emphasis)
	mark := "_"
	if n.Level == 2 {
		mark = "*"
	}
	_, _ = w.WriteString(mark)
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderLink(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	n := node.(*ast.Link)
	if entering {
		_, _ = w.WriteString("<")
		_, _ = w.Write(util.URLEscape(n.Destination, true))
		_, _ = w.WriteString("|")
	} else {
		_, _ = w.WriteString(">")
	}
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderImage(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if !entering {
		return ast.WalkContinue, nil
	}
	n := node.(*ast.Image)
	_, _ = w.WriteString("<")
	_, _ = w.Write(util.URLEscape(n.Destination, true))
	_, _ = w.WriteString("|")

	// Write the alt text directly
	var altBuf bytes.Buffer
	for c := n.FirstChild(); c != nil; c = c.NextSibling() {
		if textNode, ok := c.(*ast.Text); ok {
			altBuf.Write(textNode.Segment.Value(source))
		}
	}
	_, _ = w.Write(altBuf.Bytes())

	_, _ = w.WriteString(">")
	return ast.WalkSkipChildren, nil
}

func (r *nodeRenderer) renderText(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if !entering {
		return ast.WalkContinue, nil
	}
	n := node.(*ast.Text)
	segment := n.Segment
	value := segment.Value(source)
	_, _ = w.Write(value)
	if n.HardLineBreak() || n.SoftLineBreak() {
		r.writeLineSeparator(w)
	}
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderStrikethrough(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	_, _ = w.WriteString("~")
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderTable(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if !entering {
		return ast.WalkContinue, nil
	}

	r.separateFromPrevious(w, node)

	// Collect cells and max widths
	var rows [][]string
	var colWidths []int

	for c := node.FirstChild(); c != nil; c = c.NextSibling() {
		if c.Kind() == extensionast.KindTableHeader || c.Kind() == extensionast.KindTableRow {
			var row []string
			colIdx := 0
			for cc := c.FirstChild(); cc != nil; cc = cc.NextSibling() {
				if cc.Kind() == extensionast.KindTableCell {
					cellText := extractPlainText(cc, source)
					row = append(row, cellText)
					runeLen := utf8.RuneCountInString(cellText)
					if colIdx >= len(colWidths) {
						colWidths = append(colWidths, runeLen)
					} else if runeLen > colWidths[colIdx] {
						colWidths[colIdx] = runeLen
					}
					colIdx++
				}
			}
			rows = append(rows, row)
		}
	}

	// writing table in code block
	_, _ = w.WriteString("```\n")
	for i, row := range rows {
		for colIdx, cellText := range row {
			width := 0
			if colIdx < len(colWidths) {
				width = colWidths[colIdx]
			}
			runeLen := utf8.RuneCountInString(cellText)
			padding := max(0, width-runeLen)

			_, _ = w.WriteString(cellText)
			_, _ = w.WriteString(strings.Repeat(" ", padding))
			if colIdx < len(row)-1 {
				_, _ = w.WriteString(" | ")
			}
		}
		_ = w.WriteByte('\n')

		// Print separator after header
		if i == 0 {
			for colIdx := range row {
				width := 0
				if colIdx < len(colWidths) {
					width = colWidths[colIdx]
				}
				_, _ = w.WriteString(strings.Repeat("-", width))
				if colIdx < len(row)-1 {
					_, _ = w.WriteString("-|-")
				}
			}
			_ = w.WriteByte('\n')
		}
	}
	_, _ = w.WriteString("```")

	return ast.WalkSkipChildren, nil
}

// extractPlainText extracts all the text content from the given node.
func extractPlainText(n ast.Node, source []byte) string {
	var buf bytes.Buffer
	_ = ast.Walk(n, func(node ast.Node, entering bool) (ast.WalkStatus, error) {
		if !entering {
			return ast.WalkContinue, nil
		}
		if textNode, ok := node.(*ast.Text); ok {
			buf.Write(textNode.Segment.Value(source))
		} else if strNode, ok := node.(*ast.String); ok {
			buf.Write(strNode.Value)
		}
		return ast.WalkContinue, nil
	})
	return strings.TrimSpace(buf.String())
}
