package valuer

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDisplayName_GenerateCloneName(t *testing.T) {
	testCases := []struct {
		name     string
		input    string
		expected string
	}{
		{name: "PlainName_CopySuffixAppended", input: "High CPU", expected: "High CPU - Copy"},
		{name: "CopySuffix_BumpedToTwo", input: "High CPU - Copy", expected: "High CPU - Copy (2)"},
		{name: "NumberedSuffix_Incremented", input: "High CPU - Copy (2)", expected: "High CPU - Copy (3)"},
		{name: "MultiDigitSuffix_Incremented", input: "svc - Copy (41)", expected: "svc - Copy (42)"},
		{name: "ContainsCopyWord_NotTreatedAsSuffix", input: "Copy of things", expected: "Copy of things - Copy"},
		{name: "RepeatedCopy_OnlyTrailingMarkerParsed", input: "Prod - Copy - Copy", expected: "Prod - Copy - Copy (2)"},
		{name: "EmptyName_SuffixOnly", input: "", expected: " - Copy"},
		{
			name:     "LongName_NotTruncated",
			input:    "Muting And Manual Resolving Log Based Alert 7 October With A Very Long Descriptive Name That Goes On And On Past One Hundred Twenty Eight Characters",
			expected: "Muting And Manual Resolving Log Based Alert 7 October With A Very Long Descriptive Name That Goes On And On Past One Hundred Twenty Eight Characters - Copy",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.expected, NewDisplayName(testCase.input).GenerateCloneName().StringValue())
		})
	}
}

func TestDisplayName_UnmarshalJSON(t *testing.T) {
	testCases := []struct {
		name      string
		existing  string
		input     string
		expected  string
		expectErr bool
	}{
		{name: "MixedCaseAndWhitespace_Preserved", input: `" High CPU  Mixed "`, expected: " High CPU  Mixed "},
		{name: "Null_KeepsExistingValue", existing: "kept", input: `null`, expected: "kept"},
		{name: "NonString_Error", input: `42`, expectErr: true},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			name := NewDisplayName(testCase.existing)

			err := json.Unmarshal([]byte(testCase.input), &name)
			if testCase.expectErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, testCase.expected, name.StringValue())
		})
	}
}

func TestDisplayName_MarshalJSON(t *testing.T) {
	out, err := json.Marshal(struct {
		Name DisplayName `json:"name"`
	}{Name: NewDisplayName(" High CPU ")})
	require.NoError(t, err)
	assert.JSONEq(t, `{"name": " High CPU "}`, string(out))
}

func TestDisplayName_Scan(t *testing.T) {
	testCases := []struct {
		name      string
		input     any
		expected  string
		expectErr bool
	}{
		{name: "String_Scanned", input: "High CPU", expected: "High CPU"},
		{name: "Nil_ScannedAsZero", input: nil, expected: ""},
		{name: "NonString_Error", input: 42, expectErr: true},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			name := NewDisplayName("previous")

			err := name.Scan(testCase.input)
			if testCase.expectErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, testCase.expected, name.StringValue())

			value, err := name.Value()
			require.NoError(t, err)
			assert.Equal(t, testCase.expected, value)
		})
	}
}

func TestDisplayName_TextRoundTrip(t *testing.T) {
	text, err := NewDisplayName(" High CPU ").MarshalText()
	require.NoError(t, err)

	var name DisplayName
	require.NoError(t, name.UnmarshalText(text))
	assert.Equal(t, " High CPU ", name.StringValue())
}
