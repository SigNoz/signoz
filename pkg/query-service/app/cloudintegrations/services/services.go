package services

import (
	"bytes"
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"path"

	"github.com/SigNoz/signoz/pkg/query-service/app/integrations"
	"github.com/SigNoz/signoz/pkg/types"
	koanfJson "github.com/knadh/koanf/parsers/json"
)

const (
	S3Sync = "s3sync"
)

type (
	AWSServicesProvider struct {
		definitions map[string]*AWSServiceDefinition
	}
	AzureServicesProvider struct {
		definitions map[string]*AzureServiceDefinition
	}
)

func (a *AzureServicesProvider) CloudProvider(ctx context.Context) (string, error) {
	return types.CloudProviderAzure, nil
}

func (a *AzureServicesProvider) ListServiceDefinitions(ctx context.Context) (map[string]*AzureServiceDefinition, error) {
	return a.definitions, nil
}

func (a *AzureServicesProvider) GetServiceDefinition(ctx context.Context, serviceName string) (*AzureServiceDefinition, error) {
	def, ok := a.definitions[serviceName]
	if !ok {
		return nil, fmt.Errorf("azure service definition not found: %s", serviceName)
	}

	return def, nil
}

func (a *AWSServicesProvider) CloudProvider(ctx context.Context) (string, error) {
	return types.CloudProviderAWS, nil
}

func (a *AWSServicesProvider) ListServiceDefinitions(ctx context.Context) (map[string]*AWSServiceDefinition, error) {
	return a.definitions, nil
}

func (a *AWSServicesProvider) GetServiceDefinition(ctx context.Context, serviceName string) (*AWSServiceDefinition, error) {
	def, ok := a.definitions[serviceName]
	if !ok {
		return nil, fmt.Errorf("aws service definition not found: %s", serviceName)
	}

	return def, nil
}

func NewAWSCloudProviderServices() (*AWSServicesProvider, error) {
	definitions, err := readAllServiceDefinitions(types.CloudProviderAWS)
	if err != nil {
		return nil, err
	}

	serviceDefinitions := make(map[string]*AWSServiceDefinition)
	for id, def := range definitions {
		typedDef, ok := def.(*AWSServiceDefinition)
		if !ok {
			return nil, fmt.Errorf("invalid type for AWS service definition %s", id)
		}
		serviceDefinitions[id] = typedDef
	}

	return &AWSServicesProvider{
		definitions: serviceDefinitions,
	}, nil
}

func NewAzureCloudProviderServices() (*AzureServicesProvider, error) {
	definitions, err := readAllServiceDefinitions(types.CloudProviderAzure)
	if err != nil {
		return nil, err
	}

	serviceDefinitions := make(map[string]*AzureServiceDefinition)
	for id, def := range definitions {
		typedDef, ok := def.(*AzureServiceDefinition)
		if !ok {
			return nil, fmt.Errorf("invalid type for Azure service definition %s", id)
		}
		serviceDefinitions[id] = typedDef
	}

	return &AzureServicesProvider{
		definitions: serviceDefinitions,
	}, nil
}

// End of API. Logic for reading service definition files follows

//go:embed definitions/*
var definitionFiles embed.FS

func readAllServiceDefinitions(cloudProvider string) (map[string]any, error) {
	if err := types.ValidateCloudProvider(cloudProvider); err != nil {
		return nil, err
	}

	rootDirName := "definitions"

	cloudProviderDirPath := path.Join(rootDirName, cloudProvider)

	cloudServices, err := readServiceDefinitionsFromDir(cloudProvider, cloudProviderDirPath)
	if err != nil {
		return nil, fmt.Errorf("couldn't read %s service definitions: %w", cloudProvider, err)
	}

	if len(cloudServices) < 1 {
		return nil, fmt.Errorf("no %s services could be read", cloudProvider)
	}

	return cloudServices, nil
}

func readServiceDefinitionsFromDir(cloudProvider, cloudProviderDirPath string) (map[string]any, error) {
	svcDefDirs, err := fs.ReadDir(definitionFiles, cloudProviderDirPath)
	if err != nil {
		return nil, fmt.Errorf("couldn't list integrations dirs: %w", err)
	}

	svcDefs := make(map[string]any)

	for _, d := range svcDefDirs {
		if !d.IsDir() {
			continue
		}

		svcDirPath := path.Join(cloudProviderDirPath, d.Name())
		s, err := readServiceDefinition(cloudProvider, svcDirPath)
		if err != nil {
			return nil, fmt.Errorf("couldn't read svc definition for %s: %w", d.Name(), err)
		}

		_, exists := svcDefs[s.GetId()]
		if exists {
			return nil, fmt.Errorf("duplicate service definition for id %s at %s", s.GetId(), d.Name())
		}
		svcDefs[s.GetId()] = s
	}

	return svcDefs, nil
}

func readServiceDefinition(cloudProvider string, svcDirpath string) (Definition, error) {
	integrationJsonPath := path.Join(svcDirpath, "integration.json")

	serializedSpec, err := definitionFiles.ReadFile(integrationJsonPath)
	if err != nil {
		return nil, fmt.Errorf("couldn't find integration.json in %s: %w", svcDirpath, err)
	}

	integrationSpec, err := koanfJson.Parser().Unmarshal(serializedSpec)
	if err != nil {
		return nil, fmt.Errorf("couldn't parse integration.json from %s: %w", integrationJsonPath, err)
	}

	hydrated, err := integrations.HydrateFileUris(integrationSpec, definitionFiles, svcDirpath)
	if err != nil {
		return nil, fmt.Errorf("couldn't hydrate files referenced in service definition %s: %w", integrationJsonPath, err)
	}
	hydratedSpec := hydrated.(map[string]any)

	var serviceDef Definition

	switch cloudProvider {
	case types.CloudProviderAWS:
		serviceDef = &AWSServiceDefinition{}
	case types.CloudProviderAzure:
		serviceDef = &AzureServiceDefinition{}
	default:
		return nil, fmt.Errorf("unsupported cloud provider: %s", cloudProvider)
	}

	err = ParseStructWithJsonTagsFromMap(hydratedSpec, serviceDef)
	if err != nil {
		return nil, fmt.Errorf("couldn't parse hydrated JSON spec read from %s: %w", integrationJsonPath, err)
	}
	err = serviceDef.Validate()
	if err != nil {
		return nil, fmt.Errorf("invalid service definition %s: %w", serviceDef.GetId(), err)
	}

	return serviceDef, nil
}

//func validateServiceDefinition(s any) error {
//	// Validate dashboard data
//	seenDashboardIds := map[string]interface{}{}
//
//	switch def := s.(type) {
//	case AWSServiceDefinition:
//
//	case AzureServiceDefinition:
//		for _, dd := range def.Assets.Dashboards {
//			if _, seen := seenDashboardIds[dd.Id]; seen {
//				return fmt.Errorf("multiple dashboards found with id %s", dd.Id)
//			}
//			seenDashboardIds[dd.Id] = nil
//		}
//
//		if def.Strategy == nil {
//			return fmt.Errorf("telemetry_collection_strategy is required")
//		}
//	default:
//		return fmt.Errorf("unsupported service definition type %T", s)
//	}
//
//	return nil
//}

func ParseStructWithJsonTagsFromMap(data map[string]any, target interface{}) error {
	mapJson, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("couldn't marshal map to json: %w", err)
	}

	decoder := json.NewDecoder(bytes.NewReader(mapJson))
	decoder.DisallowUnknownFields()
	err = decoder.Decode(target)
	if err != nil {
		return fmt.Errorf("couldn't unmarshal json back to struct: %w", err)
	}
	return nil
}
