package wikimarkup

import (
	"bytes"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/yuin/goldmark"
)

func render(t *testing.T, md string) string {
	t.Helper()
	var buf bytes.Buffer
	g := goldmark.New(goldmark.WithExtensions(Extender))
	require.NoError(t, g.Convert([]byte(md), &buf))
	return buf.String()
}

func TestRender(t *testing.T) {
	testCases := []struct {
		name string
		in   string
		want string
	}{
		{"Bold_Star", "**bold** text", "*bold* text"},
		{"Italic_Underscore", "*italic* text", "_italic_ text"},
		{"Strikethrough_Dash", "~~gone~~", "-gone-"},
		{"BoldLabel_DefaultTemplateLine", "**Alert:** HighCPU (critical)", "*Alert:* HighCPU (critical)"},
		{"InlineCode_DoubleBrace", "run `foo bar`", "run {{foo bar}}"},
		{"Link_PipeForm", "[Open in SigNoz](https://signoz.io/alert/1)", "[Open in SigNoz|https://signoz.io/alert/1]"},
		{"Image_BangForm", "![chart](https://signoz.io/c.png)", "!https://signoz.io/c.png!"},
		{"Autolink_BareURL", "see <https://signoz.io>", "see https://signoz.io"},
		{"Heading_Levels", "# One\n\n### Three", "h1. One\n\nh3. Three"},
		{"Paragraphs_BlankLine", "one\n\ntwo", "one\n\ntwo"},
		{"UnorderedList_StarMarkers", "- a\n- b", "* a\n* b"},
		{"OrderedList_HashMarkers", "1. a\n2. b", "# a\n# b"},
		{"NestedList_RepeatedMarkers", "- a\n  - b\n    - c\n- d", "* a\n** b\n*** c\n* d"},
		{"MixedNestedList_StarHash", "- a\n  1. b\n  2. c", "* a\n*# b\n*# c"},
		{"LooseList_ItemsStayOneList", "- a\n\n- b", "* a\n* b"},
		{"FencedCodeBlock_WithLanguage", "```json\n{\"k\": 1}\n```", "{code:json}\n{\"k\": 1}\n{code}"},
		{"FencedCodeBlock_NoLanguage", "```\nx := 1\n```", "{code}\nx := 1\n{code}"},
		{"Blockquote_SingleParagraph_Bq", "> quoted", "bq. quoted"},
		{"Blockquote_MultiParagraph_QuoteBlock", "> one\n>\n> two", "{quote}\none\n\ntwo\n{quote}"},
		{"ThematicBreak_FourDashes", "a\n\n---\n\nb", "a\n\n----\n\nb"},
		{"Table_HeaderAndRows", "| h1 | h2 |\n|---|---|\n| a | b |\n| c | d |", "||h1||h2||\n|a|b|\n|c|d|"},
		{"HardBreak_Newline", "one  \ntwo", "one\ntwo"},
		{"SoftBreak_Newline", "one\ntwo", "one\ntwo"},
		{"InlineRawHTML_Dropped", "a <b>bold</b> word", "a bold word"},
		{"HTMLBlock_Dropped", "before\n\n<div>markup</div>\n\nafter", "before\n\nafter"},
		{"DefaultTemplate_Rendered", "**Alert:** HighCPU (critical)\n\n**Summary:** cpu above 90% on host-1\n", "*Alert:* HighCPU (critical)\n\n*Summary:* cpu above 90% on host-1"},
		{"LoneUnderscore_SplitTextRuns_NotEscaped", "see snake_case_name and a_b", "see snake_case_name and a_b"},
		{"LoneStar_SplitTextRuns_Escaped", "cpu *2 now", `cpu \*2 now`},
		{"AlertContent_MarkupNeutralised", "[OPS-1] hit {panel} at !host", `\[OPS-1] hit \{panel} at \!host`},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.want, render(t, testCase.in))
		})
	}
}

func TestEscape(t *testing.T) {
	testCases := []struct {
		name string
		in   string
		want string
	}{
		{"PanelMacro_Escaped", "{panel}boom{panel}", `\{panel}boom\{panel}`},
		{"IssueKeyBrackets_Escaped", "[OPS-1] failed", `\[OPS-1] failed`},
		{"SnakeCase_Literal", "snake_case_name", "snake_case_name"},
		{"Hyphenated_Literal", "host-1 and node-2", "host-1 and node-2"},
		{"StarAtWordBoundary_Escaped", "cpu * 2 and *bold*", `cpu \* 2 and \*bold\*`},
		{"LeadingDash_Escaped", "-5 degrees", `\-5 degrees`},
		{"BangBeforeText_Escaped", "wow!done and done!", `wow\!done and done!`},
		{"Tilde_Escaped", "~home", `\~home`},
		{"Caret_Escaped", "x^2", "x^2"},
		{"PlainText_Untouched", "cpu above 90% on host-1 (critical)", "cpu above 90% on host-1 (critical)"},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.want, Escape(testCase.in))
		})
	}
}
