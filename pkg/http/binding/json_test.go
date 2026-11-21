package binding

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/iotest"

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

func TestJSONBindingRejectsTrailingData(t *testing.T) {
	for _, suffix := range []string{
		`{"a": 20}`, `null`, `[]`, `true`, `42`, `"extra"`,
		`garbage`, `{"incomplete":`, `]`, "\u00a0", "\u2003",
	} {
		t.Run(suffix, func(t *testing.T) {
			var target struct {
				A int `json:"a"`
			}
			err := JSON.BindBody(strings.NewReader(`{"a":11} `+suffix), &target)
			if !assert.Error(t, err) {
				return
			}
			typ, code, message, _, _, _ := errors.Unwrapb(err)
			assert.Equal(t, errors.TypeInvalidInput, typ)
			assert.Equal(t, ErrCodeInvalidRequestBody, code)
			assert.Equal(t, ErrMessageInvalidJSON, message)
		})
	}
}

func TestJSONBindingAllowsTrailingWhitespace(t *testing.T) {
	for _, suffix := range []string{"", " ", "\r\n\t "} {
		t.Run(suffix, func(t *testing.T) {
			var target s
			err := JSON.BindBody(strings.NewReader(`{"a":11}`+suffix), &target)
			assert.NoError(t, err)
			assert.Equal(t, 11, target.A)
		})
	}
}

func TestJSONBindingTrailingDataAcrossReads(t *testing.T) {
	for _, suffix := range []string{"", " \n\t", strings.Repeat(" ", 8192), " {}", " junk"} {
		t.Run(suffix[:min(len(suffix), 20)], func(t *testing.T) {
			var target map[string]json.Number
			body := iotest.OneByteReader(strings.NewReader(`{"a":9007199254740993}` + suffix))
			err := JSON.BindBody(body, &target, WithUseNumber(true), WithDisallowUnknownFields(true))
			if strings.Contains(suffix, "{") || strings.Contains(suffix, "junk") {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, json.Number("9007199254740993"), target["a"])
			}
		})
	}
}

func TestJSONBindingTrailingReadError(t *testing.T) {
	var target struct{}
	body := io.MultiReader(strings.NewReader("{} \r\n\t"), &failingJSONReader{})
	assert.ErrorIs(t, JSON.BindBody(body, &target), io.ErrClosedPipe)
}

type failingJSONReader struct{}

func (*failingJSONReader) Read([]byte) (int, error) {
	return 0, io.ErrClosedPipe
}

func TestJSONBindingTrailingWhitespaceRespectsBodyLimit(t *testing.T) {
	var target struct{}
	body := http.MaxBytesReader(httptest.NewRecorder(), io.NopCloser(strings.NewReader(`{}`+strings.Repeat(" ", 100))), 32)
	defer body.Close()
	var limitError *http.MaxBytesError
	assert.ErrorAs(t, JSON.BindBody(body, &target), &limitError)
}
