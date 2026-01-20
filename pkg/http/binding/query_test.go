package binding

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestQueryBinding_BindQuery(t *testing.T) {
	one := 1
	zero := 0
	testCases := []struct {
		name     string
		query    map[string][]string
		obj      any
		expected any
	}{
		{name: "SingleIntField_NonEmptyValue", query: map[string][]string{"a": {"1"}}, obj: &struct{A int `query:"a"`}{}, expected: &struct{ A int }{A: 1}},
		{name: "SingleIntField_EmptyValue", query: map[string][]string{"a": {""}}, obj: &struct{A int `query:"a"`}{}, expected: &struct{ A int }{A: 0}},
		{name: "SingleIntField_MissingField", query: map[string][]string{}, obj: &struct{A int `query:"a"`}{}, expected: &struct{ A int }{A: 0}},
		{name: "SinglePointerIntField_NonEmptyValue", query: map[string][]string{"a": {"1"}}, obj: &struct{A *int `query:"a"`}{}, expected: &struct{ A *int }{A: &one}},
		{name: "SinglePointerIntField_EmptyValue", query: map[string][]string{"a": {""}}, obj: &struct{A *int `query:"a"`}{}, expected: &struct{ A *int }{A: &zero}},
		{name: "SinglePointerIntField_MissingField", query: map[string][]string{}, obj: &struct{A *int `query:"a"`}{}, expected: &struct{ A *int }{A: nil}},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			err := Query.BindQuery(testCase.query, testCase.obj)
			assert.NoError(t, err)
			assert.EqualValues(t, testCase.expected, testCase.obj)
		})
	}
}
