package valuer

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTextDuration(t *testing.T) {
	cases := []struct {
		name     string
		input    string
		error    bool
		duration time.Duration
		string   string
	}{
		{
			name:     "ParseTextDuration(10s)",
			input:    "10s",
			duration: 10 * time.Second,
			string:   "10s",
		},
		{
			name:     "ParseTextDuration(90m)",
			input:    "90m",
			duration: 90 * time.Minute,
			string:   "90m",
		},
		{
			name:     "ParseTextDuration(1h30m)",
			input:    "1h30m",
			duration: 90 * time.Minute,
			string:   "1h30m",
		},
		{
			name:  "Invalid duration",
			input: "invalid",
			error: true,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var err error
			d, err := ParseTextDuration(tc.input)

			if tc.error {
				assert.Error(t, err)
				return
			}

			assert.NoError(t, err)
			assert.Equal(t, tc.duration, d.Duration())
			assert.Equal(t, tc.string, d.String())
		})
	}
}

func TestTextDuration_MustParsePanics(t *testing.T) {
	assert.Panics(t, func() {
		MustParseTextDuration("not-a-duration")
	})
}

func TestTextDuration_JSON(t *testing.T) {
	t.Run("RoundTrip", func(t *testing.T) {
		parsed, err := ParseTextDuration("90m")
		require.NoError(t, err)

		data, err := json.Marshal(parsed)
		require.NoError(t, err)
		assert.Equal(t, `"90m"`, string(data))

		var decoded TextDuration
		require.NoError(t, json.Unmarshal([]byte(`"2h"`), &decoded))
		assert.Equal(t, 2*time.Hour, decoded.Duration())
		assert.Equal(t, "2h", decoded.String())
	})

	t.Run("Numeric", func(t *testing.T) {
		var decoded TextDuration
		require.NoError(t, json.Unmarshal([]byte(`1000000000`), &decoded))
		assert.Equal(t, time.Second, decoded.Duration())
		assert.Equal(t, "1s", decoded.String())
	})

	t.Run("Invalid", func(t *testing.T) {
		var decoded TextDuration
		assert.Error(t, json.Unmarshal([]byte(`true`), &decoded))
		assert.Error(t, json.Unmarshal([]byte(`"nope"`), &decoded))
	})
}

func TestTextDurationTextMarshaling(t *testing.T) {
	parsed, err := ParseTextDuration("45s")
	require.NoError(t, err)

	data, err := parsed.MarshalText()
	require.NoError(t, err)
	assert.Equal(t, "45s", string(data))

	var decoded TextDuration
	require.NoError(t, decoded.UnmarshalText([]byte("2m")))
	assert.Equal(t, 2*time.Minute, decoded.Duration())
	assert.Equal(t, "2m", decoded.String())

	assert.Error(t, decoded.UnmarshalText([]byte("invalid")))
}

func TestTextDurationValueAndScan(t *testing.T) {
	parsed, err := ParseTextDuration("2s")
	require.NoError(t, err)

	val, err := parsed.Value()
	require.NoError(t, err)
	assert.Equal(t, "2s", val)

	var scanned TextDuration

	err = scanned.Scan(nil)
	require.NoError(t, err)
	assert.True(t, scanned.IsZero())
	assert.Equal(t, "0s", scanned.String())

	err = scanned.Scan([]byte("3s"))
	require.NoError(t, err)
	assert.Equal(t, 3*time.Second, scanned.Duration())
	assert.Equal(t, "3s", scanned.String())

	err = scanned.Scan(true)
	assert.Error(t, err)
}

func TestTextDurationUnmarshalParam(t *testing.T) {
	var decoded TextDuration
	require.NoError(t, decoded.UnmarshalParam("2m"))
	assert.Equal(t, 2*time.Minute, decoded.Duration())
	assert.Equal(t, "2m", decoded.String())

	assert.Error(t, decoded.UnmarshalParam("invalid"))
}
