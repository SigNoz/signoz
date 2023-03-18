package otelconfig

import (
	"fmt"
	"io/ioutil"
	"log"
	"testing"
	"time"

	"github.com/knadh/koanf/parsers/yaml"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/collector/confmap"
	"go.signoz.io/signoz/pkg/query-service/app/opamp/otelconfig/tailsampler"
)

func TestServiceConfig(t *testing.T) {
	yamlFile, err := ioutil.ReadFile("./testdata/service.yaml")
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
					"signozspanmetrics/prometheus", "batch",
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

func TestReplaceProcessor(t *testing.T) {

	runtest := func(file string) {
		log.Println("TestReplaceProcessor:", file)
		yamlFile, err := ioutil.ReadFile(file)
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

		tailparams := tailsampler.Config{
			DecisionWait:            2 * time.Second,
			NumTraces:               10000,
			PolicyCfgs:              []tailsampler.PolicyCfg(nil),
			Version:                 0,
			ExpectedNewTracesPerSec: 10000,
		}
		configParser.ReplaceProcessor("signoz_tail_sampling", tailparams)

		p, err := configParser.Processor("signoz_tail_sampling")
		require.NoError(t, err, "failed to get processor signoz_tail_sampling")

		returned := p.(tailsampler.Config)
		require.Equal(t, tailparams, returned, "expected same parameters for signoz_tail_sampling processor")

		b, err := configParser.Processor("batch")
		require.NoError(t, err, "expected no error fetching batch processor as it is not changed")
		require.NotEmpty(t, b, "expected non empty batch processor")
	}
	runtest("./testdata/processors.yaml")
	runtest("./testdata/tail_processor.yaml")
}
