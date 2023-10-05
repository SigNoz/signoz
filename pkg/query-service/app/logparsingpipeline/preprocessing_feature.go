package logparsingpipeline

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/knadh/koanf/parsers/yaml"
	"github.com/pkg/errors"
	"go.signoz.io/signoz/pkg/query-service/agentConf"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.uber.org/multierr"
)

// logparsing pipelines are a specific signal pre-processing feature
// implemented on top of agentConf

const LogPipelinesFeatureType agentConf.PreprocessingFeatureType = "log_pipelines"

func CollectorConfigGenerator(
	db *sqlx.DB,
	baseConfYaml []byte,
	configVersion *agentConf.ConfigVersion,
) (recommendedConfYaml []byte, apiErr *model.ApiError) {
	pipelinesRepo := NewRepo(db)

	pipelines, errs := pipelinesRepo.getPipelinesByVersion(
		context.Background(), configVersion.Version,
	)
	if len(errs) > 0 {
		return nil, model.InternalError(multierr.Combine(errs...))
	}

	processors, procNames, err := PreparePipelineProcessor(pipelines)
	if err != nil {
		return nil, model.BadRequest(errors.Wrap(err, "could not prepare otel collector processors for log pipelines"))
	}

	c, err := yaml.Parser().Unmarshal([]byte(baseConfYaml))
	if err != nil {
		return nil, model.BadRequest(err)
	}

	buildLogParsingProcessors(c, processors)

	p, err := getOtelPipelinFromConfig(c)
	if err != nil {
		return nil, model.BadRequest(errors.Wrap(err, "could not find svc pipeline for logs"))
	}
	if p.Pipelines.Logs == nil {
		return nil, model.InternalError(fmt.Errorf("logs pipeline doesn't exist"))
	}

	// build the new processor list
	updatedProcessorList, _ := buildLogsProcessors(p.Pipelines.Logs.Processors, procNames)
	p.Pipelines.Logs.Processors = updatedProcessorList

	// add the new processor to the data ( no checks required as the keys will exists)
	c["service"].(map[string]interface{})["pipelines"].(map[string]interface{})["logs"] = p.Pipelines.Logs

	updatedConf, err := yaml.Parser().Marshal(c)
	if err != nil {
		return nil, model.BadRequest(errors.Wrap(err, "could not marshal yaml for updated conf"))
	}

	return updatedConf, nil
}

func init() {
	agentConf.RegisterSignalPreprocessingFeature(
		LogPipelinesFeatureType, CollectorConfigGenerator,
	)
}
