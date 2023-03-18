package opamp

import (
	"fmt"
	"io/ioutil"
	"log"
	"testing"

	"github.com/knadh/koanf/parsers/yaml"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/collector/confmap"
	"go.signoz.io/signoz/pkg/query-service/app/opamp/otelconfig"
)

func TestMakeLBExporterSpec(t *testing.T) {
	yamlFile, err := ioutil.ReadFile("./config.yaml")
	if err != nil {
		fmt.Printf("yamlFile.Get err   #%v ", err)
		t.Fail()
		return
	}

	c, err := yaml.Parser().Unmarshal([]byte(yamlFile))
	if err != nil {
		log.Println("failed to parse config file as yaml", err)
		t.Fail()
		return
	}

	agentConf := confmap.NewFromStringMap(c)

	defaultConfig, err := otelconfig.LoadConfigParserFromFile("./config.yaml")
	if err != nil {
		log.Println("default config is needed for settting up load balancer")
		t.Fail()
		return
	}

	makeLbExporterSpec(agentConf, defaultConfig)
	parser := otelconfig.NewConfigParser(agentConf)

	require.Equal(t, true, parser.CheckExporterInPipeline(LoadBalancerPipeline, LoadBalancerExporter))
	require.Equal(t, true, parser.CheckRecevierInPipeline(TracesDefaultPipeline, OTLPWorker))

	exporters := parser.Exporters()
	if _, ok := exporters[LoadBalancerExporter]; !ok {
		t.Fail()
	}

	receivers := parser.Receivers()
	if _, ok := receivers[OTLPWorker]; !ok {
		t.Fail()
	}
}
