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

			typ, c, m, _, _, a := errors.Unwrapb(err)
			assert.Equal(t, errors.TypeInvalidInput, typ)
			assert.Equal(t, testCase.code, c)
			assert.Equal(t, testCase.message, m)
			assert.ElementsMatch(t, testCase.a, a)
		})
	}
}
