package signozapiserver

import (
	"encoding/json"
	"testing"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

func TestDashboardExamplesAreValidPayloads(t *testing.T) {
	for _, ex := range createDashboardExamples() {
		t.Run("create/"+ex.Name, func(t *testing.T) {
			raw, err := json.Marshal(ex.Value)
			require.NoError(t, err)
			var postable dashboardtypes.PostableDashboardV2
			require.NoError(t, json.Unmarshal(raw, &postable))
		})
	}

	var base dashboardtypes.UpdatableDashboardV2
	for _, ex := range updateDashboardExamples() {
		t.Run("update/"+ex.Name, func(t *testing.T) {
			raw, err := json.Marshal(ex.Value)
			require.NoError(t, err)
			require.NoError(t, json.Unmarshal(raw, &base))
		})
	}

	existing := &dashboardtypes.DashboardV2{
		Identifiable:            types.Identifiable{ID: valuer.GenerateUUID()},
		Source:                  dashboardtypes.SourceUser,
		DashboardV2MetadataBase: base.DashboardV2MetadataBase,
		Name:                    base.Name,
		Spec:                    base.Spec,
	}
	for _, ex := range patchDashboardExamples() {
		t.Run("patch/"+ex.Name, func(t *testing.T) {
			raw, err := json.Marshal(ex.Value)
			require.NoError(t, err)
			var patch dashboardtypes.PatchableDashboardV2
			require.NoError(t, json.Unmarshal(raw, &patch))
			_, err = patch.Apply(existing)
			require.NoError(t, err)
		})
	}
}
