package signozapiserver

import (
	"encoding/json"
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/stretchr/testify/require"
)

func TestQueryRangeFunctionExamplesAreValidRequests(t *testing.T) {
	for _, ex := range queryRangeFunctionExamples() {
		t.Run(ex.Name, func(t *testing.T) {
			raw, err := json.Marshal(ex.Value)
			require.NoError(t, err)
			var req qbtypes.QueryRangeRequest
			require.NoError(t, json.Unmarshal(raw, &req))
			require.NoError(t, req.Validate())
		})
	}
}
