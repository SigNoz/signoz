// Package templatingtypes holds the data types produced by the markdown
// renderers under pkg/templating (e.g. Slack Block Kit JSON DTOs).
package templatingtypes

// SectionBlock represents a Slack section block with mrkdwn text.
type SectionBlock struct {
	Type string      `json:"type"`
	Text *TextObject `json:"text"`
}

// DividerBlock represents a Slack divider block.
type DividerBlock struct {
	Type string `json:"type"`
}

// RichTextBlock is a container for rich text elements (lists, code blocks,
// table and cell blocks).
type RichTextBlock struct {
	Type     string `json:"type"`
	Elements []any  `json:"elements"`
}

// TableBlock represents a Slack table rendered as a rich_text block with
// preformatted text.
type TableBlock struct {
	Type string        `json:"type"`
	Rows [][]TableCell `json:"rows"`
}

// TableCell is a cell in a TableBlock.
type TableCell struct {
	Type     string `json:"type"`
	Elements []any  `json:"elements"`
}

// TextObject is the text field inside a SectionBlock.
type TextObject struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

// RichTextList represents an ordered or unordered list.
type RichTextList struct {
	Type     string `json:"type"`
	Style    string `json:"style"`
	Indent   int    `json:"indent"`
	Border   int    `json:"border"`
	Offset   int    `json:"offset,omitempty"`
	Elements []any  `json:"elements"`
}

// RichTextPreformatted represents a code block.
type RichTextPreformatted struct {
	Type     string `json:"type"`
	Elements []any  `json:"elements"`
	Border   int    `json:"border"`
	Language string `json:"language,omitempty"`
}

// RichTextInline represents inline text with optional styling, e.g. text
// inside a list or a table cell.
type RichTextInline struct {
	Type  string         `json:"type"`
	Text  string         `json:"text"`
	Style *RichTextStyle `json:"style,omitempty"`
}

// RichTextLink represents a link inside rich text, e.g. a link inside a list
// or a table cell.
type RichTextLink struct {
	Type  string         `json:"type"`
	URL   string         `json:"url"`
	Text  string         `json:"text,omitempty"`
	Style *RichTextStyle `json:"style,omitempty"`
}

// RichTextStyle toggles inline styling on a rich-text element.
type RichTextStyle struct {
	Bold   bool `json:"bold,omitempty"`
	Italic bool `json:"italic,omitempty"`
	Strike bool `json:"strike,omitempty"`
	Code   bool `json:"code,omitempty"`
}
