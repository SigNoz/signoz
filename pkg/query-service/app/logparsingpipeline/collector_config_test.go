package logparsingpipeline

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
			err := buildLogParsingProcessors(test.agentConf, test.pipelineProcessor)
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
			v, err := buildLogsProcessors(test.currentPipeline, test.logsPipeline)
			So(err, ShouldBeNil)
			fmt.Println(test.Name, "\n", test.currentPipeline, "\n", v, "\n", test.expectedPipeline)
			So(v, ShouldResemble, test.expectedPipeline)
		})
	}
}
