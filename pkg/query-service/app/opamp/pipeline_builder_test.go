package opamp

import (
	"fmt"
	"testing"

	. "github.com/smartystreets/goconvey/convey"
)

var BuildProcessorTestData = []struct {
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
			"logstransform/pipeline_b": struct{}{},
		},
		outputConf: map[string]interface{}{
			"processors": map[string]interface{}{
				"logstransform/pipeline_b": struct{}{},
				"batch":                    struct{}{},
			},
		},
	},
	{
		Name: "Remove",
		agentConf: map[string]interface{}{
			"processors": map[string]interface{}{
				"logstransform/pipeline_b": struct{}{},
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
				"logstransform/pipeline_a": struct{}{},
				"logstransform/pipeline_b": struct{}{},
				"batch":                    struct{}{},
			},
		},
		pipelineProcessor: map[string]interface{}{
			"logstransform/pipeline_b": struct{}{},
		},
		outputConf: map[string]interface{}{
			"processors": map[string]interface{}{
				"logstransform/pipeline_b": struct{}{},
				"batch":                    struct{}{},
			},
		},
	},
	{
		Name: "remove and upsert 2",
		agentConf: map[string]interface{}{
			"processors": map[string]interface{}{
				"memory_limiter":           struct{}{},
				"logstransform/pipeline_a": struct{}{},
				"logstransform/pipeline_b": struct{}{},
				"batch":                    struct{}{},
			},
		},
		pipelineProcessor: map[string]interface{}{
			"logstransform/pipeline_b": struct{}{},
		},
		outputConf: map[string]interface{}{
			"processors": map[string]interface{}{
				"memory_limiter":           struct{}{},
				"logstransform/pipeline_b": struct{}{},
				"batch":                    struct{}{},
			},
		},
	},
}

func TestBuildLogParsingProcessors(t *testing.T) {
	for _, test := range BuildProcessorTestData {
		Convey(test.Name, t, func() {
			err := BuildLogParsingProcessors(test.agentConf, test.pipelineProcessor)
			So(err, ShouldBeNil)
			So(test.agentConf, ShouldResemble, test.outputConf)
		})
	}

}

var BuildLogsPipelineTestData = []struct {
	Name             string
	currentPipeline  []interface{}
	logsPipeline     []interface{}
	expectedPipeline []interface{}
}{
	{
		Name:             "Add new pipelines",
		currentPipeline:  []interface{}{"processor1", "processor2"},
		logsPipeline:     []interface{}{logParsePrefix + "_a", logParsePrefix + "_b"},
		expectedPipeline: []interface{}{logParsePrefix + "_a", logParsePrefix + "_b", "processor1", "processor2"},
	},
	{
		Name:             "Add new pipeline and respect custom processors",
		currentPipeline:  []interface{}{logParsePrefix + "_a", "processor1", logParsePrefix + "_b", "processor2"},
		logsPipeline:     []interface{}{logParsePrefix + "_a", logParsePrefix + "_b", logParsePrefix + "_c"},
		expectedPipeline: []interface{}{logParsePrefix + "_a", "processor1", logParsePrefix + "_b", logParsePrefix + "_c", "processor2"},
	},
	{
		Name:             "Add new pipeline and respect custom processors in the beginning and middle",
		currentPipeline:  []interface{}{"processor1", logParsePrefix + "_a", "processor2", logParsePrefix + "_b", "batch"},
		logsPipeline:     []interface{}{logParsePrefix + "_a", logParsePrefix + "_b", logParsePrefix + "_c"},
		expectedPipeline: []interface{}{"processor1", logParsePrefix + "_a", "processor2", logParsePrefix + "_b", logParsePrefix + "_c", "batch"},
	},
	{
		Name:             "Remove old pipeline add add new",
		currentPipeline:  []interface{}{logParsePrefix + "_a", logParsePrefix + "_b", "processor1", "processor2"},
		logsPipeline:     []interface{}{logParsePrefix + "_a"},
		expectedPipeline: []interface{}{logParsePrefix + "_a", "processor1", "processor2"},
	},
	{
		Name:             "Remove old pipeline from middle",
		currentPipeline:  []interface{}{"processor1", "processor2", logParsePrefix + "_a", "processor3", logParsePrefix + "_b", "batch"},
		logsPipeline:     []interface{}{logParsePrefix + "_a"},
		expectedPipeline: []interface{}{"processor1", "processor2", logParsePrefix + "_a", "processor3", "batch"},
	},
	{
		Name:             "Remove old pipeline from middle and add new pipeline",
		currentPipeline:  []interface{}{"processor1", "processor2", logParsePrefix + "_a", "processor3", logParsePrefix + "_b", "batch"},
		logsPipeline:     []interface{}{logParsePrefix + "_a", logParsePrefix + "_c"},
		expectedPipeline: []interface{}{"processor1", "processor2", logParsePrefix + "_a", logParsePrefix + "_c", "processor3", "batch"},
	},
	{
		Name:             "Remove multiple old pipelines from middle and add multiple new ones",
		currentPipeline:  []interface{}{"processor1", logParsePrefix + "_a", "processor2", logParsePrefix + "_b", "processor3", logParsePrefix + "_c", "processor4", logParsePrefix + "_d", "processor5", "batch"},
		logsPipeline:     []interface{}{logParsePrefix + "_a", logParsePrefix + "_a1", logParsePrefix + "_c", logParsePrefix + "_c1"},
		expectedPipeline: []interface{}{"processor1", logParsePrefix + "_a", logParsePrefix + "_a1", "processor2", "processor3", logParsePrefix + "_c", logParsePrefix + "_c1", "processor4", "processor5", "batch"},
	},
}

// the basic this is that the next new processor will be added next to the anchor
// if the user needs to manually as something between the new two processors then they can modify after this and it will be respected.

func TestBuildLogsPipeline(t *testing.T) {
	for _, test := range BuildLogsPipelineTestData {
		Convey(test.Name, t, func() {
			v, err := buildLogsPipeline(test.currentPipeline, test.logsPipeline)
			So(err, ShouldBeNil)
			fmt.Println(test.Name, "\n", test.currentPipeline, "\n", v, "\n", test.expectedPipeline)
			So(v, ShouldResemble, test.expectedPipeline)
		})
	}
}
