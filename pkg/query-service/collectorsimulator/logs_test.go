package collectorsimulator

import (
	"context"
	"testing"
	"time"

	"github.com/knadh/koanf/parsers/yaml"
	"github.com/open-telemetry/opentelemetry-collector-contrib/processor/logstransformprocessor"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/collector/pdata/plog"
	"go.opentelemetry.io/collector/processor"
)

type ProcessorConfig struct {
	Name   string
	Config map[string]interface{}
}

func TestLogsProcessingSimulation(t *testing.T) {
	require := require.New(t)

	inputLogs := []plog.Logs{
		makeTestPlog("test log 1", map[string]string{
			"method": "GET",
		}),
		makeTestPlog("test log 2", map[string]string{
			"method": "POST",
		}),
	}

	testLogstransformConf1, err := yaml.Parser().Unmarshal([]byte(`
    operators:
        - type: router
          id: router_signoz
          routes:
            - output: add
              expr: attributes.method == "GET"
          default: noop
        - type: add
          id: add
          field: attributes.test
          value: test-value-get
        - type: noop
          id: noop
    `))
	require.Nil(err, "could not unmarshal test logstransform op config")
	testProcessor1 := ProcessorConfig{
		Name:   "logstransform/test",
		Config: testLogstransformConf1,
	}

	testLogstransformConf2, err := yaml.Parser().Unmarshal([]byte(`
    operators:
        - type: router
          id: router_signoz
          routes:
            - output: add
              expr: attributes.method == "POST"
          default: noop
        - type: add
          id: add
          field: attributes.test
          value: test-value-post
        - type: noop
          id: noop
    `))
	require.Nil(err, "could not unmarshal test logstransform op config")
	testProcessor2 := ProcessorConfig{
		Name:   "logstransform/test2",
		Config: testLogstransformConf2,
	}

	processorFactories, err := processor.MakeFactoryMap(
		logstransformprocessor.NewFactory(),
	)
	require.Nil(err, "could not create processors factory map")

	configGenerator := makeTestConfigGenerator(
		[]ProcessorConfig{testProcessor1, testProcessor2},
	)
	outputLogs, collectorErrs, apiErr := SimulateLogsProcessing(
		context.Background(),
		processorFactories,
		configGenerator,
		inputLogs,
		300*time.Millisecond,
	)
	require.Nil(apiErr, apiErr.ToError().Error())
	require.Equal(len(collectorErrs), 0)

	for _, l := range outputLogs {
		rl := l.ResourceLogs().At(0)
		sl := rl.ScopeLogs().At(0)
		record := sl.LogRecords().At(0)
		method, exists := record.Attributes().Get("method")
		require.True(exists)
		testVal, exists := record.Attributes().Get("test")
		require.True(exists)
		if method.Str() == "GET" {
			require.Equal(testVal.Str(), "test-value-get")
		} else {
			require.Equal(testVal.Str(), "test-value-post")
		}
	}
}

func makeTestPlog(body string, attrsStr map[string]string) plog.Logs {
	pl := plog.NewLogs()
	rl := pl.ResourceLogs().AppendEmpty()

	scopeLog := rl.ScopeLogs().AppendEmpty()
	slRecord := scopeLog.LogRecords().AppendEmpty()
	slRecord.Body().SetStr(body)
	slAttribs := slRecord.Attributes()
	for k, v := range attrsStr {
		slAttribs.PutStr(k, v)
	}

	return pl
}

func makeTestConfigGenerator(
	processorConfigs []ProcessorConfig,
) ConfigGenerator {
	return func(baseConf []byte) ([]byte, error) {
		conf, err := yaml.Parser().Unmarshal([]byte(baseConf))
		if err != nil {
			return nil, err
		}

		processors := map[string]interface{}{}
		if conf["processors"] != nil {
			processors = conf["processors"].(map[string]interface{})
		}
		logsProcessors := []string{}
		svc := conf["service"].(map[string]interface{})
		svcPipelines := svc["pipelines"].(map[string]interface{})
		svcLogsPipeline := svcPipelines["logs"].(map[string]interface{})
		if svcLogsPipeline["processors"] != nil {
			logsProcessors = svcLogsPipeline["processors"].([]string)
		}

		for _, processorConf := range processorConfigs {
			processors[processorConf.Name] = processorConf.Config
			logsProcessors = append(logsProcessors, processorConf.Name)
		}

		conf["processors"] = processors
		svcLogsPipeline["processors"] = logsProcessors

		confYaml, err := yaml.Parser().Marshal(conf)
		if err != nil {
			return nil, err
		}

		return confYaml, nil
	}
}
