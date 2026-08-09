package sqlmigration

import (
	"encoding/json"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/savedviewtypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// healthyData is a well-formed row: every spec key unmarshals cleanly.
const healthyData = `{"schemaVersion":"v2","spec":{"displayName":"My View","panelType":"table","queries":[{"type":"builder_query","spec":{"name":"A","signal":"logs","aggregations":[{"expression":"count()"}]}}],"selectedFields":[{"name":"service.name"}],"display":{"maxLines":0,"fontSize":"","format":"","color":""}}}`

func TestRepairSavedViewData(t *testing.T) {
	t.Run("healthy data is a no-op", func(t *testing.T) {
		fixed, blanked, ok := repairSavedViewData(healthyData)
		require.True(t, ok)
		assert.Empty(t, blanked)

		var got savedviewtypes.SavedViewData
		require.NoError(t, json.Unmarshal([]byte(fixed), &got))
		assert.Equal(t, "My View", got.Spec.DisplayName)
		assert.Equal(t, []string{"service.name"}, telemetryFieldKeyName(t, got))
	})

	t.Run("selectedFields in the pre-TelemetryFieldKey bare-string shape is blanked, other fields untouched", func(t *testing.T) {
		// this is the actual real-world corruption: migration 109 forwarded the
		// legacy frontend's extraData.selectColumns verbatim before it was typed
		// as []telemetrytypes.TelemetryFieldKey -- a bare list of strings like
		// this fails to unmarshal into a list of objects.
		data := `{"schemaVersion":"v2","spec":{"displayName":"Corrupted Fields","panelType":"table","queries":[{"type":"builder_query","spec":{"name":"A","signal":"logs","aggregations":[{"expression":"count()"}]}}],"selectedFields":["service.name","http.method"],"display":{"maxLines":0,"fontSize":"","format":"","color":""}}}`

		fixed, blanked, ok := repairSavedViewData(data)
		require.True(t, ok)
		assert.Equal(t, []string{"selectedFields"}, blanked)

		var got savedviewtypes.SavedViewData
		require.NoError(t, json.Unmarshal([]byte(fixed), &got))
		assert.Equal(t, "Corrupted Fields", got.Spec.DisplayName, "unrelated fields must survive untouched")
		assert.Equal(t, "table", got.Spec.PanelType.StringValue())
		assert.Len(t, got.Spec.Queries, 1, "unrelated fields must survive untouched")
		assert.Empty(t, got.Spec.SelectedFields, "the corrupted field is blanked to an empty list, not left broken")
	})

	t.Run("queries predating the discriminated-union QueryEnvelope shape is blanked, other fields untouched", func(t *testing.T) {
		data := `{"schemaVersion":"v2","spec":{"displayName":"Old Queries","panelType":"table","queries":[{"query":"select 1"}],"selectedFields":[{"name":"service.name"}],"display":{"maxLines":0,"fontSize":"","format":"","color":""}}}`

		fixed, blanked, ok := repairSavedViewData(data)
		require.True(t, ok)
		assert.Equal(t, []string{"queries"}, blanked)

		var got savedviewtypes.SavedViewData
		require.NoError(t, json.Unmarshal([]byte(fixed), &got))
		assert.Equal(t, "Old Queries", got.Spec.DisplayName)
		assert.Empty(t, got.Spec.Queries)
		assert.Len(t, got.Spec.SelectedFields, 1, "unrelated fields must survive untouched")
	})

	t.Run("multiple corrupted fields are each blanked independently", func(t *testing.T) {
		data := `{"schemaVersion":"v2","spec":{"displayName":"Double Trouble","panelType":"table","queries":[{"query":"select 1"}],"selectedFields":["service.name"],"display":{"maxLines":0,"fontSize":"","format":"","color":""}}}`

		fixed, blanked, ok := repairSavedViewData(data)
		require.True(t, ok)
		assert.ElementsMatch(t, []string{"queries", "selectedFields"}, blanked)

		var got savedviewtypes.SavedViewData
		require.NoError(t, json.Unmarshal([]byte(fixed), &got))
		assert.Equal(t, "Double Trouble", got.Spec.DisplayName)
		assert.Empty(t, got.Spec.Queries)
		assert.Empty(t, got.Spec.SelectedFields)
	})

	t.Run("data is not a JSON object at all", func(t *testing.T) {
		_, _, ok := repairSavedViewData(`not json`)
		assert.False(t, ok)
	})

	t.Run("data is valid JSON but not an object", func(t *testing.T) {
		_, _, ok := repairSavedViewData(`[1,2,3]`)
		assert.False(t, ok)
	})

	t.Run("spec is missing entirely", func(t *testing.T) {
		_, _, ok := repairSavedViewData(`{"schemaVersion":"v2"}`)
		assert.False(t, ok)
	})

	t.Run("spec is present but not an object", func(t *testing.T) {
		_, _, ok := repairSavedViewData(`{"schemaVersion":"v2","spec":"garbage"}`)
		assert.False(t, ok)
	})

	t.Run("an unknown spec key is left untouched regardless of its shape", func(t *testing.T) {
		data := `{"schemaVersion":"v2","spec":{"displayName":"Has Extra Key","panelType":"table","queries":[{"type":"builder_query","spec":{"name":"A","signal":"logs","aggregations":[{"expression":"count()"}]}}],"selectedFields":[],"display":{},"someFutureField":{"whatever":123}}}`

		fixed, blanked, ok := repairSavedViewData(data)
		require.True(t, ok)
		assert.Empty(t, blanked)
		assert.Contains(t, fixed, "someFutureField")
	})
}

func TestSpecFieldUnmarshalsCleanly(t *testing.T) {
	cases := []struct {
		name  string
		key   string
		value string
		want  bool
	}{
		{name: "valid displayName", key: "displayName", value: `"My View"`, want: true},
		{name: "displayName as a number fails", key: "displayName", value: `123`, want: false},
		{name: "valid panelType", key: "panelType", value: `"table"`, want: true},
		{name: "valid queries", key: "queries", value: `[{"type":"builder_query","spec":{"name":"A","signal":"logs","aggregations":[{"expression":"count()"}]}}]`, want: true},
		{name: "queries missing the type discriminator fails", key: "queries", value: `[{"query":"select 1"}]`, want: false},
		{name: "valid selectedFields", key: "selectedFields", value: `[{"name":"service.name"}]`, want: true},
		{name: "selectedFields as bare strings fails", key: "selectedFields", value: `["service.name"]`, want: false},
		{name: "valid display", key: "display", value: `{"maxLines":0,"fontSize":"","format":"","color":""}`, want: true},
		{name: "display as a bare string fails", key: "display", value: `"blue"`, want: false},
		{name: "unknown key always reports clean", key: "someFutureField", value: `{"anything":"goes"}`, want: true},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := specFieldUnmarshalsCleanly(c.key, json.RawMessage(c.value))
			assert.Equal(t, c.want, got)
		})
	}
}

func TestPlaceholderSavedViewData(t *testing.T) {
	placeholder := placeholderSavedViewData("019fe515-d981-7de7-a8c3-6137ae1200c2")

	var got savedviewtypes.SavedViewData
	require.NoError(t, json.Unmarshal([]byte(placeholder), &got), "the placeholder itself must always unmarshal cleanly")

	assert.Equal(t, savedviewtypes.SavedViewSchemaVersion.StringValue(), got.SchemaVersion)
	assert.Contains(t, got.Spec.DisplayName, "019fe515-d981-7de7-a8c3-6137ae1200c2")
	assert.Equal(t, savedviewtypes.PanelTypeTable, got.Spec.PanelType)

	// verify the full read path a Get/List would take doesn't panic or error.
	storable := &savedviewtypes.StorableSavedView{Data: got}
	view := storable.ToSavedView()
	assert.NotNil(t, view.Spec.SelectedFields)
}

// TestUnrepairableDataGetsReplacedNotLeftBroken exercises the exact decision
// Up() makes per row: an unrepairable row must never be left in a state that
// fails to unmarshal, since every future Get/List reads saved_view.data
// straight into savedviewtypes.SavedViewData.
func TestUnrepairableDataGetsReplacedNotLeftBroken(t *testing.T) {
	cases := []string{
		`not json at all`,
		`{"schemaVersion":"v2","spec":"garbage"}`,
		`{"schemaVersion":"v2"}`,
	}

	for _, data := range cases {
		_, _, ok := repairSavedViewData(data)
		require.False(t, ok, "expected %q to be unrepairable", data)

		fixed := placeholderSavedViewData("some-id")
		require.NoError(t, json.Unmarshal([]byte(fixed), new(savedviewtypes.SavedViewData)))
	}
}

func telemetryFieldKeyName(t *testing.T, data savedviewtypes.SavedViewData) []string {
	t.Helper()
	names := make([]string, 0, len(data.Spec.SelectedFields))
	for _, f := range data.Spec.SelectedFields {
		names = append(names, f.Name)
	}
	return names
}
