package services

import (
	"bytes"
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"path"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/query-service/app/integrations"
	"github.com/SigNoz/signoz/pkg/types/integrationstypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	koanfJson "github.com/knadh/koanf/parsers/json"
)

var (
	CodeServiceDefinitionNotFound = errors.MustNewCode("service_definition_not_dound")
)

type (
	AWSServicesProvider struct {
		definitions map[string]*integrationstypes.AWSServiceDefinition
	}
)

func (a *AWSServicesProvider) ListServiceDefinitions(ctx context.Context) (map[string]*integrationstypes.AWSServiceDefinition, error) {
	return a.definitions, nil
}

func (a *AWSServicesProvider) GetServiceDefinition(ctx context.Context, serviceName string) (*integrationstypes.AWSServiceDefinition, error) {
	def, ok := a.definitions[serviceName]
	if !ok {
		return nil, errors.NewNotFoundf(CodeServiceDefinitionNotFound, "aws service definition not found: %s", serviceName)
	}

	return def, nil
}

func NewAWSCloudProviderServices() (*AWSServicesProvider, error) {
	definitions, err := readAllServiceDefinitions(integrationstypes.CloudProviderAWS)
	if err != nil {
		return nil, err
	}

	serviceDefinitions := make(map[string]*integrationstypes.AWSServiceDefinition)
	for id, def := range definitions {
		typedDef, ok := def.(*integrationstypes.AWSServiceDefinition)
		if !ok {
			return nil, fmt.Errorf("invalid type for AWS service definition %s", id)
		}
		serviceDefinitions[id] = typedDef
	}

	return &AWSServicesProvider{
		definitions: serviceDefinitions,
	}, nil
}

//go:embed definitions/*
var definitionFiles embed.FS

func readAllServiceDefinitions(cloudProvider valuer.String) (map[string]any, error) {
	rootDirName := "definitions"

	cloudProviderDirPath := path.Join(rootDirName, cloudProvider.String())

	cloudServices, err := readServiceDefinitionsFromDir(cloudProvider, cloudProviderDirPath)
	if err != nil {
		return nil, err
	}

	if len(cloudServices) < 1 {
		return nil, errors.NewInternalf(errors.CodeInternal, "no service definitions found in %s", cloudProviderDirPath)
	}

	return cloudServices, nil
}

func readServiceDefinitionsFromDir(cloudProvider valuer.String, cloudProviderDirPath string) (map[string]any, error) {
	svcDefDirs, err := fs.ReadDir(definitionFiles, cloudProviderDirPath)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't list integrations dirs")
	}

	svcDefs := make(map[string]any)

	for _, d := range svcDefDirs {
		if !d.IsDir() {
			continue
		}

		svcDirPath := path.Join(cloudProviderDirPath, d.Name())
		s, err := readServiceDefinition(cloudProvider, svcDirPath)
		if err != nil {
			return nil, err
		}

		_, exists := svcDefs[s.GetId()]
		if exists {
			return nil, errors.NewInternalf(errors.CodeInternal, "duplicate service definition for id %s at %s", s.GetId(), d.Name())
		}
		svcDefs[s.GetId()] = s
	}

	return svcDefs, nil
}

func readServiceDefinition(cloudProvider valuer.String, svcDirpath string) (integrationstypes.Definition, error) {
	integrationJsonPath := path.Join(svcDirpath, "integration.json")

	serializedSpec, err := definitionFiles.ReadFile(integrationJsonPath)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't read integration definition in %s", svcDirpath)
	}

	integrationSpec, err := koanfJson.Parser().Unmarshal(serializedSpec)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't parse integration definition in %s", svcDirpath)
	}

	hydrated, err := integrations.HydrateFileUris(integrationSpec, definitionFiles, svcDirpath)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't hydrate integration definition in %s", svcDirpath)
	}
	hydratedSpec := hydrated.(map[string]any)

	var serviceDef integrationstypes.Definition

	switch cloudProvider {
	case integrationstypes.CloudProviderAWS:
		serviceDef = &integrationstypes.AWSServiceDefinition{}
	default:
		// ideally this shouldn't happen hence throwing internal error
		return nil, errors.NewInternalf(errors.CodeInternal, "unsupported cloud provider: %s", cloudProvider)
	}

	err = parseStructWithJsonTagsFromMap(hydratedSpec, serviceDef)
	if err != nil {
		return nil, err
	}
	err = serviceDef.Validate()
	if err != nil {
		return nil, err
	}

	return serviceDef, nil
}

func parseStructWithJsonTagsFromMap(data map[string]any, target interface{}) error {
	mapJson, err := json.Marshal(data)
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "couldn't marshal service definition json data")
	}

	decoder := json.NewDecoder(bytes.NewReader(mapJson))
	decoder.DisallowUnknownFields()
	err = decoder.Decode(target)
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "couldn't unmarshal service definition json data")
	}
	return nil
}
