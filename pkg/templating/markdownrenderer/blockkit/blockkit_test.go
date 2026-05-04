package blockkit

import (
	"bytes"
	"encoding/json"
	"testing"

	"github.com/yuin/goldmark"
)

func jsonEqual(a, b string) bool {
	var va, vb interface{}
	if err := json.Unmarshal([]byte(a), &va); err != nil {
		return false
	}
	if err := json.Unmarshal([]byte(b), &vb); err != nil {
		return false
	}
	ja, _ := json.Marshal(va)
	jb, _ := json.Marshal(vb)
	return string(ja) == string(jb)
}

func prettyJSON(s string) string {
	var v interface{}
	if err := json.Unmarshal([]byte(s), &v); err != nil {
		return s
	}
	b, _ := json.MarshalIndent(v, "", "  ")
	return string(b)
}

func TestRenderer(t *testing.T) {
	tests := []struct {
		name     string
		markdown string
		expected string
	}{
		{
			name:     "empty input",
			markdown: "",
			expected: `[]`,
		},
		{
			name:     "simple paragraph",
			markdown: "Hello world",
			expected: `[
				{
					"type": "section",
					"text": { "type": "mrkdwn", "text": "Hello world" }
				}
			]`,
		},
		{
			name:     "heading",
			markdown: "# My Heading",
			expected: `[
				{
					"type": "section",
					"text": { "type": "mrkdwn", "text": "*My Heading*" }
				}
			]`,
		},
		{
			name:     "multiple paragraphs",
			markdown: "First paragraph\n\nSecond paragraph",
			expected: `[
				{
					"type": "section",
					"text": { "type": "mrkdwn", "text": "First paragraph\nSecond paragraph" }
				}
			]`,
		},
		{
			name:     "todo list ",
			markdown: "- [ ] item 1\n- [x] item 2",
			expected: `[
				{
					"type": "rich_text",
					"elements": [
					{ 
						"border": 0, 
						"elements": [ 
							{ "elements": [ { "text": "[ ] ", "type": "text" }, { "text": "item 1", "type": "text" } ], "type": "rich_text_section" }, 
							{ "elements": [ { "text": "[x] ", "type": "text" }, { "text": "item 2", "type": "text" } ], "type": "rich_text_section" } 
						],
						"indent": 0, 
						"style": "bullet", 
						"type": "rich_text_list" 
						}
					]
				}
			]`,
		},
		{
			name:     "thematic break between paragraphs",
			markdown: "Before\n\n---\n\nAfter",
			expected: `[
				{ "type": "section", "text": { "type": "mrkdwn", "text": "Before" } },
				{ "type": "divider" },
				{ "type": "section", "text": { "type": "mrkdwn", "text": "After" } }
			]`,
		},
		{
			name:     "fenced code block with language",
			markdown: "```go\nfmt.Println(\"hello\")\n```",
			expected: `[
				{
					"type": "rich_text",
					"elements": [
						{
							"type": "rich_text_preformatted",
							"border": 0,
							"language": "go",
							"elements": [
								{ "type": "text", "text": "fmt.Println(\"hello\")" }
							]
						}
					]
				}
			]`,
		},
		{
			name:     "indented code block",
			markdown: "    code line 1\n    code line 2",
			expected: `[
				{
					"type": "rich_text",
					"elements": [
						{
							"type": "rich_text_preformatted",
							"border": 0,
							"elements": [
								{ "type": "text", "text": "code line 1\ncode line 2" }
							]
						}
					]
				}
			]`,
		},
		{
			name:     "empty fenced code block",
			markdown: "```\n```",
			expected: `[
				{
					"type": "rich_text",
					"elements": [
						{
							"type": "rich_text_preformatted",
							"border": 0,
							"elements": [
								{ "type": "text", "text": " " }
							]
						}
					]
				}
			]`,
		},
		{
			name:     "simple bullet list",
			markdown: "- item 1\n- item 2\n- item 3",
			expected: `[
				{
					"type": "rich_text",
					"elements": [
						{
							"type": "rich_text_list", "style": "bullet", "indent": 0, "border": 0,
							"elements": [
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "item 1" }] },
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "item 2" }] },
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "item 3" }] }
							]
						}
					]
				}
			]`,
		},
		{
			name:     "simple ordered list",
			markdown: "1. first\n2. second\n3. third",
			expected: `[
				{
					"type": "rich_text",
					"elements": [
						{
							"type": "rich_text_list", "style": "ordered", "indent": 0, "border": 0,
							"elements": [
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "first" }] },
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "second" }] },
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "third" }] }
							]
						}
					]
				}
			]`,
		},
		{
			name:     "nested bullet list (2 levels)",
			markdown: "- item 1\n- item 2\n  - sub a\n  - sub b\n- item 3",
			expected: `[
				{
					"type": "rich_text",
					"elements": [
						{
							"type": "rich_text_list", "style": "bullet", "indent": 0, "border": 0,
							"elements": [
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "item 1" }] },
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "item 2" }] }
							]
						},
						{
							"type": "rich_text_list", "style": "bullet", "indent": 1, "border": 0,
							"elements": [
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "sub a" }] },
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "sub b" }] }
							]
						},
						{
							"type": "rich_text_list", "style": "bullet", "indent": 0, "border": 0,
							"elements": [
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "item 3" }] }
							]
						}
					]
				}
			]`,
		},
		{
			name:     "nested ordered list with offset",
			markdown: "1. first\n   1. nested-a\n   2. nested-b\n2. second\n3. third",
			expected: `[
				{
					"type": "rich_text",
					"elements": [
						{
							"type": "rich_text_list", "style": "ordered", "indent": 0, "border": 0,
							"elements": [
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "first" }] }
							]
						},
						{
							"type": "rich_text_list", "style": "ordered", "indent": 1, "border": 0,
							"elements": [
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "nested-a" }] },
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "nested-b" }] }
							]
						},
						{
							"type": "rich_text_list", "style": "ordered", "indent": 0, "border": 0, "offset": 1,
							"elements": [
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "second" }] },
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "third" }] }
							]
						}
					]
				}
			]`,
		},
		{
			name:     "mixed ordered/bullet nesting",
			markdown: "1. ordered\n   - bullet child\n2. ordered again",
			expected: `[
				{
					"type": "rich_text",
					"elements": [
						{
							"type": "rich_text_list", "style": "ordered", "indent": 0, "border": 0,
							"elements": [
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "ordered" }] }
							]
						},
						{
							"type": "rich_text_list", "style": "bullet", "indent": 1, "border": 0,
							"elements": [
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "bullet child" }] }
							]
						},
						{
							"type": "rich_text_list", "style": "ordered", "indent": 0, "border": 0, "offset": 1,
							"elements": [
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "ordered again" }] }
							]
						}
					]
				}
			]`,
		},
		{
			name:     "list items with bold/italic/link/code",
			markdown: "- **bold item**\n- _italic item_\n- [link](http://example.com)\n- `code item`",
			expected: `[
				{
					"type": "rich_text",
					"elements": [
						{
							"type": "rich_text_list", "style": "bullet", "indent": 0, "border": 0,
							"elements": [
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "bold item", "style": { "bold": true } }] },
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "italic item", "style": { "italic": true } }] },
								{ "type": "rich_text_section", "elements": [{ "type": "link", "url": "http://example.com", "text": "link" }] },
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "code item", "style": { "code": true } }] }
							]
						}
					]
				}
			]`,
		},
		{
			name:     "table with header and body",
			markdown: "| Name | Age |\n|------|-----|\n| Alice | 30 |",
			expected: `[
				{
					"type": "table",
					"rows": [
						[
							{ "type": "rich_text", "elements": [
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "Name", "style": { "bold": true } }] }
							]},
							{ "type": "rich_text", "elements": [
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "Age", "style": { "bold": true } }] }
							]}
						],
						[
							{ "type": "rich_text", "elements": [
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "Alice" }] }
							]},
							{ "type": "rich_text", "elements": [
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "30" }] }
							]}
						]
					]
				}
			]`,
		},
		{
			name:     "blockquote",
			markdown: "> quoted text",
			expected: `[
				{
					"type": "section",
					"text": { "type": "mrkdwn", "text": "> quoted text" }
				}
			]`,
		},
		{
			name:     "blockquote with nested list",
			markdown: "> item 1\n> > item 2\n> > item 3",
			expected: `[
				{
					"text": {
					"text": "> item 1\n> > item 2\n> > item 3",
					"type": "mrkdwn"
					},
					"type": "section"
				}
			]`,
		},
		{
			name:     "inline formatting in paragraph",
			markdown: "This is **bold** and _italic_ and ~strike~ and `code`",
			expected: `[
				{
					"type": "section",
					"text": { "type": "mrkdwn", "text": "This is *bold* and _italic_ and ~strike~ and ` + "`code`" + `" }
				}
			]`,
		},
		{
			name:     "link in paragraph",
			markdown: "Visit [Google](http://google.com)",
			expected: `[
				{
					"type": "section",
					"text": { "type": "mrkdwn", "text": "Visit <http://google.com|Google>" }
				}
			]`,
		},
		{
			name:     "image is skipped",
			markdown: "![alt](http://example.com/image.png)",
			// For image skip the block and return empty array
			expected: `[]`,
		},
		{
			name:     "paragraph then list then paragraph",
			markdown: "Before\n\n- item\n\nAfter",
			expected: `[
				{ "type": "section", "text": { "type": "mrkdwn", "text": "Before" } },
				{
					"type": "rich_text",
					"elements": [
						{
							"type": "rich_text_list", "style": "bullet", "indent": 0, "border": 0,
							"elements": [
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "item" }] }
							]
						}
					]
				},
				{ "type": "section", "text": { "type": "mrkdwn", "text": "After" } }
			]`,
		},
		{
			name:     "ordered list with start > 1",
			markdown: "5. fifth\n6. sixth",
			expected: `[
				{
					"type": "rich_text",
					"elements": [
						{
							"type": "rich_text_list", "style": "ordered", "indent": 0, "border": 0, "offset": 4,
							"elements": [
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "fifth" }] },
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "sixth" }] }
							]
						}
					]
				}
			]`,
		},
		{
			name:     "deeply nested ordered list (3 levels) with offsets",
			markdown: "1. Some things\n\t1. are best left\n2. to the fate\n\t1. of the world\n\t\t1. and then\n\t\t2. this is how\n3. it turns out to be",
			expected: `[
				{
					"type": "rich_text",
					"elements": [
						{ "type": "rich_text_list", "style": "ordered", "indent": 0, "border": 0,
						  "elements": [{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "Some things" }] }] },

						{ "type": "rich_text_list", "style": "ordered", "indent": 1, "border": 0,
						  "elements": [{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "are best left" }] }] },

						{ "type": "rich_text_list", "style": "ordered", "indent": 0, "border": 0, "offset": 1,
						  "elements": [{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "to the fate" }] }] },

						{ "type": "rich_text_list", "style": "ordered", "indent": 1, "border": 0,
						  "elements": [{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "of the world" }] }] },

						{ "type": "rich_text_list", "style": "ordered", "indent": 2, "border": 0,
						  "elements": [
						    { "type": "rich_text_section", "elements": [{ "type": "text", "text": "and then" }] },
						    { "type": "rich_text_section", "elements": [{ "type": "text", "text": "this is how" }] }
						  ]
						},

						{ "type": "rich_text_list", "style": "ordered", "indent": 0, "border": 0, "offset": 2,
						  "elements": [{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "it turns out to be" }] }] }
					]
				}
			]`,
		},
		{
			name:     "link with bold label in list item",
			markdown: "- [**docs**](http://example.com)",
			expected: `[
				{
					"type": "rich_text",
					"elements": [
						{
							"type": "rich_text_list", "style": "bullet", "indent": 0, "border": 0,
							"elements": [
								{ "type": "rich_text_section", "elements": [{ "type": "link", "url": "http://example.com", "text": "docs" }] }
							]
						}
					]
				}
			]`,
		},
		{
			name:     "table with empty cell",
			markdown: "| A | B |\n|---|---|\n| 1 | |",
			expected: `[
				{
					"type": "table",
					"rows": [
						[
							{ "type": "rich_text", "elements": [
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "A", "style": { "bold": true } }] }
							]},
							{ "type": "rich_text", "elements": [
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "B", "style": { "bold": true } }] }
							]}
						],
						[
							{ "type": "rich_text", "elements": [
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "1" }] }
							]},
							{ "type": "rich_text", "elements": [
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": " " }] }
							]}
						]
					]
				}
			]`,
		},
		{
			name:     "table with missing column in row",
			markdown: "| A | B |\n|---|---|\n| 1 |",
			expected: `[
				{
					"type": "table",
					"rows": [
						[
							{ "type": "rich_text", "elements": [
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "A", "style": { "bold": true } }] }
							]},
							{ "type": "rich_text", "elements": [
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "B", "style": { "bold": true } }] }
							]}
						],
						[
							{ "type": "rich_text", "elements": [
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": "1" }] }
							]},
							{ "type": "rich_text", "elements": [
								{ "type": "rich_text_section", "elements": [{ "type": "text", "text": " " }] }
							]}
						]
					]
				}
			]`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			md := goldmark.New(
				goldmark.WithExtensions(Extender),
			)
			var buf bytes.Buffer
			if err := md.Convert([]byte(tt.markdown), &buf); err != nil {
				t.Fatalf("convert error: %v", err)
			}
			got := buf.String()
			if !jsonEqual(got, tt.expected) {
				t.Errorf("JSON mismatch\n\nMarkdown:\n%s\n\nExpected:\n%s\n\nGot:\n%s",
					tt.markdown, prettyJSON(tt.expected), prettyJSON(got))
			}
		})
	}
}
