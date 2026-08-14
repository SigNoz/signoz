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
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			assert.Equal(t, c.want, render(t, c.in))
		})
	}
}
