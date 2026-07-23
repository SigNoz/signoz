// Copyright (c) 2026 SigNoz, Inc.
// SPDX-License-Identifier: Apache-2.0

package googlechat_test

import (
	"bytes"
	"testing"

	"github.com/SigNoz/signoz/pkg/templating/markdownrenderer/googlechat"
	"github.com/yuin/goldmark"
)

func TestRenderer(t *testing.T) {
	md := goldmark.New(goldmark.WithExtensions(googlechat.Extender))

	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "empty input",
			input:    "",
			expected: "",
		},
		{
			name:     "simple paragraph",
			input:    "Hello, world!",
			expected: "Hello, world!",
		},
		{
			name:     "heading (rendered as bold)",
			input:    "# My Heading",
			expected: "*My Heading*",
		},
		{
			name:     "multiple paragraphs",
			input:    "First paragraph.\n\nSecond paragraph.",
			expected: "First paragraph.\n\nSecond paragraph.",
		},
		{
			name:     "bold text (** becomes *)",
			input:    "This is **bold** text.",
			expected: "This is *bold* text.",
		},
		{
			name:     "italic text (* becomes _)",
			input:    "This is *italic* text.",
			expected: "This is _italic_ text.",
		},
		{
			name:     "italic text (_ stays _)",
			input:    "This is _italic_ text.",
			expected: "This is _italic_ text.",
		},
		{
			name:     "bold and italic",
			input:    "**bold** and *italic* together.",
			expected: "*bold* and _italic_ together.",
		},
		{
			name:     "code span",
			input:    "Use `code` here.",
			expected: "Use `code` here.",
		},
		{
			name:     "link conversion ([text](url) becomes <url|text>)",
			input:    "Check [this link](https://example.com).",
			expected: "Check <https://example.com|this link>.",
		},
		{
			name:     "plain autolink",
			input:    "<https://example.com>",
			expected: "https://example.com",
		},
		{
			name:     "bullet list",
			input:    "- Item 1\n- Item 2\n- Item 3",
			expected: "* Item 1\n* Item 2\n* Item 3\n",
		},
		{
			name:     "fenced code block",
			input:    "```\ncode line 1\ncode line 2\n```",
			expected: "```\ncode line 1\ncode line 2\n```",
		},
		{
			name:     "fenced code block with language",
			input:    "```go\nfunc main() {}\n```",
			expected: "```\nfunc main() {}\n```",
		},
		{
			name:     "blockquote",
			input:    "> This is a quote",
			expected: ">This is a quote",
		},
		{
			name:     "thematic break (--- for horizontal rule)",
			input:    "Above\n\n---\n\nBelow",
			expected: "Above\n\n---\n\nBelow",
		},
		{
			name:     "mixed inline formatting",
			input:    "**bold**, *italic*, `code`, and [link](https://example.com).",
			expected: "*bold*, _italic_, `code`, and <https://example.com|link>.",
		},
		{
			name:     "alert-like message",
			input:    "# Alert: High CPU\n\n**Status:** Firing\n\n**Details:**\n- Host: server1\n- CPU: 95%",
			expected: "*Alert: High CPU*\n\n*Status:* Firing\n\n*Details:*\n\n* Host: server1\n* CPU: 95%\n",
		},
		{
			name:     "strikethrough (~~text~~ becomes ~text~)",
			input:    "This is ~~strikethrough~~ text.",
			expected: "This is ~strikethrough~ text.",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var buf bytes.Buffer
			if err := md.Convert([]byte(tt.input), &buf); err != nil {
				t.Fatalf("Convert failed: %v", err)
			}
			got := buf.String()
			if got != tt.expected {
				t.Errorf("expected:\n%q\n\ngot:\n%q", tt.expected, got)
			}
		})
	}
}
