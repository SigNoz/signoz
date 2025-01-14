package cloudintegrations

import (
	"bytes"
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"path"
	"sort"

	koanfJson "github.com/knadh/koanf/parsers/json"
	"go.signoz.io/signoz/pkg/query-service/app/integrations"
	"go.signoz.io/signoz/pkg/query-service/model"
	"golang.org/x/exp/maps"
)

func listCloudProviderServices(
	cloudProvider string,
) ([]CloudServiceDetails, *model.ApiError) {
	cloudServices := availableServices[cloudProvider]
	if cloudServices == nil {
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

func getCloudProviderService(
	cloudProvider string, serviceId string,
) (*CloudServiceDetails, *model.ApiError) {
	cloudServices := availableServices[cloudProvider]
	if cloudServices == nil {
		return nil, model.NotFoundError(fmt.Errorf(
			"unsupported cloud provider: %s", cloudProvider,
		))
	}

	svc, exists := cloudServices[serviceId]
	if !exists {
		return nil, model.NotFoundError(fmt.Errorf(
			"%s service not found: %s", cloudProvider, serviceId,
		))
	}

	return &svc, nil
}

// End of API. Logic for reading service definition files follows

// Service details read from ./serviceDefinitions
// { "providerName": { "service_id": {...}} }
var availableServices map[string]map[string]CloudServiceDetails

func init() {
	err := readAllServiceDefinitions()
	if err != nil {
		panic(fmt.Errorf(
			"couldn't read cloud service definitions: %w", err,
		))
	}
}

//go:embed serviceDefinitions/*
var serviceDefinitionFiles embed.FS

func readAllServiceDefinitions() error {
	availableServices = map[string]map[string]CloudServiceDetails{}

	rootDirName := "serviceDefinitions"

	cloudProviderDirs, err := fs.ReadDir(serviceDefinitionFiles, rootDirName)
	if err != nil {
		return fmt.Errorf("couldn't read dirs in %s: %w", rootDirName, err)
	}

	for _, d := range cloudProviderDirs {
		if !d.IsDir() {
			continue
		}

		cloudProviderDirPath := path.Join(rootDirName, d.Name())
		cloudServices, err := readServiceDefinitionsFromDir(cloudProviderDirPath)
		if err != nil {
			return fmt.Errorf("couldn't read %s service definitions", d.Name())
		}

		if len(cloudServices) < 1 {
			return fmt.Errorf("no %s services could be read", d.Name())
		}

		availableServices[d.Name()] = cloudServices
	}

	return nil
}

func readServiceDefinitionsFromDir(cloudProviderDirPath string) (
	map[string]CloudServiceDetails, error,
) {
	svcDefDirs, err := fs.ReadDir(serviceDefinitionFiles, cloudProviderDirPath)
	if err != nil {
		return nil, fmt.Errorf("couldn't list integrations dirs: %w", err)
	}

	svcDefs := map[string]CloudServiceDetails{}

	for _, d := range svcDefDirs {
		if !d.IsDir() {
			continue
		}

		svcDirPath := path.Join(cloudProviderDirPath, d.Name())
		s, err := readServiceDefinition(svcDirPath)
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

func readServiceDefinition(dirpath string) (*CloudServiceDetails, error) {
	integrationJsonPath := path.Join(dirpath, "integration.json")

	serializedSpec, err := serviceDefinitionFiles.ReadFile(integrationJsonPath)
	if err != nil {
		return nil, fmt.Errorf(
			"couldn't find integration.json in %s: %w",
			dirpath, err,
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
		integrationSpec, serviceDefinitionFiles, dirpath,
	)
	if err != nil {
		return nil, fmt.Errorf(
			"couldn't hydrate files referenced in service definition %s: %w",
			integrationJsonPath, err,
		)
	}

	hydratedSpec := hydrated.(map[string]interface{})
	hydratedSpecJson, err := koanfJson.Parser().Marshal(hydratedSpec)
	if err != nil {
		return nil, fmt.Errorf(
			"couldn't serialize hydrated integration spec back to JSON %s: %w",
			integrationJsonPath, err,
		)
	}

	var serviceDef CloudServiceDetails
	decoder := json.NewDecoder(bytes.NewReader(hydratedSpecJson))
	decoder.DisallowUnknownFields()
	err = decoder.Decode(&serviceDef)
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

	return &serviceDef, nil

}

func validateServiceDefinition(s CloudServiceDetails) error {
	// Validate dashboard data
	seenDashboardIds := map[string]interface{}{}
	for _, dd := range s.Assets.Dashboards {
		did, exists := dd["id"]
		if !exists {
			return fmt.Errorf("id is required. not specified in dashboard titled %v", dd["title"])
		}
		dashboardId, ok := did.(string)
		if !ok {
			return fmt.Errorf("id must be string in dashboard titled %v", dd["title"])
		}
		if _, seen := seenDashboardIds[dashboardId]; seen {
			return fmt.Errorf("multiple dashboards found with id %s", dashboardId)
		}
		seenDashboardIds[dashboardId] = nil
	}

	// potentially more to follow

	return nil
}
