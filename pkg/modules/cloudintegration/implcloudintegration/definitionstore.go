package implcloudintegration

import (
	"bytes"
	"context"
	"embed"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io/fs"
	"path"
	"sort"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	citypes "github.com/SigNoz/signoz/pkg/types/cloudintegrationtypes"
)

const definitionsRoot = "fs/definitions"

//go:embed fs/definitions/*
var definitionFiles embed.FS

type definitionStore struct{}

// NewServiceDefinitionStore creates a new ServiceDefinitionStore backed by the embedded filesystem.
func NewServiceDefinitionStore() citypes.ServiceDefinitionStore {
	return &definitionStore{}
}

// Get reads and hydrates the service definition for the given provider and service ID.
func (s *definitionStore) Get(ctx context.Context, provider citypes.CloudProviderType, serviceID citypes.ServiceID) (*citypes.ServiceDefinition, error) {
	svcDir := path.Join(definitionsRoot, provider.StringValue(), serviceID.StringValue())
	def, err := readServiceDefinition(svcDir)
	if err != nil {
		return nil, errors.New(errors.TypeNotFound, citypes.ErrCodeServiceDefinitionNotFound, fmt.Sprintf("service definition not found for service id %q", serviceID.StringValue()))
	}
	return def, nil
}

// List reads and hydrates all service definitions for the given provider, sorted by ID.
func (s *definitionStore) List(ctx context.Context, provider citypes.CloudProviderType) ([]*citypes.ServiceDefinition, error) {
	providerDir := path.Join(definitionsRoot, provider.StringValue())
	entries, err := fs.ReadDir(definitionFiles, providerDir)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't read service definition dirs for %s", provider.StringValue())
	}

	var result []*citypes.ServiceDefinition
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		svcDir := path.Join(providerDir, entry.Name())
		def, err := readServiceDefinition(svcDir)
		if err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't read service definition for %s/%s", provider.StringValue(), entry.Name())
		}
		result = append(result, def)
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].ID < result[j].ID
	})
	return result, nil
}

// following are helper functions for reading and hydrating service definitions,
// not keeping this in types as this is an implementation detail of the definition store.
func readServiceDefinition(svcDir string) (*citypes.ServiceDefinition, error) {
	integrationJSONPath := path.Join(svcDir, "integration.json")
	raw, err := definitionFiles.ReadFile(integrationJSONPath)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't read %s", integrationJSONPath)
	}

	var specMap map[string]any
	if err := json.Unmarshal(raw, &specMap); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't parse %s", integrationJSONPath)
	}

	hydrated, err := hydrateFileURIs(specMap, definitionFiles, svcDir)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't hydrate file URIs in %s", integrationJSONPath)
	}

	reEncoded, err := json.Marshal(hydrated)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't re-encode hydrated spec from %s", integrationJSONPath)
	}

	var def citypes.ServiceDefinition
	decoder := json.NewDecoder(bytes.NewReader(reEncoded))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&def); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't decode service definition from %s", integrationJSONPath)
	}

	if err := validateServiceDefinition(&def); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "invalid service definition in %s", svcDir)
	}

	return &def, nil
}

func validateServiceDefinition(def *citypes.ServiceDefinition) error {
	if def.TelemetryCollectionStrategy == nil {
		return errors.NewInternalf(errors.CodeInternal, "telemetryCollectionStrategy is required")
	}

	seenDashboardIDs := map[string]struct{}{}
	for _, d := range def.Assets.Dashboards {
		if _, seen := seenDashboardIDs[d.ID]; seen {
			return errors.NewInternalf(errors.CodeInternal, "duplicate dashboard id %q", d.ID)
		}
		seenDashboardIDs[d.ID] = struct{}{}
	}

	return nil
}

// hydrateFileURIs walks a JSON-decoded value and replaces any "file://<path>" strings
// with the actual file contents (text for .md, base64 data URI for .svg, parsed JSON for .json).
func hydrateFileURIs(v any, embeddedFS embed.FS, basedir string) (any, error) {
	switch val := v.(type) {
	case map[string]any:
		result := make(map[string]any, len(val))
		for k, child := range val {
			hydrated, err := hydrateFileURIs(child, embeddedFS, basedir)
			if err != nil {
				return nil, err
			}
			result[k] = hydrated
		}
		return result, nil

	case []any:
		result := make([]any, len(val))
		for i, child := range val {
			hydrated, err := hydrateFileURIs(child, embeddedFS, basedir)
			if err != nil {
				return nil, err
			}
			result[i] = hydrated
		}
		return result, nil

	case string:
		if !strings.HasPrefix(val, "file://") {
			return val, nil
		}
		return readEmbeddedFile(embeddedFS, path.Join(basedir, val[len("file://"):]))
	}
	return v, nil
}

func readEmbeddedFile(embeddedFS embed.FS, filePath string) (any, error) {
	contents, err := embeddedFS.ReadFile(filePath)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't read embedded file %s", filePath)
	}
	switch {
	case strings.HasSuffix(filePath, ".md"):
		return string(contents), nil
	case strings.HasSuffix(filePath, ".svg"):
		return fmt.Sprintf("data:image/svg+xml;base64,%s", base64.StdEncoding.EncodeToString(contents)), nil
	case strings.HasSuffix(filePath, ".json"):
		var parsed any
		if err := json.Unmarshal(contents, &parsed); err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't parse JSON file %s", filePath)
		}
		return parsed, nil
	default:
		return nil, errors.NewInternalf(errors.CodeInternal, "unsupported file type for embedded reference: %s", filePath)
	}
}
