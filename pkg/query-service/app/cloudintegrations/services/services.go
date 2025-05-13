package services

import (
	"bytes"
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"path"
	"sort"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/query-service/app/integrations"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	koanfJson "github.com/knadh/koanf/parsers/json"
	"golang.org/x/exp/maps"
)

const (
	S3Sync = "s3sync"
)

var (
	CodeUnsupportedCloudProvider = errors.MustNewCode("unsupported_cloud_provider")
	CodeUnsupportedServiceType   = errors.MustNewCode("unsupported_service_type")
)

func List(cloudProvider string) ([]Definition, *model.ApiError) {
	cloudServices, found := supportedServices[cloudProvider]
	if !found || cloudServices == nil {
		return nil, model.NotFoundError(fmt.Errorf(
			"unsupported cloud provider: %s", cloudProvider,
		))
	}

	services := maps.Values(cloudServices)
	sort.Slice(services, func(i, j int) bool {
		return services[i].Id < services[j].Id
	})

	return services, nil
}

func Map(cloudProvider string) (map[string]Definition, error) {
	cloudServices, found := supportedServices[cloudProvider]
	if !found || cloudServices == nil {
		return nil, errors.Newf(errors.TypeNotFound, CodeUnsupportedCloudProvider, "unsupported cloud provider: %s", cloudProvider)
	}

	return cloudServices, nil
}

func GetServiceDefinition(cloudProvider, serviceType string) (*Definition, error) {
	cloudServices := supportedServices[cloudProvider]
	if cloudServices == nil {
		return nil, errors.Newf(errors.TypeNotFound, CodeUnsupportedCloudProvider, "unsupported cloud provider: %s", cloudProvider)
	}

	svc, exists := cloudServices[serviceType]
	if !exists {
		return nil, errors.Newf(errors.TypeNotFound, CodeUnsupportedServiceType, "%s service not found: %s", cloudProvider, serviceType)
	}

	return &svc, nil
}

// End of API. Logic for reading service definition files follows

// Service details read from ./serviceDefinitions
// { "providerName": { "service_id": {...}} }
var supportedServices map[string]map[string]Definition

func init() {
	err := readAllServiceDefinitions()
	if err != nil {
		panic(fmt.Errorf(
			"couldn't read cloud service definitions: %w", err,
		))
	}
}

//go:embed definitions/*
var definitionFiles embed.FS

func readAllServiceDefinitions() error {
	supportedServices = map[string]map[string]Definition{}

	rootDirName := "definitions"

	cloudProviderDirs, err := fs.ReadDir(definitionFiles, rootDirName)
	if err != nil {
		return fmt.Errorf("couldn't read dirs in %s: %w", rootDirName, err)
	}

	for _, d := range cloudProviderDirs {
		if !d.IsDir() {
			continue
		}

		cloudProvider := d.Name()

		cloudProviderDirPath := path.Join(rootDirName, cloudProvider)
		cloudServices, err := readServiceDefinitionsFromDir(cloudProvider, cloudProviderDirPath)
		if err != nil {
			return fmt.Errorf("couldn't read %s service definitions: %w", cloudProvider, err)
		}

		if len(cloudServices) < 1 {
			return fmt.Errorf("no %s services could be read", cloudProvider)
		}

		supportedServices[cloudProvider] = cloudServices
	}

	return nil
}

func readServiceDefinitionsFromDir(cloudProvider string, cloudProviderDirPath string) (
	map[string]Definition, error,
) {
	svcDefDirs, err := fs.ReadDir(definitionFiles, cloudProviderDirPath)
	if err != nil {
		return nil, fmt.Errorf("couldn't list integrations dirs: %w", err)
	}

	svcDefs := map[string]Definition{}

	for _, d := range svcDefDirs {
		if !d.IsDir() {
			continue
		}

		svcDirPath := path.Join(cloudProviderDirPath, d.Name())
		s, err := readServiceDefinition(cloudProvider, svcDirPath)
		if err != nil {
			return nil, fmt.Errorf("couldn't read svc definition for %s: %w", d.Name(), err)
		}

		_, exists := svcDefs[s.Id]
		if exists {
			return nil, fmt.Errorf(
				"duplicate service definition for id %s at %s", s.Id, d.Name(),
			)
		}
		svcDefs[s.Id] = *s
	}

	return svcDefs, nil
}

func readServiceDefinition(cloudProvider string, svcDirpath string) (*Definition, error) {
	integrationJsonPath := path.Join(svcDirpath, "integration.json")

	serializedSpec, err := definitionFiles.ReadFile(integrationJsonPath)
	if err != nil {
		return nil, fmt.Errorf(
			"couldn't find integration.json in %s: %w",
			svcDirpath, err,
		)
	}

	integrationSpec, err := koanfJson.Parser().Unmarshal(serializedSpec)
	if err != nil {
		return nil, fmt.Errorf(
			"couldn't parse integration.json from %s: %w",
			integrationJsonPath, err,
		)
	}

	hydrated, err := integrations.HydrateFileUris(
		integrationSpec, definitionFiles, svcDirpath,
	)
	if err != nil {
		return nil, fmt.Errorf(
			"couldn't hydrate files referenced in service definition %s: %w",
			integrationJsonPath, err,
		)
	}
	hydratedSpec := hydrated.(map[string]any)

	serviceDef, err := ParseStructWithJsonTagsFromMap[Definition](hydratedSpec)
	if err != nil {
		return nil, fmt.Errorf(
			"couldn't parse hydrated JSON spec read from %s: %w",
			integrationJsonPath, err,
		)
	}

	err = validateServiceDefinition(serviceDef)
	if err != nil {
		return nil, fmt.Errorf("invalid service definition %s: %w", serviceDef.Id, err)
	}

	serviceDef.Strategy.Provider = cloudProvider

	return serviceDef, nil

}

func validateServiceDefinition(s *Definition) error {
	// Validate dashboard data
	seenDashboardIds := map[string]interface{}{}
	for _, dd := range s.Assets.Dashboards {
		if _, seen := seenDashboardIds[dd.Id]; seen {
			return fmt.Errorf("multiple dashboards found with id %s", dd.Id)
		}
		seenDashboardIds[dd.Id] = nil
	}

	if s.Strategy == nil {
		return fmt.Errorf("telemetry_collection_strategy is required")
	}

	// potentially more to follow

	return nil
}

func ParseStructWithJsonTagsFromMap[StructType any](data map[string]any) (
	*StructType, error,
) {
	mapJson, err := json.Marshal(data)
	if err != nil {
		return nil, fmt.Errorf("couldn't marshal map to json: %w", err)
	}

	var res StructType
	decoder := json.NewDecoder(bytes.NewReader(mapJson))
	decoder.DisallowUnknownFields()
	err = decoder.Decode(&res)
	if err != nil {
		return nil, fmt.Errorf("couldn't unmarshal json back to struct: %w", err)
	}
	return &res, nil
}
