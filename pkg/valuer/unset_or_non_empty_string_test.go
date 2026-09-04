package valuer

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewUnsetOrNonEmptyString(t *testing.T) {
	testCases := []struct {
		description     string
		value           string
		expectedError   bool
		expectedWrapped UnsetOrNonEmptyString
	}{
		{description: "plain value", value: "oncall", expectedWrapped: UnsetOrNonEmptyString{val: "oncall"}},
		{description: "case and surrounding space are kept", value: "  On Call  ", expectedWrapped: UnsetOrNonEmptyString{val: "  On Call  "}},
		{description: "whitespace alone is not empty", value: " ", expectedWrapped: UnsetOrNonEmptyString{val: " "}},
		{description: "empty", value: "", expectedError: true},
	}

	for _, testCase := range testCases {
		t.Run(testCase.description, func(t *testing.T) {
			nonEmptyString, err := NewUnsetOrNonEmptyString(testCase.value)
			if testCase.expectedError {
				assert.Error(t, err)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, testCase.expectedWrapped, nonEmptyString)
		})
	}
}

func TestUnsetOrNonEmptyStringUnmarshalJSONRejectsAnEmptyString(t *testing.T) {
	var target struct {
		Title UnsetOrNonEmptyString `json:"title"`
	}

	require.NoError(t, json.Unmarshal([]byte(`{"title":"Alert"}`), &target))
	assert.Equal(t, "Alert", target.Title.StringValue())

	assert.Error(t, json.Unmarshal([]byte(`{"title":""}`), &target))
}

// The zero value is the only way an empty UnsetOrNonEmptyString comes about, and it is
// what lets a caller omit the field and take a default filled in elsewhere.
func TestUnsetOrNonEmptyStringUnmarshalJSONLeavesAnAbsentFieldZero(t *testing.T) {
	var target struct {
		Title UnsetOrNonEmptyString `json:"title"`
	}

	require.NoError(t, json.Unmarshal([]byte(`{}`), &target))
	assert.True(t, target.Title.IsZero())
}

func TestUnsetOrNonEmptyStringMarshalJSON(t *testing.T) {
	raw, err := json.Marshal(MustNewUnsetOrNonEmptyString("Alert"))
	require.NoError(t, err)
	assert.JSONEq(t, `"Alert"`, string(raw))
}

// A store spells unset as an empty or null column, so scanning one is the unset
// case rather than a failure. Only a non-string column is an error.
func TestUnsetOrNonEmptyStringScanReadsAnEmptyColumnAsUnset(t *testing.T) {
	var unsetOrNonEmpty UnsetOrNonEmptyString

	require.NoError(t, unsetOrNonEmpty.Scan("oncall"))
	assert.Equal(t, "oncall", unsetOrNonEmpty.StringValue())

	require.NoError(t, unsetOrNonEmpty.Scan(""))
	assert.True(t, unsetOrNonEmpty.IsZero())

	require.NoError(t, unsetOrNonEmpty.Scan("oncall"))
	require.NoError(t, unsetOrNonEmpty.Scan(nil))
	assert.True(t, unsetOrNonEmpty.IsZero())

	assert.Error(t, unsetOrNonEmpty.Scan(42))
}

func TestUnsetOrNonEmptyStringUnmarshalTextRejectsAnEmptyString(t *testing.T) {
	var nonEmptyString UnsetOrNonEmptyString

	require.NoError(t, nonEmptyString.UnmarshalText([]byte("oncall")))
	assert.Equal(t, "oncall", nonEmptyString.StringValue())

	assert.Error(t, nonEmptyString.UnmarshalText([]byte("")))
}

func TestUnsetOrNonEmptyStringUnmarshalParamRejectsAnEmptyString(t *testing.T) {
	var nonEmptyString UnsetOrNonEmptyString

	require.NoError(t, nonEmptyString.UnmarshalParam("oncall"))
	assert.Equal(t, "oncall", nonEmptyString.StringValue())

	assert.Error(t, nonEmptyString.UnmarshalParam(""))
}

func TestUnsetIfEmpty(t *testing.T) {
	assert.True(t, UnsetIfEmpty("").IsZero())
	assert.Equal(t, MustNewUnsetOrNonEmptyString("oncall"), UnsetIfEmpty("oncall"))
}
