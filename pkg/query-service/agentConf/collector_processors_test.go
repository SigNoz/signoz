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
      processors: [memory_limiter, signozlogspipeline/pipeline_parse-nginx, batch]
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
		assert.NotContains(t, string(conf), "resourcedetection")
	}
	assert.Equal(t, []string{"memory_limiter", "signozlogspipeline/pipeline_parse-nginx", "batch"}, processorNamesInOrder(t, processorsConfs["logs"]))
	assert.Equal(t, []string{"memory_limiter/traces", "batch", "memory_limiter/traces"}, processorNamesInOrder(t, processorsConfs["traces"]))
	assert.Contains(t, string(processorsConfs["logs"]), "type: move")
}

func processorNamesInOrder(t *testing.T, conf []byte) []string {
	t.Helper()
	var processors []map[string]any
	require.NoError(t, yaml.Unmarshal(conf, &processors))
	var names []string
	for _, processor := range processors {
		require.Len(t, processor, 1)
		for name := range processor {
			names = append(names, name)
		}
	}
	return names
}
