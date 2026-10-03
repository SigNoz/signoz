package genaimessages

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
	"github.com/stretchr/testify/assert"
)

func TestObjectAccessors_NilObject_ZeroValues(t *testing.T) {
	var o object
	assert.Nil(t, o.at("key"))
	assert.False(t, o.has("key"))
	assert.Equal(t, "", o.str("key"))
	assert.False(t, o.flag("key"))
	assert.Nil(t, o.first("a", "b"))
	_, ok := o.obj("key")
	assert.False(t, ok)
	_, ok = o.list("key")
	assert.False(t, ok)
	_, ok = o.text("key")
	assert.False(t, ok)
}

func TestObjectAccessors_WrongType_ZeroValues(t *testing.T) {
	o := object{"number": 1.5, "text": "hi"}
	_, ok := o.obj("number")
	assert.False(t, ok)
	_, ok = o.list("text")
	assert.False(t, ok)
	_, ok = o.text("number")
	assert.False(t, ok)
	assert.False(t, o.flag("text"))
	assert.Equal(t, "1.5", o.str("number"))
}

func TestSliceHelpers_EmptySlice_NilOrZero(t *testing.T) {
	assert.Nil(t, firstItem(nil))
	assert.Nil(t, lastItem([]any{}))
	assert.Nil(t, lastMessage(nil))
	assert.Equal(t, "b", lastItem([]any{"a", "b"}))
	messages := []aiobservabilitytypes.Message{{Role: aiobservabilitytypes.MessageRoleUser}, {Role: aiobservabilitytypes.MessageRoleAssistant}}
	assert.Same(t, &messages[1], lastMessage(messages))
}

func TestToObject_AcceptsDecodedMapAndObject(t *testing.T) {
	_, ok := toObject(map[string]any{"a": 1})
	assert.True(t, ok)
	_, ok = toObject(object{"a": 1})
	assert.True(t, ok)
	_, ok = toObject([]any{})
	assert.False(t, ok)
}
