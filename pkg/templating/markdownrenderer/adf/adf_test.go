package adf

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func toJSON(t *testing.T, v any) string {
	t.Helper()
	b, err := json.Marshal(v)
	require.NoError(t, err)
	return string(b)
}

func TestRenderInlineMarks(t *testing.T) {
	js := toJSON(t, Render("**bold** and *em* and `code` and [txt](https://x.io)"))
	assert.Contains(t, js, `"type":"strong"`)
	assert.Contains(t, js, `"type":"em"`)
	assert.Contains(t, js, `"type":"code"`)
	assert.Contains(t, js, `"type":"link"`)
	assert.Contains(t, js, `"href":"https://x.io"`)
	assert.Contains(t, js, `"text":"bold"`)
}

func TestRenderHeadingAndList(t *testing.T) {
	js := toJSON(t, Render("# Title\n\n- a\n- b"))
	assert.Contains(t, js, `"type":"heading"`)
	assert.Contains(t, js, `"level":1`)
	assert.Contains(t, js, `"type":"bulletList"`)
	assert.Contains(t, js, `"type":"listItem"`)
}

func TestRenderOrderedList(t *testing.T) {
	js := toJSON(t, Render("1. one\n2. two"))
	assert.Contains(t, js, `"type":"orderedList"`)
}

func TestRenderCodeBlock(t *testing.T) {
	js := toJSON(t, Render("```go\nx := 1\n```"))
	assert.Contains(t, js, `"type":"codeBlock"`)
	assert.Contains(t, js, `"language":"go"`)
	assert.Contains(t, js, `x := 1`)
}

func TestRenderStrikethrough(t *testing.T) {
	js := toJSON(t, Render("~~gone~~"))
	assert.Contains(t, js, `"type":"strike"`)
	assert.Contains(t, js, `"text":"gone"`)
}

func TestRenderBlockquote(t *testing.T) {
	js := toJSON(t, Render("> quoted"))
	assert.Contains(t, js, `"type":"blockquote"`)
	assert.Contains(t, js, `"text":"quoted"`)
}

func TestRenderAutoLink(t *testing.T) {
	js := toJSON(t, Render("see <https://signoz.io>"))
	assert.Contains(t, js, `"type":"link"`)
	assert.Contains(t, js, `"href":"https://signoz.io"`)
	assert.Contains(t, js, `"text":"https://signoz.io"`)
}

func TestRenderLineBreaks(t *testing.T) {
	js := toJSON(t, Render("one  \ntwo"))
	assert.Contains(t, js, `"type":"hardBreak"`)

	// a soft break renders as a space, keeping the paragraph intact
	js = toJSON(t, Render("one\ntwo"))
	assert.NotContains(t, js, `"type":"hardBreak"`)
	assert.Contains(t, js, `"text":" "`)
}

func TestRenderPlainText(t *testing.T) {
	js := toJSON(t, Render("just text"))
	assert.Contains(t, js, `"type":"paragraph"`)
	assert.Contains(t, js, `"text":"just text"`)
}

func TestRenderEmptyIsEmpty(t *testing.T) {
	assert.Empty(t, Render(""))
}
