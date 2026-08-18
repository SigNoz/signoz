package plaintext

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/yuin/goldmark"
)

func render(t *testing.T, md string) string {
	t.Helper()
	var b []byte
	buf := bytesBuffer{&b}
	g := goldmark.New(goldmark.WithExtensions(Extender))
	require.NoError(t, g.Convert([]byte(md), &buf))
	return string(b)
}

// bytesBuffer is a tiny io.Writer so the test needs no extra imports.
type bytesBuffer struct{ b *[]byte }

func (w bytesBuffer) Write(p []byte) (int, error) {
	*w.b = append(*w.b, p...)
	return len(p), nil
}

func TestPlainText(t *testing.T) {
	cases := []struct {
		name string
		in   string
		want string
	}{
		{"strips bold and italic", "**bold** and *italic*", "bold and italic"},
		{"link becomes text (url)", "[View in SigNoz](https://signoz.io/alert)", "View in SigNoz (https://signoz.io/alert)"},
		{"bold label kept, marker dropped", "**Alert:** name (critical)", "Alert: name (critical)"},
		{"strikethrough stripped", "~~gone~~", "gone"},
		{"inline code unwrapped", "run `foo bar`", "run foo bar"},
		{"paragraphs separated by blank line", "one\n\ntwo", "one\n\ntwo"},
		{"unordered list", "- a\n- b", "- a\n- b"},
		{"ordered list keeps numbering", "1. a\n2. b", "1. a\n2. b"},
		{"nested list indents under parent", "- a\n  - b", "- a\n  - b"},
		{"fenced code block unwrapped", "```go\nx := 1\n```", "x := 1\n"},
		{"table flattens to pipe-separated rows", "| h1 | h2 |\n|---|---|\n| a | b |\n| c | d |", "h1 | h2\na | b\nc | d"},
		{"autolink kept as bare url", "see <https://signoz.io>", "see https://signoz.io"},
		{"inline raw html dropped", "a <b>bold</b> word", "a bold word"},
		{"html block dropped", "before\n\n<div>markup</div>\n\nafter", "before\n\nafter"},
		{"hard break becomes newline", "one  \ntwo", "one\ntwo"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			assert.Equal(t, c.want, render(t, c.in))
		})
	}
}
