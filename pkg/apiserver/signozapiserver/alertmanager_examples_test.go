package signozapiserver

import (
	"encoding/json"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/stretchr/testify/require"
)

func TestNotificationChannelExamplesAreValidPayloads(t *testing.T) {
	for _, ex := range createNotificationChannelExamples() {
		t.Run("create/"+ex.Name, func(t *testing.T) {
			raw, err := json.Marshal(ex.Value)
			require.NoError(t, err)
			var postable alertmanagertypes.PostableNotificationChannel
			require.NoError(t, json.Unmarshal(raw, &postable))
			require.NoError(t, postable.Validate())
		})
	}
	for _, ex := range updateNotificationChannelExamples() {
		t.Run("update/"+ex.Name, func(t *testing.T) {
			raw, err := json.Marshal(ex.Value)
			require.NoError(t, err)
			var updatable alertmanagertypes.UpdatableNotificationChannel
			require.NoError(t, json.Unmarshal(raw, &updatable))
			require.NoError(t, updatable.Validate())
		})
	}
	for _, ex := range testNotificationChannelExamples() {
		t.Run("test/"+ex.Name, func(t *testing.T) {
			raw, err := json.Marshal(ex.Value)
			require.NoError(t, err)
			var testable alertmanagertypes.TestableNotificationChannel
			require.NoError(t, json.Unmarshal(raw, &testable))
			require.NoError(t, testable.Validate())
		})
	}
}
