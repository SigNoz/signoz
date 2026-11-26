package agentConf

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	yaml "gopkg.in/yaml.v3"
)

func TestProcessorsConfByCollectorPipeline(t *testing.T) {
	collectorConf := []byte(`
receivers:
  otlp: {}
processors:
  batch: {}
  memory_limiter: {}
  resourcedetection: {}
  memory_limiter/traces: {}
  attributes/tenant:
    actions:
      - key: tenant.token
        value: tenantsecret
        action: insert
  signozlogsnormalizer:
    opamp:
      position: before
  signozlogspipeline/pipeline_parse-nginx:
    operators:
      - id: move
        type: move
exporters:
  clickhouselogsexporter:
    dsn: tcp://admin:supersecret@clickhouse:9000/signoz_logs
extensions:
  basicauth:
    client_auth:
      password: hunter2
service:
  extensions: [basicauth]
  pipelines:
    logs:
      receivers: [otlp]
      processors: [memory_limiter, signozlogsnormalizer, signozlogspipeline/pipeline_parse-nginx, attributes/tenant, batch]
      exporters: [clickhouselogsexporter]
    traces:
      receivers: [otlp]
      processors: [memory_limiter/traces, batch, memory_limiter/traces]
      exporters: [clickhouselogsexporter]
`)

	processorsConfs, err := ProcessorsConfByCollectorPipeline(collectorConf)
	require.NoError(t, err)
	require.Len(t, processorsConfs, 2)

	for _, conf := range processorsConfs {
		assert.NotContains(t, string(conf), "supersecret")
		assert.NotContains(t, string(conf), "hunter2")
		assert.NotContains(t, string(conf), "tenantsecret")
		assert.NotContains(t, string(conf), "resourcedetection")
	}
	assert.Equal(t, []string{"memory_limiter", "signozlogsnormalizer", "signozlogspipeline/pipeline_parse-nginx", "attributes/tenant", "batch"}, processorNamesInOrder(t, processorsConfs["logs"]))
	assert.Equal(t, []string{"memory_limiter/traces", "batch", "memory_limiter/traces"}, processorNamesInOrder(t, processorsConfs["traces"]))
	assert.Contains(t, string(processorsConfs["logs"]), "type: move")
	assert.Contains(t, string(processorsConfs["logs"]), "position: before")
	assert.Contains(t, string(processorsConfs["logs"]), "- memory_limiter\n")
}

func processorNamesInOrder(t *testing.T, conf []byte) []string {
	t.Helper()
	var processors []any
	require.NoError(t, yaml.Unmarshal(conf, &processors))
	var names []string
	for _, processor := range processors {
		switch processor := processor.(type) {
		case string:
			names = append(names, processor)
		case map[string]any:
			require.Len(t, processor, 1)
			for name := range processor {
				names = append(names, name)
			}
		default:
			require.Failf(t, "unexpected processor entry", "%v", processor)
		}
	}
	return names
}
