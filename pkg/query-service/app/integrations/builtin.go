package integrations

import (
	"bytes"
	"context"
	"embed"
	"strings"
	"unicode"

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
	slices.SortFunc(integrations, func(i1, i2 IntegrationDetails) int {
		return strings.Compare(i1.Id, i2.Id)
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

	hydrated, err := HydrateFileUris(integrationSpec, integrationFiles, dirpath)
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
	decoder := json.NewDecoder(bytes.NewReader(hydratedSpecJson))
	decoder.DisallowUnknownFields()
	err = decoder.Decode(&integration)
	if err != nil {
		return nil, fmt.Errorf(
			"couldn't parse hydrated JSON spec read from %s: %w",
			integrationJsonPath, err,
		)
	}

	err = validateIntegration(integration)
	if err != nil {
		return nil, fmt.Errorf("invalid integration spec %s: %w", integration.Id, err)
	}

	integration.Id = "builtin-" + integration.Id
	if len(integration.DataCollected.Metrics) > 0 {
		metricsForConnTest := []string{}
		for _, collectedMetric := range integration.DataCollected.Metrics {
			promName := toPromMetricName(collectedMetric.Name)
			metricsForConnTest = append(metricsForConnTest, promName)
		}
		integration.ConnectionTests.Metrics = metricsForConnTest
	}

	return &integration, nil
}

func validateIntegration(i IntegrationDetails) error {
	// Validate dashboard data
	seenDashboardIds := map[string]interface{}{}
	for _, dd := range i.Assets.Dashboards {
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

	// TODO(Raj): Validate all parts of plugged in integrations

	return nil
}

func HydrateFileUris(spec interface{}, fs embed.FS, basedir string) (interface{}, error) {
	if specMap, ok := spec.(map[string]interface{}); ok {
		result := map[string]interface{}{}
		for k, v := range specMap {
			hydrated, err := HydrateFileUris(v, fs, basedir)
			if err != nil {
				return nil, err
			}
			result[k] = hydrated
		}
		return result, nil

	} else if specSlice, ok := spec.([]interface{}); ok {
		result := []interface{}{}
		for _, v := range specSlice {
			hydrated, err := HydrateFileUris(v, fs, basedir)
			if err != nil {
				return nil, err
			}
			result = append(result, hydrated)
		}
		return result, nil

	} else if maybeFileUri, ok := spec.(string); ok {
		return readFileIfUri(fs, maybeFileUri, basedir)
	}

	return spec, nil

}

func readFileIfUri(fs embed.FS, maybeFileUri string, basedir string) (interface{}, error) {
	fileUriPrefix := "file://"
	if !strings.HasPrefix(maybeFileUri, fileUriPrefix) {
		return maybeFileUri, nil
	}

	relativePath := maybeFileUri[len(fileUriPrefix):]
	fullPath := path.Join(basedir, relativePath)

	fileContents, err := fs.ReadFile(fullPath)
	if err != nil {
		return nil, fmt.Errorf("couldn't read referenced file: %w", err)
	}
	if strings.HasSuffix(maybeFileUri, ".md") {
		return string(fileContents), nil

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

	} else if strings.HasSuffix(maybeFileUri, ".jpeg") || strings.HasSuffix(maybeFileUri, ".jpg") {
		base64Contents := base64.StdEncoding.EncodeToString(fileContents)
		dataUri := fmt.Sprintf("data:image/jpeg;base64,%s", base64Contents)
		return dataUri, nil

	} else if strings.HasSuffix(maybeFileUri, ".png") {
		base64Contents := base64.StdEncoding.EncodeToString(fileContents)
		dataUri := fmt.Sprintf("data:image/png;base64,%s", base64Contents)
		return dataUri, nil

	}

	return nil, fmt.Errorf("unsupported file type %s", maybeFileUri)
}

// copied from signoz clickhouse exporter's `sanitize` which
// in turn is copied from prometheus-go-metric-exporter
//
// replaces non-alphanumeric characters with underscores in s.
func toPromMetricName(s string) string {
	if len(s) == 0 {
		return s
	}

	// Note: No length limit for label keys because Prometheus doesn't
	// define a length limit, thus we should NOT be truncating label keys.
	// See https://github.com/orijtech/prometheus-go-metrics-exporter/issues/4.

	s = strings.Map(func(r rune) rune {
		// sanitizeRune converts anything that is not a letter or digit to an underscore
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			return r
		}
		// Everything else turns into an underscore
		return '_'
	}, s)

	if unicode.IsDigit(rune(s[0])) {
		s = "key" + "_" + s
	}
	if s[0] == '_' {
		s = "key" + s
	}
	return s
}
