package opamp

import (
	"fmt"
	"testing"

	"github.com/knadh/koanf/parsers/yaml"
	"go.opentelemetry.io/collector/confmap"
)

func TestPrepareLbSpec(t *testing.T) {
	c, err := yaml.Parser().Unmarshal([]byte(`---
receivers:
  otlp:
    protocols:
      grpc: 
processors:
  batch:
    send_batch_size: 1000
    timeout: 10s
extensions:
  zpages: {}
exporters:
  logging:
    debug: 
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: []
      exporters: [logging]
`))

	if err != nil {
		fmt.Println("error loading yaml:", err)
		t.Fail()
		return
	}

	agentConf := confmap.NewFromStringMap(c)
	serviceConf, err := prepareLbAgentSpec(agentConf)
	if err != nil {
		fmt.Println("prepareLbSpec error:", err)
	}
	_ = agentConf.Merge(serviceConf)
	configR, err := yaml.Parser().Marshal(agentConf.ToStringMap())
	if err != nil {
		fmt.Println("failed to marshal agent conf", err)
	}
	fmt.Println("TestPrepareLbSpec merged config:", string(configR))
	if len(string(configR)) == 0 {
		t.Fail()
		return
	}

}

func TestPrepareNonLbSpec(t *testing.T) {
	c, err := yaml.Parser().Unmarshal([]byte(`---
receivers:
  otlp:
    protocols:
      grpc: 
processors:
  batch:
    send_batch_size: 1000
    timeout: 10s
extensions:
  zpages: {}
exporters:
  logging:
    debug: 
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: []
      exporters: [logging]
`))

	if err != nil {
		fmt.Println("error loading yaml:", err)
		t.Fail()
		return
	}

	agentConf := confmap.NewFromStringMap(c)
	serviceConf, err := prepareNonLbAgentSpec(agentConf)
	if err != nil {
		fmt.Println("prepareLbSpec error:", err)
	}
	_ = agentConf.Merge(serviceConf)
	configR, err := yaml.Parser().Marshal(agentConf.ToStringMap())
	if err != nil {
		fmt.Println("failed to marshal agent conf", err)
	}
	fmt.Println("TestPrepareNonLbSpec merged config:", string(configR))
	if len(string(configR)) == 0 {
		t.Fail()
		return
	}

}
