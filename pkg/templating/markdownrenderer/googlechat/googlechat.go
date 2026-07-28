// Copyright (c) 2026 SigNoz, Inc.
// SPDX-License-Identifier: Apache-2.0

package googlechat

import (
	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/ast"
	"github.com/yuin/goldmark/extension"
	extensionast "github.com/yuin/goldmark/extension/ast"
	"github.com/yuin/goldmark/renderer"
	"github.com/yuin/goldmark/util"
)

// Extender is a goldmark extension that converts markdown to Google Chat format.
var Extender = &extender{}

type extender struct{}

func (e *extender) Extend(m goldmark.Markdown) {
	// Add strikethrough extension to parse ~~text~~ properly
	extension.Strikethrough.Extend(m)
	m.Renderer().AddOptions(
		renderer.WithNodeRenderers(util.Prioritized(&googlechatRenderer{}, 0)),
	)
}

type googlechatRenderer struct{}

// RegisterFuncs implements renderer.NodeRenderer.
func (r *googlechatRenderer) RegisterFuncs(reg renderer.NodeRendererFuncRegisterer) {
	// Inline elements
	reg.Register(ast.KindText, r.renderText)
	reg.Register(ast.KindString, r.renderString)
	reg.Register(ast.KindEmphasis, r.renderEmphasis)
	reg.Register(ast.KindCodeSpan, r.renderCodeSpan)
	reg.Register(ast.KindLink, r.renderLink)
	reg.Register(ast.KindAutoLink, r.renderAutoLink)

	// Extensions
	reg.Register(extensionast.KindStrikethrough, r.renderStrikethrough)

	// Block elements
	reg.Register(ast.KindParagraph, r.renderParagraph)
	reg.Register(ast.KindHeading, r.renderHeading)
	reg.Register(ast.KindBlockquote, r.renderBlockquote)
	reg.Register(ast.KindList, r.renderList)
	reg.Register(ast.KindListItem, r.renderListItem)
	reg.Register(ast.KindFencedCodeBlock, r.renderFencedCodeBlock)
	reg.Register(ast.KindCodeBlock, r.renderCodeBlock)
	reg.Register(ast.KindThematicBreak, r.renderThematicBreak)

	// Document
	reg.Register(ast.KindDocument, r.renderDocument)
}

func (r *googlechatRenderer) renderText(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		n := node.(*ast.Text)
		_, _ = w.Write(n.Segment.Value(source))
		if n.SoftLineBreak() {
			_ = w.WriteByte('\n')
		} else if n.HardLineBreak() {
			_ = w.WriteByte('\n')
		}
	}
	return ast.WalkContinue, nil
}

func (r *googlechatRenderer) renderString(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		n := node.(*ast.String)
		_, _ = w.Write(n.Value)
	}
	return ast.WalkContinue, nil
}

func (r *googlechatRenderer) renderEmphasis(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	n := node.(*ast.Emphasis)

	if n.Level == 2 {
		// Strong/bold: **text** → *text*
		_ = w.WriteByte('*')
	} else {
		// Emphasis/italic: *text* or _text_ → _text_
		_ = w.WriteByte('_')
	}
	return ast.WalkContinue, nil
}

func (r *googlechatRenderer) renderCodeSpan(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		_ = w.WriteByte('`')
		for c := node.FirstChild(); c != nil; c = c.NextSibling() {
			segment := c.(*ast.Text).Segment
			_, _ = w.Write(segment.Value(source))
		}
		_ = w.WriteByte('`')
	}
	return ast.WalkSkipChildren, nil
}

func (r *googlechatRenderer) renderLink(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	n := node.(*ast.Link)

	if entering {
		// Convert [text](url) → <url|text>
		url := string(n.Destination)
		_ = w.WriteByte('<')
		_, _ = w.WriteString(url)
		_ = w.WriteByte('|')
	} else {
		_ = w.WriteByte('>')
	}
	return ast.WalkContinue, nil
}

func (r *googlechatRenderer) renderAutoLink(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	n := node.(*ast.AutoLink)
	if entering {
		// Auto links can be plain URLs
		_, _ = w.Write(n.URL(source))
	}
	return ast.WalkContinue, nil
}

func (r *googlechatRenderer) renderParagraph(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if !entering && node.NextSibling() != nil {
		// Add blank line between paragraphs
		_, _ = w.WriteString("\n\n")
	}
	return ast.WalkContinue, nil
}

func (r *googlechatRenderer) renderHeading(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	// Google Chat doesn't support headings in webhooks, so render as bold text
	if entering {
		_ = w.WriteByte('*')
	} else {
		_ = w.WriteByte('*')
		if node.NextSibling() != nil {
			_, _ = w.WriteString("\n\n")
		}
	}
	return ast.WalkContinue, nil
}

func (r *googlechatRenderer) renderBlockquote(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		_ = w.WriteByte('>')
	} else if node.NextSibling() != nil {
		_, _ = w.WriteString("\n\n")
	}
	return ast.WalkContinue, nil
}

func (r *googlechatRenderer) renderList(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if !entering && node.NextSibling() != nil {
		_, _ = w.WriteString("\n\n")
	}
	return ast.WalkContinue, nil
}

func (r *googlechatRenderer) renderListItem(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		// Use * for bullet points
		_, _ = w.WriteString("* ")
	} else {
		_ = w.WriteByte('\n')
	}
	return ast.WalkContinue, nil
}

func (r *googlechatRenderer) renderFencedCodeBlock(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		_, _ = w.WriteString("```\n")
		lines := node.Lines()
		for i := 0; i < lines.Len(); i++ {
			line := lines.At(i)
			_, _ = w.Write(line.Value(source))
		}
		_, _ = w.WriteString("```")
		if node.NextSibling() != nil {
			_, _ = w.WriteString("\n\n")
		}
	}
	return ast.WalkSkipChildren, nil
}

func (r *googlechatRenderer) renderCodeBlock(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		_, _ = w.WriteString("```\n")
		lines := node.Lines()
		for i := 0; i < lines.Len(); i++ {
			line := lines.At(i)
			_, _ = w.Write(line.Value(source))
		}
		_, _ = w.WriteString("```")
		if node.NextSibling() != nil {
			_, _ = w.WriteString("\n\n")
		}
	}
	return ast.WalkSkipChildren, nil
}

func (r *googlechatRenderer) renderThematicBreak(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		// Google Chat doesn't have horizontal rules, use a line of dashes
		_, _ = w.WriteString("---")
		if node.NextSibling() != nil {
			_, _ = w.WriteString("\n\n")
		}
	}
	return ast.WalkContinue, nil
}

func (r *googlechatRenderer) renderDocument(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	// Document doesn't render anything itself
	return ast.WalkContinue, nil
}

func (r *googlechatRenderer) renderStrikethrough(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	// Google Chat uses single tilde for strikethrough
	_ = w.WriteByte('~')
	return ast.WalkContinue, nil
}
