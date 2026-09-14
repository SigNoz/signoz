package dashboardtypes

import (
	"encoding/json"
	"fmt"
	"testing"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func specWithDuration(duration string) []byte {
	return fmt.Appendf(nil, `{
		"display": {"name": "Durations"},
		"variables": [],
		"panels": {},
		"layouts": [],
		"links": [],
		"duration": %q
	}`, duration)
}

func TestDashboardSpecDuration(t *testing.T) {
	// Perses rejects what isn't a duration at all; the narrower SigNoz rule
	// rejects the durations the time picker can't apply.
	pickerGrammar := []string{"must be a whole number of minutes, hours, days or weeks"}

	tests := []struct {
		name        string
		duration    string
		wantContain []string
	}{
		{name: "minutes", duration: "30m"},
		{name: "hours", duration: "2h"},
		{name: "days", duration: "1d"},
		{name: "weeks", duration: "1w"},
		{name: "empty means unset", duration: ""},
		{name: "not a duration", duration: "abc", wantContain: []string{`"abc"`}},
		{name: "unknown unit", duration: "30x", wantContain: []string{`"30x"`}},
		{name: "compound window", duration: "1h30m", wantContain: append(pickerGrammar, `got "1h30m"`)},
		{name: "seconds", duration: "15s", wantContain: append(pickerGrammar, `got "15s"`)},
		{name: "years", duration: "1y", wantContain: append(pickerGrammar, `got "1y"`)},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			spec, err := unmarshalDashboard(specWithDuration(tt.duration))
			if len(tt.wantContain) > 0 {
				require.Error(t, err)
				for _, want := range tt.wantContain {
					assert.Contains(t, err.Error(), want)
				}
				assert.True(t, errors.Ast(err, errors.TypeInvalidInput), "a window the time picker cannot apply is invalid input")
				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.duration, string(spec.Duration))

			raw, err := json.Marshal(spec)
			require.NoError(t, err)
			assert.Contains(t, string(raw), fmt.Sprintf(`"duration":%q`, tt.duration), "duration is serialized without omitempty")
		})
	}
}

func TestPatchDashboardDuration(t *testing.T) {
	var p PostableDashboardV2
	require.NoError(t, json.Unmarshal([]byte(basePostableJSON), &p))
	base, err := p.NewDashboardV2(valuer.GenerateUUID(), "someone@signoz.io", SourceUser)
	require.NoError(t, err)

	apply := func(t *testing.T, body string) (*UpdatableDashboardV2, error) {
		t.Helper()
		var patch PatchableDashboardV2
		require.NoError(t, json.Unmarshal([]byte(body), &patch))
		return patch.Apply(base)
	}

	t.Run("replace sets the default window", func(t *testing.T) {
		out, err := apply(t, `[{"op": "replace", "path": "/spec/duration", "value": "1d"}]`)
		require.NoError(t, err)
		assert.Equal(t, "1d", string(out.Spec.Duration))
	})

	// The member always exists in the patched shape, so `replace` also clears it.
	t.Run("replace clears the default window", func(t *testing.T) {
		out, err := apply(t, `[{"op": "replace", "path": "/spec/duration", "value": ""}]`)
		require.NoError(t, err)
		assert.Empty(t, string(out.Spec.Duration))
	})

	t.Run("reject an unparseable window", func(t *testing.T) {
		_, err := apply(t, `[{"op": "replace", "path": "/spec/duration", "value": "abc"}]`)
		assert.Error(t, err)
	})

	t.Run("reject a window the time picker cannot apply", func(t *testing.T) {
		_, err := apply(t, `[{"op": "replace", "path": "/spec/duration", "value": "1h30m"}]`)
		assert.Error(t, err)
	})
}
