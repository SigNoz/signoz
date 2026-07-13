package binding

import (
	"encoding/json"
	"io"
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/stretchr/testify/assert"
)

type s struct {
	A int `json:"a"`
}

func (req *s) UnmarshalJSON(b []byte) error {
	type Alias s

	var temp Alias
	if err := json.Unmarshal(b, &temp); err != nil {
		return err
	}

	if temp.A <= 10 {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "a must be greater than 10")
	}

	*req = s(temp)
	return nil
}

type n struct {
	S s `json:"s"`
}

func TestJSONBinding_BindBodyErrors(t *testing.T) {
	testCases := []struct {
		name    string
		body    string
		obj     any
		opts    []BindBodyOption
		code    errors.Code
		message string
		a       []string
	}{
		{name: "Empty", body: "", opts: nil, obj: &struct{}{}, code: ErrCodeInvalidRequestBody, message: ErrMessageInvalidJSON, a: []string{io.EOF.Error()}},
		{name: "String", body: "invalid json", opts: nil, obj: &struct{}{}, code: ErrCodeInvalidRequestBody, message: ErrMessageInvalidJSON, a: []string{"invalid character 'i' looking for beginning of value"}},
		{name: "Invalid", body: `{"a":"b}`, opts: nil, obj: &struct{}{}, code: ErrCodeInvalidRequestBody, message: ErrMessageInvalidJSON, a: []string{io.ErrUnexpectedEOF.Error()}},
		{name: "CustomValid", body: `{"a":9}`, opts: nil, obj: new(s), code: errors.CodeInvalidInput, message: "a must be greater than 10", a: []string{}},
		{name: "CustomInvalidJSON", body: `{"a:9}`, opts: nil, obj: new(s), code: ErrCodeInvalidRequestBody, message: ErrMessageInvalidJSON, a: []string{io.ErrUnexpectedEOF.Error()}},
		{name: "CustomMismatchedType", body: `{"a":"b"}`, opts: nil, obj: new(s), code: ErrCodeInvalidRequestField, message: ErrMessageInvalidField, a: []string{`value of type 'string' was received for field 'a', try sending 'int' instead?`}},
		{name: "CustomNestedMismatchedType", body: `{"s":{"a":"b"}}`, opts: nil, obj: new(n), code: ErrCodeInvalidRequestField, message: ErrMessageInvalidField, a: []string{`value of type 'string' was received for field 's.a', try sending 'int' instead?`}},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			err := JSON.BindBody(strings.NewReader(testCase.body), testCase.obj, testCase.opts...)
			assert.Error(t, err)

			typ, c, m, _, _, _ := errors.Unwrapb(err)
			assert.Equal(t, errors.TypeInvalidInput, typ)
			assert.Equal(t, testCase.code, c)
			assert.Equal(t, testCase.message, m)

			messages := []string{}
			for _, additional := range errors.AsJSON(err).Errors {
				messages = append(messages, additional.Message)
			}
			assert.ElementsMatch(t, testCase.a, messages)
		})
	}
}

type widget struct {
	Name  string `json:"name"`
	Color string `json:"color"`
}

func TestJSONBinding_BindBody_UnknownFieldSuggestions(t *testing.T) {
	testCases := []struct {
		name        string
		body        string
		opts        []BindBodyOption
		message     string
		suggestions []string
	}{
		{
			name:        "NoNearMatch",
			body:        `{"shape":"round"}`,
			opts:        []BindBodyOption{WithDisallowUnknownFields(true)},
			message:     `unknown field "shape"`,
			suggestions: []string{"valid fields are `name`, `color`"},
		},
		{
			name:        "WithContext",
			body:        `{"shape":"round"}`,
			opts:        []BindBodyOption{WithDisallowUnknownFields(true), WithUnknownFieldContext("widget spec")},
			message:     `unknown field "shape" in widget spec`,
			suggestions: []string{"valid fields are `name`, `color`"},
		},
		{
			name:        "NearMatch",
			body:        `{"nam":"x"}`,
			opts:        []BindBodyOption{WithDisallowUnknownFields(true)},
			message:     `unknown field "nam"`,
			suggestions: []string{"did you mean: `name`", "valid fields are `name`, `color`"},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			err := JSON.BindBody(strings.NewReader(testCase.body), &widget{}, testCase.opts...)
			assert.Error(t, err)

			_, c, m, _, _, _ := errors.Unwrapb(err)

			if testCase.message != "" {
				assert.Equal(t, errors.CodeInvalidInput, c)
				assert.Equal(t, testCase.message, m)
			}

			assert.Equal(t, testCase.suggestions, errors.AsJSON(err).Suggestions)
		})
	}
}

type structuredUnknownField struct{}

func (*structuredUnknownField) UnmarshalJSON([]byte) error {
	return errors.
		NewInvalidInputf(errors.CodeInvalidInput, "unknown field %q in inner spec", "foo").
		WithSuggestions("did you mean: `bar`")
}

// A non-strict BindBody must pass through an already-structured "unknown field"
// error returned by a nested UnmarshalJSON, not re-wrap it with the outer field set.
func TestJSONBinding_BindBody_PassesThroughStructuredUnknownField(t *testing.T) {
	err := JSON.BindBody(strings.NewReader(`{}`), &structuredUnknownField{})
	assert.Error(t, err)

	_, c, m, _, _, _ := errors.Unwrapb(err)
	assert.Equal(t, errors.CodeInvalidInput, c)
	assert.Equal(t, `unknown field "foo" in inner spec`, m)
	assert.Equal(t, []string{"did you mean: `bar`"}, errors.AsJSON(err).Suggestions)
}
