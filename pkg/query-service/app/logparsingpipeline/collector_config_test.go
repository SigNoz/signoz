package logparsingpipeline

import (
	"context"
	"fmt"
	"testing"

	. "github.com/smartystreets/goconvey/convey"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"gopkg.in/yaml.v3"
)

var buildProcessorTestData = []struct {
	Name              string
	agentConf         map[string]interface{}
	pipelineProcessor map[string]interface{}
	outputConf        map[string]interface{}
}{
	{
		Name: "Add",
		agentConf: map[string]interface{}{
			"processors": map[string]interface{}{
				"batch": struct{}{},
			},
		},
		pipelineProcessor: map[string]interface{}{
			constants.LogsPPLPfx + "b": struct{}{},
		},
		outputConf: map[string]interface{}{
			"processors": map[string]interface{}{
				constants.LogsPPLPfx + "b": struct{}{},
				"batch":                    struct{}{},
			},
		},
	},
	{
		Name: "Remove",
		agentConf: map[string]interface{}{
			"processors": map[string]interface{}{
				constants.LogsPPLPfx + "b": struct{}{},
				"batch":                    struct{}{},
			},
		},
		pipelineProcessor: map[string]interface{}{},
		outputConf: map[string]interface{}{
			"processors": map[string]interface{}{
				"batch": struct{}{},
			},
		},
	},
	{
		Name: "remove and upsert 1",
		agentConf: map[string]interface{}{
			"processors": map[string]interface{}{
				constants.LogsPPLPfx + "a": struct{}{},
				constants.LogsPPLPfx + "b": struct{}{},
				"batch":                    struct{}{},
			},
		},
		pipelineProcessor: map[string]interface{}{
			constants.LogsPPLPfx + "b": struct{}{},
		},
		outputConf: map[string]interface{}{
			"processors": map[string]interface{}{
				constants.LogsPPLPfx + "b": struct{}{},
				"batch":                    struct{}{},
			},
		},
	},
	{
		Name: "remove and upsert 2",
		agentConf: map[string]interface{}{
			"processors": map[string]interface{}{
				"memorylimiter":            struct{}{},
				constants.LogsPPLPfx + "a": struct{}{},
				constants.LogsPPLPfx + "b": struct{}{},
				"batch":                    struct{}{},
			},
		},
		pipelineProcessor: map[string]interface{}{
			constants.LogsPPLPfx + "b": struct{}{},
		},
		outputConf: map[string]interface{}{
			"processors": map[string]interface{}{
				"memorylimiter":            struct{}{},
				constants.LogsPPLPfx + "b": struct{}{},
				"batch":                    struct{}{},
			},
		},
	},
}

func TestBuildLogParsingProcessors(t *testing.T) {
	for _, test := range buildProcessorTestData {
		Convey(test.Name, t, func() {
			err := updateProcessorConfigsInCollectorConf(test.agentConf, test.pipelineProcessor)
			So(err, ShouldBeNil)
			So(test.agentConf, ShouldResemble, test.outputConf)
		})
	}

}

var BuildLogsPipelineTestData = []struct {
	Name             string
	currentPipeline  []string
	logsPipeline     []string
	expectedPipeline []string
}{
	{
		Name:             "Add new pipelines",
		currentPipeline:  []string{"processor1", "processor2"},
		logsPipeline:     []string{constants.LogsPPLPfx + "a", constants.LogsPPLPfx + "b"},
		expectedPipeline: []string{constants.LogsPPLPfx + "a", constants.LogsPPLPfx + "b", "processor1", "processor2"},
	},
	{
		Name:             "Add new pipeline and respect custom processors",
		currentPipeline:  []string{constants.LogsPPLPfx + "a", "processor1", constants.LogsPPLPfx + "b", "processor2"},
		logsPipeline:     []string{constants.LogsPPLPfx + "a", constants.LogsPPLPfx + "b", constants.LogsPPLPfx + "c"},
		expectedPipeline: []string{constants.LogsPPLPfx + "a", "processor1", constants.LogsPPLPfx + "b", constants.LogsPPLPfx + "c", "processor2"},
	},
	{
		Name:             "Add new pipeline and respect custom processors",
		currentPipeline:  []string{constants.LogsPPLPfx + "a", "processor1", constants.LogsPPLPfx + "b", "processor2"},
		logsPipeline:     []string{constants.LogsPPLPfx + "a", constants.LogsPPLPfx + "b", constants.LogsPPLPfx + "c", constants.LogsPPLPfx + "d"},
		expectedPipeline: []string{constants.LogsPPLPfx + "a", "processor1", constants.LogsPPLPfx + "b", constants.LogsPPLPfx + "c", constants.LogsPPLPfx + "d", "processor2"},
	},
	{
		Name:             "Add new pipeline and respect custom processors in the beginning and middle",
		currentPipeline:  []string{"processor1", constants.LogsPPLPfx + "a", "processor2", constants.LogsPPLPfx + "b", "batch"},
		logsPipeline:     []string{constants.LogsPPLPfx + "a", constants.LogsPPLPfx + "b", constants.LogsPPLPfx + "c"},
		expectedPipeline: []string{"processor1", constants.LogsPPLPfx + "a", "processor2", constants.LogsPPLPfx + "b", constants.LogsPPLPfx + "c", "batch"},
	},
	{
		Name:             "Remove old pipeline add add new",
		currentPipeline:  []string{constants.LogsPPLPfx + "a", constants.LogsPPLPfx + "b", "processor1", "processor2"},
		logsPipeline:     []string{constants.LogsPPLPfx + "a"},
		expectedPipeline: []string{constants.LogsPPLPfx + "a", "processor1", "processor2"},
	},
	{
		Name:             "Remove old pipeline from middle",
		currentPipeline:  []string{"processor1", "processor2", constants.LogsPPLPfx + "a", "processor3", constants.LogsPPLPfx + "b", "batch"},
		logsPipeline:     []string{constants.LogsPPLPfx + "a"},
		expectedPipeline: []string{"processor1", "processor2", constants.LogsPPLPfx + "a", "processor3", "batch"},
	},
	{
		Name:             "Remove old pipeline from middle and add new pipeline",
		currentPipeline:  []string{"processor1", "processor2", constants.LogsPPLPfx + "a", "processor3", constants.LogsPPLPfx + "b", "batch"},
		logsPipeline:     []string{constants.LogsPPLPfx + "a", constants.LogsPPLPfx + "c"},
		expectedPipeline: []string{"processor1", "processor2", constants.LogsPPLPfx + "a", constants.LogsPPLPfx + "c", "processor3", "batch"},
	},
	{
		Name:             "Remove multiple old pipelines from middle and add multiple new ones",
		currentPipeline:  []string{"processor1", constants.LogsPPLPfx + "a", "processor2", constants.LogsPPLPfx + "b", "processor3", constants.LogsPPLPfx + "c", "processor4", constants.LogsPPLPfx + "d", "processor5", "batch"},
		logsPipeline:     []string{constants.LogsPPLPfx + "a", constants.LogsPPLPfx + "a1", constants.LogsPPLPfx + "c", constants.LogsPPLPfx + "c1"},
		expectedPipeline: []string{"processor1", constants.LogsPPLPfx + "a", constants.LogsPPLPfx + "a1", "processor2", "processor3", constants.LogsPPLPfx + "c", constants.LogsPPLPfx + "c1", "processor4", "processor5", "batch"},
	},

	// working
	{
		Name:             "rearrange pipelines",
		currentPipeline:  []string{"processor1", "processor2", constants.LogsPPLPfx + "_a", "processor3", constants.LogsPPLPfx + "_b", "batch"},
		logsPipeline:     []string{constants.LogsPPLPfx + "_b", constants.LogsPPLPfx + "_a"},
		expectedPipeline: []string{"processor1", "processor2", "processor3", constants.LogsPPLPfx + "_b", constants.LogsPPLPfx + "_a", "batch"},
	},
	{
		Name:             "rearrange pipelines with new processor",
		currentPipeline:  []string{"processor1", "processor2", constants.LogsPPLPfx + "_a", "processor3", constants.LogsPPLPfx + "_b", "batch"},
		logsPipeline:     []string{constants.LogsPPLPfx + "_b", constants.LogsPPLPfx + "_a", constants.LogsPPLPfx + "_c"},
		expectedPipeline: []string{"processor1", "processor2", "processor3", constants.LogsPPLPfx + "_b", constants.LogsPPLPfx + "_a", constants.LogsPPLPfx + "_c", "batch"},
		// expectedPipeline: []string{"processor1", "processor2", constants.LogsPPLPfx + "_b", "processor3", constants.LogsPPLPfx + "_a", constants.LogsPPLPfx + "_c", "batch"},
	},
	{
		Name:             "delete processor",
		currentPipeline:  []string{"processor1", "processor2", constants.LogsPPLPfx + "_a", "processor3", constants.LogsPPLPfx + "_b", "batch"},
		logsPipeline:     []string{},
		expectedPipeline: []string{"processor1", "processor2", "processor3", "batch"},
	},
	{
		Name:             "last to first",
		currentPipeline:  []string{"processor1", "processor2", constants.LogsPPLPfx + "_a", "processor3", "processor4", constants.LogsPPLPfx + "_b", "batch", constants.LogsPPLPfx + "_c"},
		logsPipeline:     []string{constants.LogsPPLPfx + "_c", constants.LogsPPLPfx + "_a", constants.LogsPPLPfx + "_b"},
		expectedPipeline: []string{"processor1", "processor2", "processor3", "processor4", "batch", constants.LogsPPLPfx + "_c", constants.LogsPPLPfx + "_a", constants.LogsPPLPfx + "_b"},
	},
	{
		Name:             "multiple rearrange pipelines",
		currentPipeline:  []string{"processor1", "processor2", constants.LogsPPLPfx + "_a", "processor3", constants.LogsPPLPfx + "_b", "batch", constants.LogsPPLPfx + "_c", "processor4", "processor5", constants.LogsPPLPfx + "_d", "processor6", "processor7"},
		logsPipeline:     []string{constants.LogsPPLPfx + "_b", constants.LogsPPLPfx + "_a", constants.LogsPPLPfx + "_d", constants.LogsPPLPfx + "_c", constants.LogsPPLPfx + "_e"},
		expectedPipeline: []string{"processor1", "processor2", "processor3", constants.LogsPPLPfx + "_b", constants.LogsPPLPfx + "_a", "batch", "processor4", "processor5", constants.LogsPPLPfx + "_d", constants.LogsPPLPfx + "_c", constants.LogsPPLPfx + "_e", "processor6", "processor7"},
	},
	{
		Name:             "multiple rearrange with new pipelines",
		currentPipeline:  []string{"processor1", "processor2", constants.LogsPPLPfx + "_a", "processor3", constants.LogsPPLPfx + "_b", "batch", constants.LogsPPLPfx + "_c", "processor4", "processor5", constants.LogsPPLPfx + "_d", "processor6", "processor7"},
		logsPipeline:     []string{constants.LogsPPLPfx + "_z", constants.LogsPPLPfx + "_b", constants.LogsPPLPfx + "_a", constants.LogsPPLPfx + "_d", constants.LogsPPLPfx + "_c", constants.LogsPPLPfx + "_e"},
		expectedPipeline: []string{constants.LogsPPLPfx + "_z", "processor1", "processor2", "processor3", constants.LogsPPLPfx + "_b", constants.LogsPPLPfx + "_a", "batch", "processor4", "processor5", constants.LogsPPLPfx + "_d", constants.LogsPPLPfx + "_c", constants.LogsPPLPfx + "_e", "processor6", "processor7"},
	},
}

func TestBuildLogsPipeline(t *testing.T) {
	for _, test := range BuildLogsPipelineTestData {
		Convey(test.Name, t, func() {
			v, err := buildCollectorPipelineProcessorsList(test.currentPipeline, test.logsPipeline)
			So(err, ShouldBeNil)
			fmt.Println(test.Name, "\n", test.currentPipeline, "\n", v, "\n", test.expectedPipeline)
			So(v, ShouldResemble, test.expectedPipeline)
		})
	}
}

func TestPipelineAliasCollisionsDontResultInDuplicateCollectorProcessors(t *testing.T) {
	require := require.New(t)

	baseConf := []byte(`
        receivers:
          memory:
            id: in-memory-receiver
        exporters:
          memory:
            id: in-memory-exporter
        service:
          pipelines:
            logs:
              receivers:
                - memory
              processors: []
              exporters:
                - memory
      `)

	makeTestPipeline := func(name string, alias string) Pipeline {
		return Pipeline{
			OrderId: 1,
			Name:    name,
			Alias:   alias,
			Enabled: true,
			Filter: &v3.FilterSet{
				Operator: "AND",
				Items: []v3.FilterItem{
					{
						Key: v3.AttributeKey{
							Key:      "method",
							DataType: v3.AttributeKeyDataTypeString,
							Type:     v3.AttributeKeyTypeTag,
						},
						Operator: "=",
						Value:    "GET",
					},
				},
			},
			Config: []PipelineOperator{
				{
					ID:        "regex",
					Type:      "regex_parser",
					Enabled:   true,
					Name:      "regex parser",
					ParseFrom: "attributes.test_regex_target",
					ParseTo:   "attributes",
					Regex:     `^\s*(?P<json_data>{.*})\s*$`,
				},
			},
		}
	}

	testPipelines := []Pipeline{
		makeTestPipeline("test pipeline 1", "pipeline-alias"),
		makeTestPipeline("test pipeline 2", "pipeline-alias"),
	}

	recommendedConfYaml, apiErr := GenerateCollectorConfigWithPipelines(
		baseConf, testPipelines,
	)
	require.Nil(apiErr, fmt.Sprintf("couldn't generate config recommendation: %v", apiErr))

	var recommendedConf map[string]interface{}
	err := yaml.Unmarshal(recommendedConfYaml, &recommendedConf)
	require.Nil(err, "couldn't unmarshal recommended config")

	logsProcessors := recommendedConf["service"].(map[string]any)["pipelines"].(map[string]any)["logs"].(map[string]any)["processors"].([]any)

	require.Equal(
		len(logsProcessors), len(testPipelines),
		"test pipelines not included in recommended config as expected",
	)

	recommendedConfYaml2, apiErr := GenerateCollectorConfigWithPipelines(
		baseConf, testPipelines,
	)
	require.Nil(apiErr, fmt.Sprintf("couldn't generate config recommendation again: %v", apiErr))
	require.Equal(
		string(recommendedConfYaml), string(recommendedConfYaml2),
		"collector config should not change across recommendations for same set of pipelines",
	)

}

func TestPipelineRouterWorksEvenIfFirstOpIsDisabled(t *testing.T) {
	require := require.New(t)

	testPipelines := []Pipeline{
		{
			OrderId: 1,
			Name:    "pipeline1",
			Alias:   "pipeline1",
			Enabled: true,
			Filter: &v3.FilterSet{
				Operator: "AND",
				Items: []v3.FilterItem{
					{
						Key: v3.AttributeKey{
							Key:      "method",
							DataType: v3.AttributeKeyDataTypeString,
							Type:     v3.AttributeKeyTypeTag,
						},
						Operator: "=",
						Value:    "GET",
					},
				},
			},
			Config: []PipelineOperator{
				{
					OrderId: 1,
					ID:      "add",
					Type:    "add",
					Field:   "attributes.test",
					Value:   "val",
					Enabled: false,
					Name:    "test add",
				},
				{
					OrderId: 2,
					ID:      "add2",
					Type:    "add",
					Field:   "attributes.test2",
					Value:   "val2",
					Enabled: true,
					Name:    "test add 2",
				},
			},
		},
	}

	result, collectorWarnAndErrorLogs, err := SimulatePipelinesProcessing(
		context.Background(),
		testPipelines,
		[]model.SignozLog{
			makeTestSignozLog(
				"test log body",
				map[string]any{
					"method": "GET",
				},
			),
		},
	)

	require.Nil(err)
	require.Equal(0, len(collectorWarnAndErrorLogs))
	require.Equal(1, len(result))

	require.Equal(
		map[string]string{
			"method": "GET",
			"test2":  "val2",
		}, result[0].Attributes_string,
	)
}

func TestPipeCharInAliasDoesntBreakCollectorConfig(t *testing.T) {
	require := require.New(t)

	testPipelines := []Pipeline{
		{
			OrderId: 1,
			Name:    "test | pipeline",
			Alias:   "test|pipeline",
			Enabled: true,
			Filter: &v3.FilterSet{
				Operator: "AND",
				Items: []v3.FilterItem{
					{
						Key: v3.AttributeKey{
							Key:      "method",
							DataType: v3.AttributeKeyDataTypeString,
							Type:     v3.AttributeKeyTypeTag,
						},
						Operator: "=",
						Value:    "GET",
					},
				},
			},
			Config: []PipelineOperator{
				{
					OrderId: 1,
					ID:      "add",
					Type:    "add",
					Field:   "attributes.test",
					Value:   "val",
					Enabled: true,
					Name:    "test add",
				},
			},
		},
	}

	result, collectorWarnAndErrorLogs, err := SimulatePipelinesProcessing(
		context.Background(),
		testPipelines,
		[]model.SignozLog{
			makeTestSignozLog(
				"test log body",
				map[string]any{
					"method": "GET",
				},
			),
		},
	)

	require.Nil(err)
	require.Equal(0, len(collectorWarnAndErrorLogs))
	require.Equal(1, len(result))

	require.Equal(
		map[string]string{
			"method": "GET",
			"test":   "val",
		}, result[0].Attributes_string,
	)
}
