package signozapiserver

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

func TestQueryRangeFunctionExamplesAreValidRequests(t *testing.T) {
	for _, example := range queryRangeFunctionExamples() {
		t.Run(example.Name, func(t *testing.T) {
			raw, err := json.Marshal(example.Value)
			require.NoError(t, err)
			var req qbtypes.QueryRangeRequest
			require.NoError(t, json.Unmarshal(raw, &req))
			assert.NoError(t, req.Validate())
		})
	}
}
