package genaimessages

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// testdata/captured/<sdk>/<attribute>.txt holds a real attribute value from the scripts
// repo's static-telemetry-generator captures; <attribute>.want.json is its reviewed output.
func TestNormalizeCapturedPayloads(t *testing.T) {
	inputs, err := filepath.Glob(filepath.Join("testdata", "captured", "*", "*.txt"))
	require.NoError(t, err)
	require.NotEmpty(t, inputs)

	for _, input := range inputs {
		sdk := filepath.Base(filepath.Dir(input))
		attribute := strings.TrimSuffix(filepath.Base(input), ".txt")
		t.Run(sdk+"/"+attribute, func(t *testing.T) {
			raw, err := os.ReadFile(input)
			require.NoError(t, err)
			wantJSON, err := os.ReadFile(strings.TrimSuffix(input, ".txt") + ".want.json")
			require.NoError(t, err)

			var want []aiobservabilitytypes.Message
			require.NoError(t, json.Unmarshal(wantJSON, &want))
			got, err := json.Marshal(Normalize(string(raw)))
			require.NoError(t, err)
			var gotRoundTrip []aiobservabilitytypes.Message
			require.NoError(t, json.Unmarshal(got, &gotRoundTrip))

			assert.Equal(t, want, gotRoundTrip)
		})
	}
}
