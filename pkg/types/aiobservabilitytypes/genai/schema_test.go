package genai

import (
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"slices"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type schemaDef struct {
	Properties           map[string]json.RawMessage `json:"properties"`
	Required             []string                   `json:"required"`
	AdditionalProperties bool                       `json:"additionalProperties"`
	Enum                 []string                   `json:"enum"`
}

// Each schema definition is mirrored by one Go type: same keys, same required set, extra keys
// allowed where the schema allows them. The two schema files repeat the part definitions.
func TestTypesMirrorSchema(t *testing.T) {
	structs := map[string]any{
		"ChatMessage":                   ChatMessage{},
		"OutputMessage":                 OutputMessage{},
		"TextPart":                      TextPart{},
		"ToolCallRequestPart":           ToolCallRequestPart{},
		"ToolCallResponsePart":          ToolCallResponsePart{},
		"ServerToolCallPart":            ServerToolCallPart{},
		"GenericServerToolCall":         GenericServerToolCall{},
		"ServerToolCallResponsePart":    ServerToolCallResponsePart{},
		"GenericServerToolCallResponse": GenericServerToolCallResponse{},
		"BlobPart":                      BlobPart{},
		"FilePart":                      FilePart{},
		"UriPart":                       UriPart{},
		"ReasoningPart":                 ReasoningPart{},
		"CompactionPart":                CompactionPart{},
		"GenericPart":                   GenericPart{},
	}
	enums := map[string][]string{
		"Role":         {string(RoleSystem), string(RoleUser), string(RoleAssistant), string(RoleTool)},
		"FinishReason": {string(FinishReasonStop), string(FinishReasonLength), string(FinishReasonContentFilter), string(FinishReasonToolCall), string(FinishReasonCompaction), string(FinishReasonError)},
		"Modality":     {string(ModalityImage), string(ModalityVideo), string(ModalityAudio), string(ModalityDocument)},
	}

	defs := map[string]schemaDef{}
	for _, file := range []string{"gen-ai-input-messages.json", "gen-ai-output-messages.json"} {
		raw, err := os.ReadFile(filepath.Join("testdata", "semconv", file))
		require.NoError(t, err)
		var schema struct {
			Defs map[string]schemaDef `json:"$defs"`
		}
		require.NoError(t, json.Unmarshal(raw, &schema))
		for name, def := range schema.Defs {
			if seen, ok := defs[name]; ok {
				assert.Equal(t, seen, def, "%s differs between the schema files", name)
			}
			defs[name] = def
		}
	}

	for name, def := range defs {
		if want, ok := enums[name]; ok {
			assert.ElementsMatch(t, want, def.Enum, name)
			continue
		}
		sample, ok := structs[name]
		require.True(t, ok, "no Go type for schema definition %s", name)

		keys, required, extras := fields(reflect.TypeOf(sample))
		properties := make([]string, 0, len(def.Properties))
		for property := range def.Properties {
			properties = append(properties, property)
		}
		assert.ElementsMatch(t, properties, keys, "%s keys", name)
		assert.ElementsMatch(t, def.Required, required, "%s required", name)
		assert.Equal(t, def.AdditionalProperties, extras, "%s additionalProperties", name)
	}
	for name := range structs {
		_, ok := defs[name]
		assert.True(t, ok, "Go type %s has no schema definition", name)
	}
}

// fields returns the json keys, the keys without omitempty, and whether the struct keeps extras.
func fields(t reflect.Type) (keys, required []string, extras bool) {
	for i := range t.NumField() {
		field := t.Field(i)
		if field.Name == "AdditionalProperties" {
			extras = true
			continue
		}
		name, opts, _ := strings.Cut(field.Tag.Get("json"), ",")
		keys = append(keys, name)
		if !slices.Contains(strings.Split(opts, ","), "omitempty") {
			required = append(required, name)
		}
	}
	return keys, required, extras
}
