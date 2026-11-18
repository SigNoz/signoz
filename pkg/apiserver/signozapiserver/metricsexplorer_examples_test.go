package signozapiserver

import (
	"encoding/json"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/metricsexplorertypes"
	"github.com/stretchr/testify/require"
)

func TestTreemapExamplesAreValidPayloads(t *testing.T) {
	for _, ex := range treemapRequestExamples() {
		t.Run(ex.Name, func(t *testing.T) {
			raw, err := json.Marshal(ex.Value)
			require.NoError(t, err)
			var req metricsexplorertypes.TreemapRequest
			require.NoError(t, json.Unmarshal(raw, &req))
			require.NoError(t, req.Validate())
		})
	}
}
