package definitions

import (
	"bytes"
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

var ErrCodeServiceDefinitionNotFound = errors.MustNewCode("service_definition_not_found")

//go:embed aws
var definitionFiles embed.FS

type serviceDefinitionLoader struct {
	provider citypes.CloudProviderType
	services map[citypes.ServiceID]citypes.ServiceDefinition
}

// ServiceDefinitionLoader loads and provides access to service definitions for a given cloud provider.
type ServiceDefinitionLoader interface {
	List() ([]citypes.ServiceDefinition, error)
	Get(serviceID citypes.ServiceID) (*citypes.ServiceDefinition, error)
}

// NewServiceDefinitionLoader creates a new loader for the given cloud provider.
// It reads and parses all service definition files at construction time.
func NewServiceDefinitionLoader(provider citypes.CloudProviderType) (ServiceDefinitionLoader, error) {
	services, err := readServiceDefinitions(provider)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to load service definitions for %s", provider.StringValue())
	}
	return &serviceDefinitionLoader{provider: provider, services: services}, nil
}

// List returns all service definitions for the provider, sorted by ID.
func (l *serviceDefinitionLoader) List() ([]citypes.ServiceDefinition, error) {
	result := make([]citypes.ServiceDefinition, 0, len(l.services))
	for _, def := range l.services {
		result = append(result, def)
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].ID < result[j].ID
	})
	return result, nil
}

// Get returns the service definition for the given service ID.
func (l *serviceDefinitionLoader) Get(serviceID citypes.ServiceID) (*citypes.ServiceDefinition, error) {
	def, ok := l.services[serviceID]
	if !ok {
		return nil, errors.New(errors.TypeNotFound, ErrCodeServiceDefinitionNotFound, fmt.Sprintf("service definition not found for service id %q", serviceID.StringValue()))
	}
	return &def, nil
}

func readServiceDefinitions(provider citypes.CloudProviderType) (map[citypes.ServiceID]citypes.ServiceDefinition, error) {
	providerDir := provider.StringValue()
	entries, err := fs.ReadDir(definitionFiles, providerDir)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't read service definition dirs for %s", provider.StringValue())
	}

	services := map[citypes.ServiceID]citypes.ServiceDefinition{}
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		svcDir := path.Join(providerDir, entry.Name())
		def, err := readServiceDefinition(svcDir)
		if err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't read service definition for %s/%s", provider.StringValue(), entry.Name())
		}
		serviceID, err := citypes.NewServiceID(provider, def.ServiceDefinitionMetadata.ID)
		if err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "invalid service id %q for provider %s", def.ServiceDefinitionMetadata.ID, provider.StringValue())
		}
		if _, exists := services[serviceID]; exists {
			return nil, errors.NewInternalf(errors.CodeInternal, "duplicate service definition id %q in %s", def.ServiceDefinitionMetadata.ID, svcDir)
		}
		services[serviceID] = *def
	}
	return services, nil
}

func readServiceDefinition(svcDir string) (*citypes.ServiceDefinition, error) {
	integrationJSONPath := path.Join(svcDir, "integration.json")
	raw, err := definitionFiles.ReadFile(integrationJSONPath)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't read %s", integrationJSONPath)
	}

	// Parse the JSON into a generic map so we can hydrate file:// URIs before final decode
	var specMap map[string]any
	if err := json.Unmarshal(raw, &specMap); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't parse %s", integrationJSONPath)
	}

	hydrated, err := hydrateFileURIs(specMap, definitionFiles, svcDir)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't hydrate file URIs in %s", integrationJSONPath)
	}

	// Re-encode to JSON and decode into the typed struct
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

	return &def, nil
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
