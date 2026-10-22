package signoz

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/swaggest/jsonschema-go"
)

type describedKind string

func (describedKind) Enum() []any { return []any{"a", "b"} }

type describedNested struct {
	Value string `json:"value"`
}

type describedParent struct {
	Kind        describedKind   `json:"kind" description:"The kind of thing."`
	Nested      describedNested `json:"nested" description:"The nested thing."`
	Undescribed describedKind   `json:"undescribed"`
	Plain       string          `json:"plain" description:"A plain string."`
}

func TestKeepDescriptionOnReferencedProperty(t *testing.T) {
	reflector := jsonschema.Reflector{}
	reflector.DefaultOptions = append(reflector.DefaultOptions, jsonschema.InterceptProp(keepDescriptionOnReferencedProperty))

	schema, err := reflector.Reflect(describedParent{})
	require.NoError(t, err)

	raw, err := json.Marshal(schema)
	require.NoError(t, err)

	var got struct {
		Properties map[string]json.RawMessage `json:"properties"`
	}
	require.NoError(t, json.Unmarshal(raw, &got))

	assert.JSONEq(t, `{"description":"The kind of thing.","allOf":[{"$ref":"#/definitions/SignozDescribedKind"}]}`, string(got.Properties["kind"]))
	assert.JSONEq(t, `{"description":"The nested thing.","allOf":[{"$ref":"#/definitions/SignozDescribedNested"}]}`, string(got.Properties["nested"]))
	assert.JSONEq(t, `{"$ref":"#/definitions/SignozDescribedKind"}`, string(got.Properties["undescribed"]))
	assert.JSONEq(t, `{"description":"A plain string.","type":"string"}`, string(got.Properties["plain"]))
}
