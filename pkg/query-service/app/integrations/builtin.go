package integrations

import (
	"context"
	"embed"
	"strings"

	"encoding/base64"
	"encoding/json"
	"fmt"
	"io/fs"
	"path"

	koanfJson "github.com/knadh/koanf/parsers/json"
	"go.signoz.io/signoz/pkg/query-service/model"
	"golang.org/x/exp/maps"
	"golang.org/x/exp/slices"
)

type BuiltInIntegrations struct{}

var builtInIntegrations map[string]IntegrationDetails

func (bi *BuiltInIntegrations) list(ctx context.Context) (
	[]IntegrationDetails, *model.ApiError,
) {
	integrations := maps.Values(builtInIntegrations)
	slices.SortFunc(integrations, func(i1, i2 IntegrationDetails) bool {
		return i1.Id < i2.Id
	})
	return integrations, nil
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
	rootDirName := "builtin_integrations"
	builtinDirs, err := fs.ReadDir(integrationFiles, rootDirName)
	if err != nil {
		return fmt.Errorf("couldn't list integrations dirs: %w", err)
	}

	builtInIntegrations = map[string]IntegrationDetails{}
	for _, d := range builtinDirs {
		if !d.IsDir() {
			continue
		}

		integrationDir := path.Join(rootDirName, d.Name())
		i, err := readBuiltInIntegration(integrationDir)
		if err != nil {
			return fmt.Errorf("couldn't parse integration %s from files: %w", d.Name(), err)
		}

		_, exists := builtInIntegrations[i.Id]
		if exists {
			return fmt.Errorf(
				"duplicate integration for id %s at %s", i.Id, d.Name(),
			)
		}
		builtInIntegrations[i.Id] = *i
	}
	return nil
}

func readBuiltInIntegration(dirpath string) (
	*IntegrationDetails, error,
) {
	integrationJsonPath := path.Join(dirpath, "integration.json")

	serializedSpec, err := integrationFiles.ReadFile(integrationJsonPath)
	if err != nil {
		return nil, fmt.Errorf("couldn't find integration.json in %s: %w", dirpath, err)
	}

	integrationSpec, err := koanfJson.Parser().Unmarshal(serializedSpec)
	if err != nil {
		return nil, fmt.Errorf(
			"couldn't parse integration json from %s: %w", integrationJsonPath, err,
		)
	}

	hydrated, err := hydrateFileUris(integrationSpec, dirpath)
	if err != nil {
		return nil, fmt.Errorf(
			"couldn't hydrate files referenced in integration %s: %w", integrationJsonPath, err,
		)
	}

	hydratedSpec := hydrated.(map[string]interface{})
	hydratedSpecJson, err := koanfJson.Parser().Marshal(hydratedSpec)
	if err != nil {
		return nil, fmt.Errorf(
			"couldn't serialize hydrated integration spec back to JSON %s: %w", integrationJsonPath, err,
		)
	}

	var integration IntegrationDetails
	err = json.Unmarshal(hydratedSpecJson, &integration)
	if err != nil {
		return nil, fmt.Errorf(
			"couldn't parse hydrated JSON spec read from %s: %w",
			integrationJsonPath, err,
		)
	}

	integration.Id = "builtin::" + integration.Id

	return &integration, nil
}

func hydrateFileUris(spec interface{}, basedir string) (interface{}, error) {
	if specMap, ok := spec.(map[string]interface{}); ok {
		result := map[string]interface{}{}
		for k, v := range specMap {
			hydrated, err := hydrateFileUris(v, basedir)
			if err != nil {
				return nil, err
			}
			result[k] = hydrated
		}
		return result, nil

	} else if specSlice, ok := spec.([]interface{}); ok {
		result := []interface{}{}
		for _, v := range specSlice {
			hydrated, err := hydrateFileUris(v, basedir)
			if err != nil {
				return nil, err
			}
			result = append(result, hydrated)
		}
		return result, nil

	} else if maybeFileUri, ok := spec.(string); ok {
		return readFileIfUri(maybeFileUri, basedir)
	}

	return spec, nil

}

func readFileIfUri(maybeFileUri string, basedir string) (interface{}, error) {
	fileUriPrefix := "file://"
	if !strings.HasPrefix(maybeFileUri, fileUriPrefix) {
		return maybeFileUri, nil
	}

	relativePath := maybeFileUri[len(fileUriPrefix):]
	fullPath := path.Join(basedir, relativePath)

	fileContents, err := integrationFiles.ReadFile(fullPath)
	if err != nil {
		return nil, fmt.Errorf("couldn't read referenced file: %w", err)
	}
	if strings.HasSuffix(maybeFileUri, ".md") {
		return fileContents, nil

	} else if strings.HasSuffix(maybeFileUri, ".json") {
		parsed, err := koanfJson.Parser().Unmarshal(fileContents)
		if err != nil {
			return nil, fmt.Errorf("couldn't parse referenced JSON file: %w", err)
		}
		return parsed, nil

	} else if strings.HasSuffix(maybeFileUri, ".svg") {
		base64Svg := base64.StdEncoding.EncodeToString(fileContents)
		dataUri := fmt.Sprintf("data:image/svg+xml;base64,%s", base64Svg)
		return dataUri, nil

	}

	return nil, fmt.Errorf("unsupported file type %s", maybeFileUri)
}
