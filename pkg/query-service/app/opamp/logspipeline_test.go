package opamp

import (
	"fmt"
	"testing"

	. "github.com/smartystreets/goconvey/convey"
	"go.signoz.io/signoz/pkg/query-service/constants"
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
			constants.LogsPPLPfx + "_b": struct{}{},
		},
		outputConf: map[string]interface{}{
			"processors": map[string]interface{}{
				constants.LogsPPLPfx + "_b": struct{}{},
				"batch":                     struct{}{},
			},
		},
	},
	{
		Name: "Remove",
		agentConf: map[string]interface{}{
			"processors": map[string]interface{}{
				constants.LogsPPLPfx + "_b": struct{}{},
				"batch":                     struct{}{},
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
				constants.LogsPPLPfx + "_a": struct{}{},
				constants.LogsPPLPfx + "_b": struct{}{},
				"batch":                     struct{}{},
			},
		},
		pipelineProcessor: map[string]interface{}{
			constants.LogsPPLPfx + "_b": struct{}{},
		},
		outputConf: map[string]interface{}{
			"processors": map[string]interface{}{
				constants.LogsPPLPfx + "_b": struct{}{},
				"batch":                     struct{}{},
			},
		},
	},
	{
		Name: "remove and upsert 2",
		agentConf: map[string]interface{}{
			"processors": map[string]interface{}{
				"memory_limiter":            struct{}{},
				constants.LogsPPLPfx + "_a": struct{}{},
				constants.LogsPPLPfx + "_b": struct{}{},
				"batch":                     struct{}{},
			},
		},
		pipelineProcessor: map[string]interface{}{
			constants.LogsPPLPfx + "_b": struct{}{},
		},
		outputConf: map[string]interface{}{
			"processors": map[string]interface{}{
				"memory_limiter":            struct{}{},
				constants.LogsPPLPfx + "_b": struct{}{},
				"batch":                     struct{}{},
			},
		},
	},
}

func TestBuildLogParsingProcessors(t *testing.T) {
	for _, test := range buildProcessorTestData {
		Convey(test.Name, t, func() {
			err := buildLogParsingProcessors(test.agentConf, test.pipelineProcessor)
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
		logsPipeline:     []interface{}{constants.LogsPPLPfx + "_a", constants.LogsPPLPfx + "_b"},
		expectedPipeline: []interface{}{constants.LogsPPLPfx + "_a", constants.LogsPPLPfx + "_b", "processor1", "processor2"},
	},
	{
		Name:             "Add new pipeline and respect custom processors",
		currentPipeline:  []interface{}{constants.LogsPPLPfx + "_a", "processor1", constants.LogsPPLPfx + "_b", "processor2"},
		logsPipeline:     []interface{}{constants.LogsPPLPfx + "_a", constants.LogsPPLPfx + "_b", constants.LogsPPLPfx + "_c"},
		expectedPipeline: []interface{}{constants.LogsPPLPfx + "_a", "processor1", constants.LogsPPLPfx + "_b", constants.LogsPPLPfx + "_c", "processor2"},
	},
	{
		Name:             "Add new pipeline and respect custom processors in the beginning and middle",
		currentPipeline:  []interface{}{"processor1", constants.LogsPPLPfx + "_a", "processor2", constants.LogsPPLPfx + "_b", "batch"},
		logsPipeline:     []interface{}{constants.LogsPPLPfx + "_a", constants.LogsPPLPfx + "_b", constants.LogsPPLPfx + "_c"},
		expectedPipeline: []interface{}{"processor1", constants.LogsPPLPfx + "_a", "processor2", constants.LogsPPLPfx + "_b", constants.LogsPPLPfx + "_c", "batch"},
	},
	{
		Name:             "Remove old pipeline add add new",
		currentPipeline:  []interface{}{constants.LogsPPLPfx + "_a", constants.LogsPPLPfx + "_b", "processor1", "processor2"},
		logsPipeline:     []interface{}{constants.LogsPPLPfx + "_a"},
		expectedPipeline: []interface{}{constants.LogsPPLPfx + "_a", "processor1", "processor2"},
	},
	{
		Name:             "Remove old pipeline from middle",
		currentPipeline:  []interface{}{"processor1", "processor2", constants.LogsPPLPfx + "_a", "processor3", constants.LogsPPLPfx + "_b", "batch"},
		logsPipeline:     []interface{}{constants.LogsPPLPfx + "_a"},
		expectedPipeline: []interface{}{"processor1", "processor2", constants.LogsPPLPfx + "_a", "processor3", "batch"},
	},
	{
		Name:             "Remove old pipeline from middle and add new pipeline",
		currentPipeline:  []interface{}{"processor1", "processor2", constants.LogsPPLPfx + "_a", "processor3", constants.LogsPPLPfx + "_b", "batch"},
		logsPipeline:     []interface{}{constants.LogsPPLPfx + "_a", constants.LogsPPLPfx + "_c"},
		expectedPipeline: []interface{}{"processor1", "processor2", constants.LogsPPLPfx + "_a", constants.LogsPPLPfx + "_c", "processor3", "batch"},
	},
	{
		Name:             "Remove multiple old pipelines from middle and add multiple new ones",
		currentPipeline:  []interface{}{"processor1", constants.LogsPPLPfx + "_a", "processor2", constants.LogsPPLPfx + "_b", "processor3", constants.LogsPPLPfx + "_c", "processor4", constants.LogsPPLPfx + "_d", "processor5", "batch"},
		logsPipeline:     []interface{}{constants.LogsPPLPfx + "_a", constants.LogsPPLPfx + "_a1", constants.LogsPPLPfx + "_c", constants.LogsPPLPfx + "_c1"},
		expectedPipeline: []interface{}{"processor1", constants.LogsPPLPfx + "_a", constants.LogsPPLPfx + "_a1", "processor2", "processor3", constants.LogsPPLPfx + "_c", constants.LogsPPLPfx + "_c1", "processor4", "processor5", "batch"},
	},
}

func TestBuildLogsPipeline(t *testing.T) {
	for _, test := range BuildLogsPipelineTestData {
		Convey(test.Name, t, func() {
			v, err := buildLogsProcessors(test.currentPipeline, test.logsPipeline)
			So(err, ShouldBeNil)
			fmt.Println(test.Name, "\n", test.currentPipeline, "\n", v, "\n", test.expectedPipeline)
			So(v, ShouldResemble, test.expectedPipeline)
		})
	}
}
