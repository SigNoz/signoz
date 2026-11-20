package otelconfig

import (
	"testing"

	"github.com/knadh/koanf/parsers/yaml"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/collector/confmap"
)

func parserFromYAML(t *testing.T, src string) ConfigParser {
	t.Helper()
	c, err := yaml.Parser().Unmarshal([]byte(src))
	require.NoError(t, err)
	return NewConfigParser(confmap.NewFromStringMap(c))
}

// The config read here is the agent's own reported config, so a key can be
// present while holding a type the parser does not expect. Each of these used
// to panic on a type assertion rather than degrading to the empty value that an
// absent key already produces.
func TestConfigParserWithUnexpectedShapes(t *testing.T) {
	t.Run("processors is a scalar rather than a list", func(t *testing.T) {
		cp := parserFromYAML(t, `
service:
  pipelines:
    traces:
      processors: batch
`)
		assert.Empty(t, cp.PipelineProcessors("traces"))
	})

	t.Run("pipelines is a list rather than a map", func(t *testing.T) {
		cp := parserFromYAML(t, `
service:
  pipelines:
    - traces
`)
		assert.Empty(t, cp.Pipelines("traces"))
	})

	t.Run("service is a scalar rather than a map", func(t *testing.T) {
		cp := parserFromYAML(t, `
service: none
`)
		assert.Empty(t, cp.Service())
	})

	t.Run("named pipeline is a scalar rather than a map", func(t *testing.T) {
		cp := parserFromYAML(t, `
service:
  pipelines:
    traces: batch
`)
		assert.Empty(t, cp.PipelineProcessors("traces"))
	})
}

func TestConfigParserReadsWellFormedConfig(t *testing.T) {
	cp := parserFromYAML(t, `
service:
  pipelines:
    traces:
      receivers:
        - otlp
      processors:
        - batch
        - signozspanmetrics
      exporters:
        - clickhousetraces
`)

	assert.Equal(t, []interface{}{"batch", "signozspanmetrics"}, cp.PipelineProcessors("traces"))
	assert.Equal(t, []interface{}{"otlp"}, cp.PipelineReceivers("traces"))
	assert.Equal(t, []interface{}{"clickhousetraces"}, cp.PipelineExporters("traces"))
	assert.True(t, cp.CheckPipelineExists("traces"))
	assert.False(t, cp.CheckPipelineExists("metrics"))
}
