package dashboardtypes

import (
	"encoding/json"
	"testing"

	"github.com/SigNoz/signoz/pkg/errors"
	qb "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// An AI builder query is a gen_ai-scoped traces builder query: the signal is
// implied by the plugin kind and pinned to traces on decode, mirroring the
// builder_ai_query QueryEnvelope.
func TestAIBuilderQueryPluginRoundTrip(t *testing.T) {
	data := []byte(`{
		"variables": [],
		"panels": {"p1": {"kind": "Panel", "spec": {
			"links": [],
			"plugin": {"kind": "signoz/TimeSeriesPanel", "spec": {}},
			"queries": [{"kind": "time_series", "spec": {"plugin": {"kind": "signoz/AIBuilderQuery", "spec": {
				"name": "A", "aggregations": [{"expression": "count()"}]
			}}}}]
		}}},
		"links": [],
		"layouts": []
	}`)

	spec, err := unmarshalDashboard(data)
	require.NoError(t, err)

	plugin := spec.Panels["p1"].Spec.Queries[0].Spec.Plugin
	assert.Equal(t, QueryKindAIBuilder, plugin.Kind)

	aiSpec, ok := plugin.Spec.(*AIBuilderQuerySpec)
	require.True(t, ok, "expected *AIBuilderQuerySpec, got %T", plugin.Spec)
	assert.Equal(t, "A", aiSpec.Name)
	assert.Equal(t, telemetrytypes.SignalTraces, aiSpec.Signal)

	// Marshal emits the pinned signal and decodes back to the same plugin.
	out, err := json.Marshal(plugin)
	require.NoError(t, err)
	assert.Contains(t, string(out), `"kind":"signoz/AIBuilderQuery"`)
	assert.Contains(t, string(out), `"signal":"traces"`)

	var roundTripped QueryPlugin
	require.NoError(t, json.Unmarshal(out, &roundTripped))
	assert.Equal(t, plugin, roundTripped)
}

// At query-range time an AI builder query wraps into a single builder_ai_query
// envelope so the querier routes it to the gen_ai statement builder.
func TestAIBuilderQueryPluginBuildsBuilderAIEnvelope(t *testing.T) {
	plugin := QueryPlugin{Kind: QueryKindAIBuilder, Spec: &AIBuilderQuerySpec{Name: "A", Signal: telemetrytypes.SignalTraces}}

	composite, err := plugin.buildV5CompositeQueryFromPlugin()
	require.NoError(t, err)
	require.Len(t, composite.Queries, 1)
	assert.Equal(t, qb.QueryTypeBuilderAI, composite.Queries[0].Type)

	spec, ok := composite.Queries[0].Spec.(qb.QueryBuilderQuery[qb.TraceAggregation])
	require.True(t, ok, "expected traces builder query, got %T", composite.Queries[0].Spec)
	assert.Equal(t, "A", spec.Name)
	assert.Equal(t, telemetrytypes.SignalTraces, spec.Signal)
}

func TestAIBuilderQueryPluginNilSpec(t *testing.T) {
	plugin := QueryPlugin{Kind: QueryKindAIBuilder, Spec: (*AIBuilderQuerySpec)(nil)}

	_, err := plugin.buildV5CompositeQueryFromPlugin()
	require.Error(t, err)
	assert.True(t, errors.Ast(err, errors.TypeInvalidInput))
}
