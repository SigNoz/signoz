package integrations

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"path"

	"go.signoz.io/signoz/pkg/query-service/model"
	"golang.org/x/exp/maps"
	"gopkg.in/yaml.v3"
)

type BuiltInIntegrations struct{}

var builtInIntegrations map[string]IntegrationDetails

func (bi *BuiltInIntegrations) list(ctx context.Context) (
	[]IntegrationDetails, *model.ApiError,
) {
	return maps.Values(builtInIntegrations), nil
}

func (bi *BuiltInIntegrations) get(
	ctx context.Context, integrationIds []string,
) (
	map[string]IntegrationDetails, *model.ApiError,
) {
	result := map[string]IntegrationDetails{}
	for _, iid := range integrationIds {
		i, exists := builtInIntegrations[iid]
		if exists {
			result[iid] = i
		}
	}
	return result, nil
}

//go:embed builtin_integrations/*
var integrationFiles embed.FS

func init() {
	err := readBuiltIns()
	if err != nil {
		panic(fmt.Errorf("couldn't read builtin integrations: %w", err))
	}
}

func readBuiltIns() error {
	// fs.WalkDir(integrationFiles, "builtin_integrations", func(path string, d fs.DirEntry, err error) error {
	// if err != nil {
	// log.Fatal(err)
	// }
	// fmt.Printf("\nDEBUG: %s\n", path)
	// return nil
	// })
	rootDirName := "builtin_integrations"
	builtinDirs, err := fs.ReadDir(integrationFiles, rootDirName)
	if err != nil {
		return fmt.Errorf("couldn't list integrations dirs: %w", err)
	}

	builtInIntegrations = map[string]IntegrationDetails{}
	for _, d := range builtinDirs {
		// fmt.Printf("\nDEBUG: %s isDir: %v\n", d.Name(), d.IsDir())
		ii, err := readBuiltInIntegration(path.Join(rootDirName, d.Name()))
		if err != nil {
			return fmt.Errorf("couldn't parse integration %s from files: %w", d.Name(), err)
		}
		builtInIntegrations[ii.Id] = *ii
	}
	return nil
}

func readBuiltInIntegration(dirpath string) (
	*IntegrationDetails, error,
) {
	integrationYamlPath := path.Join(dirpath, "integration.yaml")

	iy, err := integrationFiles.ReadFile(integrationYamlPath)
	if err != nil {
		return nil, fmt.Errorf(
			"couldn't find integration.yaml in %s: %w", dirpath, err,
		)
	}

	var integration IntegrationDetails
	err = yaml.Unmarshal(iy, &integration)
	if err != nil {
		return nil, fmt.Errorf(
			"couldn't parse integration yaml read from %s: %w",
			integrationYamlPath, err,
		)
	}

	return &integration, nil
}
