package markdownrenderer

import (
	"bytes"
	"testing"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
)

func TestEscapeNoValue(t *testing.T) {
	tests := []struct {
		name     string
		markdown string
		expected string
	}{
		{
			name:     "plain text",
			markdown: "Service: <no value>",
			expected: "<p>Service: &lt;no value&gt;</p>\n",
		},
		{
			name:     "inside strong",
			markdown: "Service: **<no value>**",
			expected: "<p>Service: <strong>&lt;no value&gt;</strong></p>\n",
		},
		{
			name:     "inside emphasis",
			markdown: "Service: *<no value>*",
			expected: "<p>Service: <em>&lt;no value&gt;</em></p>\n",
		},
		{
			name:     "inside strikethrough",
			markdown: "Service: ~~<no value>~~",
			expected: "<p>Service: <del>&lt;no value&gt;</del></p>\n",
		},
		{
			name:     "real html still omitted",
			markdown: "hello <div>world</div>",
			expected: "<p>hello <!-- raw HTML omitted -->world<!-- raw HTML omitted --></p>\n",
		},
		{
			name:     "inside heading",
			markdown: "# Title <no value>",
			expected: "<h1>Title &lt;no value&gt;</h1>\n",
		},
		{
			name:     "inside list item",
			markdown: "- item <no value>",
			expected: "<ul>\n<li>item &lt;no value&gt;</li>\n</ul>\n",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gm := goldmark.New(goldmark.WithExtensions(escapeNoValue, extension.Strikethrough))
			var buf bytes.Buffer
			if err := gm.Convert([]byte(tt.markdown), &buf); err != nil {
				t.Fatal(err)
			}
			if buf.String() != tt.expected {
				t.Errorf("expected:\n%s\ngot:\n%s", tt.expected, buf.String())
			}
		})
	}
}
