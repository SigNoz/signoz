package blockkit

import (
	"bytes"
	"encoding/json"
	"strings"

	"github.com/SigNoz/signoz/pkg/types/templatingtypes"
	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/ast"
	"github.com/yuin/goldmark/extension"
	extensionast "github.com/yuin/goldmark/extension/ast"
	"github.com/yuin/goldmark/renderer"
	"github.com/yuin/goldmark/util"
)

// Extender is a goldmark.Extender that registers the Block Kit node renderer
// together with the GFM extensions it relies on (tables, strikethrough, task
// lists).
var Extender goldmark.Extender = &extender{}

type extender struct{}

func (e *extender) Extend(m goldmark.Markdown) {
	extension.Table.Extend(m)
	extension.Strikethrough.Extend(m)
	extension.TaskList.Extend(m)
	m.Renderer().AddOptions(
		renderer.WithNodeRenderers(util.Prioritized(newRenderer(), 1)),
	)
}

// listFrame tracks state for a single level of list nesting.
type listFrame struct {
	style     string // "bullet" or "ordered"
	indent    int
	itemCount int
}

// listContext holds all state while processing a list tree.
type listContext struct {
	result             []templatingtypes.RichTextList
	stack              []listFrame
	current            *templatingtypes.RichTextList
	currentItemInlines []interface{}
}

// tableContext holds state while processing a table.
type tableContext struct {
	rows               [][]templatingtypes.TableCell
	currentRow         []templatingtypes.TableCell
	currentCellInlines []interface{}
	isHeader           bool
}

// nodeRenderer converts Markdown AST to Slack Block Kit JSON.
type nodeRenderer struct {
	blocks []interface{}
	mrkdwn strings.Builder
	// holds active styles for the current rich text element
	styleStack []templatingtypes.RichTextStyle
	// holds the current list context while processing a list tree.
	listCtx *listContext
	// holds the current table context while processing a table.
	tableCtx *tableContext
	// stores the current blockquote depth while processing a blockquote.
	// so blockquote with nested list can be rendered correctly.
	blockquoteDepth int
}

func newRenderer() renderer.NodeRenderer {
	return &nodeRenderer{}
}

// RegisterFuncs registers node rendering functions.
func (r *nodeRenderer) RegisterFuncs(reg renderer.NodeRendererFuncRegisterer) {
	// Blocks
	reg.Register(ast.KindDocument, r.renderDocument)
	reg.Register(ast.KindHeading, r.renderHeading)
	reg.Register(ast.KindParagraph, r.renderParagraph)
	reg.Register(ast.KindThematicBreak, r.renderThematicBreak)
	reg.Register(ast.KindCodeBlock, r.renderCodeBlock)
	reg.Register(ast.KindFencedCodeBlock, r.renderFencedCodeBlock)
	reg.Register(ast.KindBlockquote, r.renderBlockquote)
	reg.Register(ast.KindList, r.renderList)
	reg.Register(ast.KindListItem, r.renderListItem)
	reg.Register(ast.KindImage, r.renderImage)

	// Inlines
	reg.Register(ast.KindText, r.renderText)
	reg.Register(ast.KindEmphasis, r.renderEmphasis)
	reg.Register(ast.KindCodeSpan, r.renderCodeSpan)
	reg.Register(ast.KindLink, r.renderLink)

	// Extensions
	reg.Register(extensionast.KindStrikethrough, r.renderStrikethrough)
	reg.Register(extensionast.KindTable, r.renderTable)
	reg.Register(extensionast.KindTableHeader, r.renderTableHeader)
	reg.Register(extensionast.KindTableRow, r.renderTableRow)
	reg.Register(extensionast.KindTableCell, r.renderTableCell)
	reg.Register(extensionast.KindTaskCheckBox, r.renderTaskCheckBox)
}

// inRichTextMode returns true when we're inside a list or table context
// in slack blockkit list and table items are rendered as rich_text elements
// if more cases are found in future those needs to be added here.
func (r *nodeRenderer) inRichTextMode() bool {
	return r.listCtx != nil || r.tableCtx != nil
}

// currentStyle merges the stored style stack into templatingtypes.RichTextStyle
// which can be applied on rich text elements.
func (r *nodeRenderer) currentStyle() *templatingtypes.RichTextStyle {
	s := templatingtypes.RichTextStyle{}
	for _, f := range r.styleStack {
		s.Bold = s.Bold || f.Bold
		s.Italic = s.Italic || f.Italic
		s.Strike = s.Strike || f.Strike
		s.Code = s.Code || f.Code
	}
	if s == (templatingtypes.RichTextStyle{}) {
		return nil
	}
	return &s
}

// flushMrkdwn collects markdown text and adds it as a templatingtypes.SectionBlock with mrkdwn text
// whenever starting a new block we flush markdown to render it as a separate block.
func (r *nodeRenderer) flushMrkdwn() {
	text := strings.TrimSpace(r.mrkdwn.String())
	if text != "" {
		r.blocks = append(r.blocks, templatingtypes.SectionBlock{
			Type: "section",
			Text: &templatingtypes.TextObject{
				Type: "mrkdwn",
				Text: text,
			},
		})
	}
	r.mrkdwn.Reset()
}

// addInline adds an inline element to the appropriate context.
func (r *nodeRenderer) addInline(el interface{}) {
	if r.listCtx != nil {
		r.listCtx.currentItemInlines = append(r.listCtx.currentItemInlines, el)
	} else if r.tableCtx != nil {
		r.tableCtx.currentCellInlines = append(r.tableCtx.currentCellInlines, el)
	}
}

// --- Document ---

func (r *nodeRenderer) renderDocument(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		r.blocks = nil
		r.mrkdwn.Reset()
		r.styleStack = nil
		r.listCtx = nil
		r.tableCtx = nil
		r.blockquoteDepth = 0
	} else {
		// on exiting the document node write the json for the collected blocks.
		r.flushMrkdwn()
		var data []byte
		var err error
		if len(r.blocks) > 0 {
			data, err = json.Marshal(r.blocks)
			if err != nil {
				return ast.WalkStop, err
			}
		} else {
			// if no blocks are collected, write an empty array.
			data = []byte("[]")
		}
		_, err = w.Write(data)
		if err != nil {
			return ast.WalkStop, err
		}
	}
	return ast.WalkContinue, nil
}

// --- Heading ---

func (r *nodeRenderer) renderHeading(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		r.mrkdwn.WriteString("*")
	} else {
		r.mrkdwn.WriteString("*\n")
	}
	return ast.WalkContinue, nil
}

// --- Paragraph ---

func (r *nodeRenderer) renderParagraph(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		if r.mrkdwn.Len() > 0 {
			text := r.mrkdwn.String()
			if !strings.HasSuffix(text, "\n") {
				r.mrkdwn.WriteString("\n")
			}
		}
		// handling of nested blockquotes
		if r.blockquoteDepth > 0 {
			r.mrkdwn.WriteString(strings.Repeat("> ", r.blockquoteDepth))
		}
	}
	return ast.WalkContinue, nil
}

// --- ThematicBreak ---

func (r *nodeRenderer) renderThematicBreak(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		r.flushMrkdwn()
		r.blocks = append(r.blocks, templatingtypes.DividerBlock{Type: "divider"})
	}
	return ast.WalkContinue, nil
}

// --- CodeBlock (indented) ---

func (r *nodeRenderer) renderCodeBlock(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if !entering {
		return ast.WalkContinue, nil
	}
	r.flushMrkdwn()

	var buf bytes.Buffer
	lines := node.Lines()
	for i := 0; i < lines.Len(); i++ {
		line := lines.At(i)
		buf.Write(line.Value(source))
	}

	text := buf.String()
	// Remove trailing newline
	text = strings.TrimRight(text, "\n")
	// Slack API rejects empty text in rich_text_preformatted elements
	if text == "" {
		text = " "
	}

	elements := []interface{}{
		templatingtypes.RichTextInline{Type: "text", Text: text},
	}

	r.blocks = append(r.blocks, templatingtypes.RichTextBlock{
		Type: "rich_text",
		Elements: []interface{}{
			templatingtypes.RichTextPreformatted{
				Type:     "rich_text_preformatted",
				Elements: elements,
				Border:   0,
			},
		},
	})
	return ast.WalkContinue, nil
}

// --- FencedCodeBlock ---

func (r *nodeRenderer) renderFencedCodeBlock(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if !entering {
		return ast.WalkContinue, nil
	}
	r.flushMrkdwn()

	n := node.(*ast.FencedCodeBlock)
	var buf bytes.Buffer
	lines := node.Lines()
	for i := 0; i < lines.Len(); i++ {
		line := lines.At(i)
		buf.Write(line.Value(source))
	}

	text := buf.String()
	text = strings.TrimRight(text, "\n")
	// Slack API rejects empty text in rich_text_preformatted elements
	if text == "" {
		text = " "
	}

	elements := []interface{}{
		templatingtypes.RichTextInline{Type: "text", Text: text},
	}

	// If language is specified, collect it.
	var language string
	lang := n.Language(source)
	if len(lang) > 0 {
		language = string(lang)
	}
	// Add the preformatted block to the blocks slice with the collected language.
	r.blocks = append(r.blocks, templatingtypes.RichTextBlock{
		Type: "rich_text",
		Elements: []interface{}{
			templatingtypes.RichTextPreformatted{
				Type:     "rich_text_preformatted",
				Elements: elements,
				Border:   0,
				Language: language,
			},
		},
	})

	return ast.WalkSkipChildren, nil
}

// --- Blockquote ---

func (r *nodeRenderer) renderBlockquote(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		r.blockquoteDepth++
	} else {
		r.blockquoteDepth--
	}
	return ast.WalkContinue, nil
}

// --- List ---

func (r *nodeRenderer) renderList(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	list := node.(*ast.List)

	if entering {
		style := "bullet"
		if list.IsOrdered() {
			style = "ordered"
		}

		if r.listCtx == nil {
			// Top-level list: flush mrkdwn and create context
			r.flushMrkdwn()
			r.listCtx = &listContext{}
		} else {
			// Nested list: check if we already have some collected list items that needs to be flushed.
			// in slack blockkit, list items with different levels of indentation are added as different rich_text_list blocks.
			if len(r.listCtx.currentItemInlines) > 0 {
				sec := templatingtypes.RichTextBlock{
					Type:     "rich_text_section",
					Elements: r.listCtx.currentItemInlines,
				}
				if r.listCtx.current != nil {
					r.listCtx.current.Elements = append(r.listCtx.current.Elements, sec)
				}
				r.listCtx.currentItemInlines = nil
				// Increment parent's itemCount
				if len(r.listCtx.stack) > 0 {
					r.listCtx.stack[len(r.listCtx.stack)-1].itemCount++
				}
			}
			// Finalize current list to result only if items were collected
			if r.listCtx.current != nil && len(r.listCtx.current.Elements) > 0 {
				r.listCtx.result = append(r.listCtx.result, *r.listCtx.current)
			}
		}

		// the stack accumulated till this level derives hte indentation
		// the stack get's collected as we go in more nested levels of list
		// and as we get our of the nesting we remove the items from the slack
		indent := len(r.listCtx.stack)
		r.listCtx.stack = append(r.listCtx.stack, listFrame{
			style:     style,
			indent:    indent,
			itemCount: 0,
		})

		newList := &templatingtypes.RichTextList{
			Type:     "rich_text_list",
			Style:    style,
			Indent:   indent,
			Border:   0,
			Elements: []interface{}{},
		}

		// Handle ordered list with start > 1
		if list.IsOrdered() && list.Start > 1 {
			newList.Offset = list.Start - 1
		}

		r.listCtx.current = newList

	} else {
		// Leaving list: finalize current list
		if r.listCtx.current != nil && len(r.listCtx.current.Elements) > 0 {
			r.listCtx.result = append(r.listCtx.result, *r.listCtx.current)
		}

		// Pop stack to so upcoming indentations can be handled correctly.
		r.listCtx.stack = r.listCtx.stack[:len(r.listCtx.stack)-1]

		if len(r.listCtx.stack) > 0 {
			// Resume parent: start a new list segment at parent indent/style
			parent := &r.listCtx.stack[len(r.listCtx.stack)-1]
			newList := &templatingtypes.RichTextList{
				Type:     "rich_text_list",
				Style:    parent.style,
				Indent:   parent.indent,
				Border:   0,
				Elements: []interface{}{},
			}
			// Set offset for ordered parent continuation
			if parent.style == "ordered" && parent.itemCount > 0 {
				newList.Offset = parent.itemCount
			}
			r.listCtx.current = newList
		} else {
			// Top-level list is done since all stack are popped: build templatingtypes.RichTextBlock if non-empty
			if len(r.listCtx.result) > 0 {
				elements := make([]interface{}, len(r.listCtx.result))
				for i, l := range r.listCtx.result {
					elements[i] = l
				}
				r.blocks = append(r.blocks, templatingtypes.RichTextBlock{
					Type:     "rich_text",
					Elements: elements,
				})
			}
			r.listCtx = nil
		}
	}

	return ast.WalkContinue, nil
}

// --- ListItem ---

func (r *nodeRenderer) renderListItem(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		r.listCtx.currentItemInlines = nil
	} else {
		// Only add if there are inlines (might be empty after nested list consumed them)
		if len(r.listCtx.currentItemInlines) > 0 {
			sec := templatingtypes.RichTextBlock{
				Type:     "rich_text_section",
				Elements: r.listCtx.currentItemInlines,
			}
			if r.listCtx.current != nil {
				r.listCtx.current.Elements = append(r.listCtx.current.Elements, sec)
			}
			r.listCtx.currentItemInlines = nil
			// Increment parent frame's itemCount
			if len(r.listCtx.stack) > 0 {
				r.listCtx.stack[len(r.listCtx.stack)-1].itemCount++
			}
		}
	}

	return ast.WalkContinue, nil
}

// --- Table ---
// when table is encountered, we flush the markdown and create a table context.
// when header row is encountered, we set the isHeader flag to true
// when each row ends in renderTableRow we add that row to rows array of table context.
// when table cell is encountered, we apply header related styles to the collected inline items,
// all inline items are parsed as separate AST items like list item, links, text, etc. are collected
// using the addInline function and wrapped in a rich_text_section block.

func (r *nodeRenderer) renderTable(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		r.flushMrkdwn()
		r.tableCtx = &tableContext{}
	} else {
		// Pad short rows to match header column count for valid Block Kit payload
		// without this slack blockkit attachment is invalid and the API fails
		rows := r.tableCtx.rows
		if len(rows) > 0 {
			maxCols := len(rows[0])
			for i, row := range rows {
				for len(row) < maxCols {
					emptySec := templatingtypes.RichTextBlock{
						Type:     "rich_text_section",
						Elements: []interface{}{templatingtypes.RichTextInline{Type: "text", Text: " "}},
					}
					row = append(row, templatingtypes.TableCell{
						Type:     "rich_text",
						Elements: []interface{}{emptySec},
					})
				}
				rows[i] = row
			}
		}
		r.blocks = append(r.blocks, templatingtypes.TableBlock{
			Type: "table",
			Rows: rows,
		})
		r.tableCtx = nil
	}
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderTableHeader(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		r.tableCtx.isHeader = true
		r.tableCtx.currentRow = nil
	} else {
		r.tableCtx.rows = append(r.tableCtx.rows, r.tableCtx.currentRow)
		r.tableCtx.currentRow = nil
		r.tableCtx.isHeader = false
	}
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderTableRow(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		r.tableCtx.currentRow = nil
	} else {
		r.tableCtx.rows = append(r.tableCtx.rows, r.tableCtx.currentRow)
		r.tableCtx.currentRow = nil
	}
	return ast.WalkContinue, nil
}

func (r *nodeRenderer) renderTableCell(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if entering {
		r.tableCtx.currentCellInlines = nil
	} else {
		// If header, make text bold for the collected inline items.
		if r.tableCtx.isHeader {
			for i, el := range r.tableCtx.currentCellInlines {
				if inline, ok := el.(templatingtypes.RichTextInline); ok {
					if inline.Style == nil {
						inline.Style = &templatingtypes.RichTextStyle{Bold: true}
					} else {
						inline.Style.Bold = true
					}
					r.tableCtx.currentCellInlines[i] = inline
				}
			}
		}
		// Ensure cell has at least one element for valid Block Kit payload
		if len(r.tableCtx.currentCellInlines) == 0 {
			r.tableCtx.currentCellInlines = []interface{}{
				templatingtypes.RichTextInline{Type: "text", Text: " "},
			}
		}
		// All inline items that are collected for a table cell are wrapped in a rich_text_section block.
		sec := templatingtypes.RichTextBlock{
			Type:     "rich_text_section",
			Elements: r.tableCtx.currentCellInlines,
		}
		// The rich_text_section block is wrapped in a rich_text block.
		cell := templatingtypes.TableCell{
			Type:     "rich_text",
			Elements: []interface{}{sec},
		}
		r.tableCtx.currentRow = append(r.tableCtx.currentRow, cell)
		r.tableCtx.currentCellInlines = nil
	}
	return ast.WalkContinue, nil
}

// --- TaskCheckBox ---

func (r *nodeRenderer) renderTaskCheckBox(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if !entering {
		return ast.WalkContinue, nil
	}
	n := node.(*extensionast.TaskCheckBox)
	text := "[ ] "
	if n.IsChecked {
		text = "[x] "
	}
	if r.inRichTextMode() {
		r.addInline(templatingtypes.RichTextInline{Type: "text", Text: text})
	} else {
		r.mrkdwn.WriteString(text)
	}
	return ast.WalkContinue, nil
}

// --- Inline: Text ---

func (r *nodeRenderer) renderText(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if !entering {
		return ast.WalkContinue, nil
	}
	n := node.(*ast.Text)
	value := string(n.Segment.Value(source))

	if r.inRichTextMode() {
		r.addInline(templatingtypes.RichTextInline{
			Type:  "text",
			Text:  value,
			Style: r.currentStyle(),
		})
		if n.HardLineBreak() || n.SoftLineBreak() {
			r.addInline(templatingtypes.RichTextInline{Type: "text", Text: "\n"})
		}
	} else {
		r.mrkdwn.WriteString(value)
		if n.HardLineBreak() || n.SoftLineBreak() {
			r.mrkdwn.WriteString("\n")
			if r.blockquoteDepth > 0 {
				r.mrkdwn.WriteString(strings.Repeat("> ", r.blockquoteDepth))
			}
		}
	}
	return ast.WalkContinue, nil
}

// --- Inline: Emphasis ---

func (r *nodeRenderer) renderEmphasis(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	n := node.(*ast.Emphasis)
	if r.inRichTextMode() {
		if entering {
			s := templatingtypes.RichTextStyle{}
			if n.Level == 1 {
				s.Italic = true
			} else {
				s.Bold = true
			}
			r.styleStack = append(r.styleStack, s)
		} else {
			// the collected style gets used by the rich text element using currentStyle()
			// so we remove this style from the stack.
			if len(r.styleStack) > 0 {
				r.styleStack = r.styleStack[:len(r.styleStack)-1]
			}
		}
	} else {
		if n.Level == 1 {
			r.mrkdwn.WriteString("_")
		} else {
			r.mrkdwn.WriteString("*")
		}
	}
	return ast.WalkContinue, nil
}

// --- Inline: Strikethrough ---

func (r *nodeRenderer) renderStrikethrough(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if r.inRichTextMode() {
		if entering {
			r.styleStack = append(r.styleStack, templatingtypes.RichTextStyle{Strike: true})
		} else {
			// the collected style gets used by the rich text element using currentStyle()
			// so we remove this style from the stack.
			if len(r.styleStack) > 0 {
				r.styleStack = r.styleStack[:len(r.styleStack)-1]
			}
		}
	} else {
		r.mrkdwn.WriteString("~")
	}
	return ast.WalkContinue, nil
}

// --- Inline: CodeSpan ---

func (r *nodeRenderer) renderCodeSpan(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	if !entering {
		return ast.WalkContinue, nil
	}
	if r.inRichTextMode() {
		// Collect all child text
		var buf bytes.Buffer
		for c := node.FirstChild(); c != nil; c = c.NextSibling() {
			if t, ok := c.(*ast.Text); ok {
				v := t.Segment.Value(source)
				if bytes.HasSuffix(v, []byte("\n")) {
					buf.Write(v[:len(v)-1])
					buf.WriteByte(' ')
				} else {
					buf.Write(v)
				}
			} else if s, ok := c.(*ast.String); ok {
				buf.Write(s.Value)
			}
		}
		style := r.currentStyle()
		if style == nil {
			style = &templatingtypes.RichTextStyle{Code: true}
		} else {
			style.Code = true
		}
		r.addInline(templatingtypes.RichTextInline{
			Type:  "text",
			Text:  buf.String(),
			Style: style,
		})
		return ast.WalkSkipChildren, nil
	}
	// mrkdwn mode
	r.mrkdwn.WriteByte('`')
	for c := node.FirstChild(); c != nil; c = c.NextSibling() {
		if t, ok := c.(*ast.Text); ok {
			v := t.Segment.Value(source)
			if bytes.HasSuffix(v, []byte("\n")) {
				r.mrkdwn.Write(v[:len(v)-1])
				r.mrkdwn.WriteByte(' ')
			} else {
				r.mrkdwn.Write(v)
			}
		} else if s, ok := c.(*ast.String); ok {
			r.mrkdwn.Write(s.Value)
		}
	}
	r.mrkdwn.WriteByte('`')
	return ast.WalkSkipChildren, nil
}

// --- Inline: Link ---

func (r *nodeRenderer) renderLink(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	n := node.(*ast.Link)
	if r.inRichTextMode() {
		if entering {
			// Walk the entire subtree to collect text from all descendants,
			// including nested inline nodes like emphasis, strong, code spans, etc.
			var buf bytes.Buffer
			_ = ast.Walk(node, func(child ast.Node, entering bool) (ast.WalkStatus, error) {
				if !entering || child == node {
					return ast.WalkContinue, nil
				}
				if t, ok := child.(*ast.Text); ok {
					buf.Write(t.Segment.Value(source))
				} else if s, ok := child.(*ast.String); ok {
					buf.Write(s.Value)
				}
				return ast.WalkContinue, nil
			})
			// Once we've collected the text for the link (given it was present)
			// let's add the link to the rich text block.
			r.addInline(templatingtypes.RichTextLink{
				Type:  "link",
				URL:   string(n.Destination),
				Text:  buf.String(),
				Style: r.currentStyle(),
			})
			return ast.WalkSkipChildren, nil
		}
	} else {
		if entering {
			r.mrkdwn.WriteString("<")
			r.mrkdwn.Write(n.Destination)
			r.mrkdwn.WriteString("|")
		} else {
			r.mrkdwn.WriteString(">")
		}
	}
	return ast.WalkContinue, nil
}

// --- Image (skip) ---

func (r *nodeRenderer) renderImage(w util.BufWriter, source []byte, node ast.Node, entering bool) (ast.WalkStatus, error) {
	return ast.WalkSkipChildren, nil
}
