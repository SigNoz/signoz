package signozapiserver

import (
	"encoding/json"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/savedviewtypes"
	"github.com/stretchr/testify/require"
)

func TestSavedViewExamplesAreValidPayloads(t *testing.T) {
	for _, ex := range postableSavedViewExamples() {
		t.Run("create/"+ex.Name, func(t *testing.T) {
			raw, err := json.Marshal(ex.Value)
			require.NoError(t, err)
			var postable savedviewtypes.PostableSavedView
			require.NoError(t, json.Unmarshal(raw, &postable))
			require.NoError(t, postable.Validate())
		})
	}
	for _, ex := range updatableSavedViewExamples() {
		t.Run("update/"+ex.Name, func(t *testing.T) {
			raw, err := json.Marshal(ex.Value)
			require.NoError(t, err)
			var updatable savedviewtypes.UpdatableSavedView
			require.NoError(t, json.Unmarshal(raw, &updatable))
			require.NoError(t, updatable.Validate())
		})
	}
}
