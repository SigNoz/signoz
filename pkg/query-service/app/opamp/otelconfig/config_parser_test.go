package otelconfig

import (
	"fmt"
	"os"
	"testing"

	"github.com/knadh/koanf/parsers/yaml"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/collector/confmap"
)

func TestServiceConfig(t *testing.T) {
	yamlFile, err := os.ReadFile("./testdata/service.yaml")
	if err != nil {
		fmt.Printf("yamlFile.Get err   #%v ", err)
		t.Fail()
		return
	}

	c, err := yaml.Parser().Unmarshal([]byte(yamlFile))
	if err != nil {
		fmt.Println("failed to parse config file as yaml", err)
		t.Fail()
		return
	}

	agentConf := confmap.NewFromStringMap(c)
	configParser := NewConfigParser(agentConf)

	expected := map[string]interface{}{
		"extensions": []interface{}{"zpages"},
		"pipelines": map[string]interface{}{
			"traces": map[string]interface{}{
				"receivers": []interface{}{"jaeger", "otlp"},
				"processors": []interface{}{
					"signozspanmetrics/cumulative", "batch",
				},
				"exporters": []interface{}{
					"clickhousetraces",
				},
			},
			"metrics": map[string]interface{}{
				"receivers": []interface{}{
					"otlp", "hostmetrics",
				},
				"processors": []interface{}{
					"batch",
				},
				"exporters": []interface{}{
					"clickhousemetricswrite",
				},
			},
		},
	}

	require.Equal(t, expected, configParser.Service(), "expected same service config after parsing")
}
