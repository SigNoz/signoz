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
	js := toJSON(t, Doc("**bold** and *em* and `code` and [txt](https://x.io)"))
	assert.Contains(t, js, `"type":"strong"`)
	assert.Contains(t, js, `"type":"em"`)
	assert.Contains(t, js, `"type":"code"`)
	assert.Contains(t, js, `"type":"link"`)
	assert.Contains(t, js, `"href":"https://x.io"`)
	assert.Contains(t, js, `"text":"bold"`)
}

func TestRenderHeadingAndList(t *testing.T) {
	js := toJSON(t, Doc("# Title\n\n- a\n- b"))
	assert.Contains(t, js, `"type":"heading"`)
	assert.Contains(t, js, `"level":1`)
	assert.Contains(t, js, `"type":"bulletList"`)
	assert.Contains(t, js, `"type":"listItem"`)
}

func TestRenderOrderedList(t *testing.T) {
	js := toJSON(t, Doc("1. one\n2. two"))
	assert.Contains(t, js, `"type":"orderedList"`)
}

func TestRenderCodeBlock(t *testing.T) {
	js := toJSON(t, Doc("```go\nx := 1\n```"))
	assert.Contains(t, js, `"type":"codeBlock"`)
	assert.Contains(t, js, `"language":"go"`)
	assert.Contains(t, js, `x := 1`)
}

func TestRenderPlainText(t *testing.T) {
	js := toJSON(t, Doc("just text"))
	assert.Contains(t, js, `"type":"paragraph"`)
	assert.Contains(t, js, `"text":"just text"`)
}

func TestRenderEmptyIsValidDoc(t *testing.T) {
	d := Doc("")
	content, ok := d["content"].([]any)
	require.True(t, ok)
	require.Len(t, content, 1)
	assert.Equal(t, "paragraph", content[0].(map[string]any)["type"])
}
