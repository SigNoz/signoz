package telegram

import (
	"bytes"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/yuin/goldmark"
)

func render(t *testing.T, markdown string) string {
	t.Helper()
	var buf bytes.Buffer
	require.NoError(t, goldmark.New(goldmark.WithExtensions(Extender)).Convert([]byte(markdown), &buf))

	return buf.String()
}

func TestRenderEmitsTelegramHTML(t *testing.T) {
	testCases := []struct {
		name     string
		markdown string
		want     string
	}{
		{"Bold", "**critical**", "<b>critical</b>"},
		{"Italic", "*degraded*", "<i>degraded</i>"},
		{"Strikethrough", "~~resolved~~", "<s>resolved</s>"},
		{"CodeSpan", "use `kubectl get pods`", "use <code>kubectl get pods</code>"},
		{"Link", "[dashboard](https://signoz.io/d?a=1&b=2)", `<a href="https://signoz.io/d?a=1&amp;b=2">dashboard</a>`},
		{"AutoLink", "<https://signoz.io>", `<a href="https://signoz.io">https://signoz.io</a>`},
		{"Blockquote", "> escalate now", "<blockquote>escalate now</blockquote>"},
		// Telegram has no heading, list, table or image tag, so these flatten.
		{"Heading_BecomesBold", "## Incident", "<b>Incident</b>"},
		{"BulletList_BecomesLines", "- one\n- two", "• one\n• two"},
		{"OrderedList_BecomesLines", "1. one\n2. two", "1. one\n2. two"},
		{"Table_BecomesPipedLines", "| a | b |\n|---|---|\n| 1 | 2 |", "a | b\n1 | 2"},
		{"Image_BecomesTextAndURL", "![graph](https://signoz.io/g.png)", "graph (https://signoz.io/g.png)"},
		{"ThematicBreak", "a\n\n---\n\nb", "a\n\n———\n\nb"},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.want, render(t, testCase.markdown))
		})
	}
}

// Telegram drops the whole message on an unparseable entity, so anything that
// could be read as markup has to leave as an entity.
func TestRenderEscapesEverythingElse(t *testing.T) {
	testCases := []struct {
		name     string
		markdown string
		want     string
	}{
		{"BareSpecialChars", "p99 < 2s & rising", "p99 &lt; 2s &amp; rising"},
		{"InsideBold", "**a < b**", "<b>a &lt; b</b>"},
		{"InsideCodeSpan", "`if a < b && c`", "<code>if a &lt; b &amp;&amp; c</code>"},
		{"InsideCodeBlock", "```\na < b\n```", "<pre>a &lt; b</pre>"},
		{"InsideLinkText", "[a < b](https://signoz.io)", `<a href="https://signoz.io">a &lt; b</a>`},
		{"QuoteInHref", `[x](https://signoz.io/?q=")`, `<a href="https://signoz.io/?q=&quot;">x</a>`},
		// Hand-written markup would hand Telegram tags outside the allowlist.
		// The tags go; the text between them stays.
		{"RawHTMLTagsDropped_TextKept", "before <marquee>x</marquee> after", "before x after"},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			rendered := render(t, testCase.markdown)
			assert.Equal(t, testCase.want, rendered)
			assert.NotContains(t, rendered, "&amp;lt;", "double-escaped")
		})
	}
}
