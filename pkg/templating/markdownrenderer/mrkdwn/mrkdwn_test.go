package mrkdwn

import (
	"bytes"
	"testing"

	"github.com/yuin/goldmark"
)

func TestRenderer(t *testing.T) {
	tests := []struct {
		name     string
		markdown string
		expected string
	}{
		{
			name:     "Heading with Thematic Break",
			markdown: "# Title 1\n# Hello World\n---\nthis is sometext",
			expected: "*Title 1*\n\n*Hello World*\n\n---\n\nthis is sometext\n\n",
		},
		{
			name:     "Blockquote",
			markdown: "> This is a quote\n> It continues",
			expected: "> This is a quote\n> It continues\n\n",
		},
		{
			name:     "Fenced Code Block",
			markdown: "```go\npackage main\nfunc main() {}\n```",
			expected: "```\npackage main\nfunc main() {}\n```\n\n",
		},
		{
			name:     "Unordered List",
			markdown: "- item 1\n- item 2\n- item 3",
			expected: "• item 1\n• item 2\n• item 3\n\n",
		},
		{
			name:     "nested unordered list",
			markdown: "- item 1\n- item 2\n\t- item 2.1\n\t\t- item 2.1.1\n\t\t- item 2.1.2\n\t- item 2.2\n- item 3",
			expected: "• item 1\n• item 2\n\t• item 2.1\n\t\t• item 2.1.1\n\t\t• item 2.1.2\n\t• item 2.2\n• item 3\n\n",
		},
		{
			name:     "Ordered List",
			markdown: "1. item 1\n2. item 2\n3. item 3",
			expected: "1. item 1\n2. item 2\n3. item 3\n\n",
		},
		{
			name:     "nested ordered list",
			markdown: "1. item 1\n2. item 2\n\t1. item 2.1\n\t\t1. item 2.1.1\n\t\t2. item 2.1.2\n\t2. item 2.2\n\t3. item 2.3\n3. item 3\n4. item 4",
			expected: "1. item 1\n2. item 2\n\t1. item 2.1\n\t\t1. item 2.1.1\n\t\t2. item 2.1.2\n\t2. item 2.2\n\t3. item 2.3\n3. item 3\n4. item 4\n\n",
		},
		{
			name:     "Links and AutoLinks",
			markdown: "This is a [link](https://example.com) and an autolink <https://test.com>",
			expected: "This is a <https://example.com|link> and an autolink <https://test.com>\n\n",
		},
		{
			name:     "Images",
			markdown: "An image ![alt text](https://example.com/image.png)",
			expected: "An image <https://example.com/image.png|alt text>\n\n",
		},
		{
			name:     "Emphasis",
			markdown: "This is **bold** and *italic* and __bold__ and _italic_",
			expected: "This is *bold* and _italic_ and *bold* and _italic_\n\n",
		},
		{
			name:     "Strikethrough",
			markdown: "This is ~~strike~~",
			expected: "This is ~strike~\n\n",
		},
		{
			name:     "Code Span",
			markdown: "This is `inline code` embedded.",
			expected: "This is `inline code` embedded.\n\n",
		},
		{
			name:     "Table",
			markdown: "Col 1 | Col 2 | Col 3\n--- | --- | ---\nVal 1 | Long Value 2 | 3\nShort | V | 1000",
			expected: "```\nCol 1 | Col 2        | Col 3\n------|--------------|------\nVal 1 | Long Value 2 | 3    \nShort | V            | 1000 \n```\n\n",
		},
		{
			name:     "Mixed Nested Lists",
			markdown: "1. first\n\t- nested bullet\n\t- another bullet\n2. second",
			expected: "1. first\n\t• nested bullet\n\t• another bullet\n2. second\n\n",
		},
		{
			name:     "Email AutoLink",
			markdown: "<user@example.com>",
			expected: "<mailto:user@example.com|user@example.com>\n\n",
		},
		{
			name:     "No value string parsed as is",
			markdown: "Service: <no value>",
			expected: "Service: <no value>\n\n",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			md := goldmark.New(goldmark.WithExtensions(Extender))

			var buf bytes.Buffer
			if err := md.Convert([]byte(tt.markdown), &buf); err != nil {
				t.Fatalf("failed to convert: %v", err)
			}

			// Do exact string matching
			actual := buf.String()
			if actual != tt.expected {
				t.Errorf("\nExpected:\n%q\nGot:\n%q\nRaw Expected:\n%s\nRaw Got:\n%s",
					tt.expected, actual, tt.expected, actual)
			}
		})
	}
}
