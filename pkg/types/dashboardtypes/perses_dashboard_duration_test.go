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
	// Decode accepts anything Perses does: a stored dashboard must stay readable
	// even when its window predates the narrower write-time rule.
	testCases := []struct {
		name        string
		duration    string
		wantContain string
	}{
		{name: "Minutes", duration: "30m"},
		{name: "Hours", duration: "2h"},
		{name: "Days", duration: "1d"},
		{name: "Weeks", duration: "1w"},
		{name: "Empty_Unset", duration: ""},
		{name: "CompoundWindow_StoredValueStaysReadable", duration: "1h30m"},
		{name: "Seconds_StoredValueStaysReadable", duration: "15s"},
		{name: "Years_StoredValueStaysReadable", duration: "1y"},
		{name: "Zero_StoredValueStaysReadable", duration: "0m"},
		{name: "NotADuration", duration: "abc", wantContain: `"abc"`},
		{name: "UnknownUnit", duration: "30x", wantContain: `"30x"`},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			spec, err := unmarshalDashboard(specWithDuration(testCase.duration))
			if testCase.wantContain != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), testCase.wantContain)
				assert.True(t, errors.Ast(err, errors.TypeInvalidInput))
				return
			}

			require.NoError(t, err)
			assert.Equal(t, testCase.duration, string(spec.Duration))

			raw, err := json.Marshal(spec)
			require.NoError(t, err)
			assert.Contains(t, string(raw), fmt.Sprintf(`"duration":%q`, testCase.duration), "duration is serialized without omitempty")
		})
	}
}

func TestPostableDashboardDuration(t *testing.T) {
	// The write path additionally rejects the durations the time picker can't apply.
	pickerGrammar := "must be a positive whole number of minutes, hours, days or weeks"

	postable := func(duration string) []byte {
		return fmt.Appendf(nil, `{"schemaVersion": %q, "name": "durations", "tags": [], "spec": %s}`, SchemaVersion, specWithDuration(duration))
	}

	testCases := []struct {
		name        string
		duration    string
		wantContain []string
	}{
		{name: "Minutes", duration: "30m"},
		{name: "Hours", duration: "2h"},
		{name: "Days", duration: "1d"},
		{name: "Weeks", duration: "1w"},
		{name: "Empty_Unset", duration: ""},
		{name: "NotADuration", duration: "abc", wantContain: []string{`"abc"`}},
		{name: "UnknownUnit", duration: "30x", wantContain: []string{`"30x"`}},
		{name: "CompoundWindow_PickerCannotApply", duration: "1h30m", wantContain: []string{pickerGrammar, `got "1h30m"`}},
		{name: "Seconds_PickerCannotApply", duration: "15s", wantContain: []string{pickerGrammar, `got "15s"`}},
		{name: "Years_PickerCannotApply", duration: "1y", wantContain: []string{pickerGrammar, `got "1y"`}},
		{name: "Zero_PickerCannotApply", duration: "0m", wantContain: []string{pickerGrammar, `got "0m"`}},
		{name: "LeadingZero_PickerCannotApply", duration: "01h", wantContain: []string{pickerGrammar, `got "01h"`}},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			var p PostableDashboardV2
			err := json.Unmarshal(postable(testCase.duration), &p)
			if len(testCase.wantContain) > 0 {
				require.Error(t, err)
				for _, want := range testCase.wantContain {
					assert.Contains(t, err.Error(), want)
				}
				assert.True(t, errors.Ast(err, errors.TypeInvalidInput), "a window the time picker cannot apply is invalid input")
				return
			}
			require.NoError(t, err)
			assert.Equal(t, testCase.duration, string(p.Spec.Duration))
		})
	}
}

func TestStoredDashboardDurationStaysReadable(t *testing.T) {
	var p PostableDashboardV2
	require.NoError(t, json.Unmarshal([]byte(basePostableJSON), &p))
	d, err := p.NewDashboardV2(valuer.GenerateUUID(), "someone@signoz.io", SourceUser)
	require.NoError(t, err)
	d.Spec.Duration = "1h30m"

	storable, err := d.ToStorableDashboard()
	require.NoError(t, err)
	out, err := storable.ToDashboardV2(nil)
	require.NoError(t, err)
	assert.Equal(t, "1h30m", string(out.Spec.Duration))

	// The dashboard can still be repaired through the patch path.
	var patch PatchableDashboardV2
	require.NoError(t, json.Unmarshal([]byte(`[{"op": "replace", "path": "/spec/duration", "value": "1h"}]`), &patch))
	fixed, err := patch.Apply(out)
	require.NoError(t, err)
	assert.Equal(t, "1h", string(fixed.Spec.Duration))
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

	t.Run("Replace_SetsDefaultWindow", func(t *testing.T) {
		out, err := apply(t, `[{"op": "replace", "path": "/spec/duration", "value": "1d"}]`)
		require.NoError(t, err)
		assert.Equal(t, "1d", string(out.Spec.Duration))
	})

	// The member always exists in the patched shape, so `replace` also clears it.
	t.Run("Replace_EmptyValue_ClearsDefaultWindow", func(t *testing.T) {
		out, err := apply(t, `[{"op": "replace", "path": "/spec/duration", "value": ""}]`)
		require.NoError(t, err)
		assert.Empty(t, string(out.Spec.Duration))
	})

	t.Run("Replace_Unparseable_Rejected", func(t *testing.T) {
		_, err := apply(t, `[{"op": "replace", "path": "/spec/duration", "value": "abc"}]`)
		assert.Error(t, err)
	})

	t.Run("Replace_PickerCannotApply_Rejected", func(t *testing.T) {
		_, err := apply(t, `[{"op": "replace", "path": "/spec/duration", "value": "1h30m"}]`)
		assert.Error(t, err)
	})
}
