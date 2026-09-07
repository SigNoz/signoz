package dashboardtypes

import (
	"bytes"
	"encoding/json"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
)

// SystemDashboardDefinition is one shipped system dashboard. Version is bumped on
// every content change and drives upgrade detection; the name is the stable key
// and never changes.
type SystemDashboardDefinition struct {
	Version   int                 `json:"version"`
	Dashboard PostableDashboardV2 `json:"definition"`
}

func (definition SystemDashboardDefinition) Name() string {
	return definition.Dashboard.Name
}

func NewSystemDashboardDefinition(raw []byte) (SystemDashboardDefinition, error) {
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.DisallowUnknownFields()

	var definition SystemDashboardDefinition
	if err := decoder.Decode(&definition); err != nil {
		return SystemDashboardDefinition{}, errors.WrapInvalidInputf(err, ErrCodeSystemDashboardDefinitionInvalid, "%s", err.Error())
	}
	if err := definition.validate(); err != nil {
		return SystemDashboardDefinition{}, err
	}

	return definition, nil
}

func (definition SystemDashboardDefinition) validate() error {
	if definition.Version < 1 {
		return errors.NewInvalidInputf(ErrCodeSystemDashboardDefinitionInvalid, "version must be at least 1, got %d", definition.Version)
	}
	if !strings.HasPrefix(definition.Name(), SystemDashboardNamePrefix) {
		return errors.NewInvalidInputf(ErrCodeSystemDashboardDefinitionInvalid, "name %q must start with %q", definition.Name(), SystemDashboardNamePrefix)
	}
	if definition.Dashboard.GenerateName {
		return errors.NewInvalidInputf(ErrCodeSystemDashboardDefinitionInvalid, "%s: generateName is not allowed, the name is the stable key", definition.Name())
	}

	return nil
}

// ToUpdatable is how an upgrade re-applies a definition onto an existing row:
// everything but the dashboard's identity comes from the shipped definition.
func (definition SystemDashboardDefinition) ToUpdatable() UpdatableDashboardV2 {
	return UpdatableDashboardV2{
		DashboardV2MetadataBase: definition.Dashboard.DashboardV2MetadataBase,
		Name:                    definition.Dashboard.Name,
		Tags:                    definition.Dashboard.Tags,
		Spec:                    definition.Dashboard.Spec,
	}
}

// SystemDashboardRegistry holds every definition embedded in the binary, keyed by name.
type SystemDashboardRegistry struct {
	definitions map[string]SystemDashboardDefinition
}

func NewSystemDashboardRegistry(definitions []SystemDashboardDefinition) (SystemDashboardRegistry, error) {
	byName := make(map[string]SystemDashboardDefinition, len(definitions))
	for _, definition := range definitions {
		if _, duplicate := byName[definition.Name()]; duplicate {
			return SystemDashboardRegistry{}, errors.NewInvalidInputf(ErrCodeSystemDashboardDefinitionInvalid, "duplicate system dashboard name %q", definition.Name())
		}
		byName[definition.Name()] = definition
	}

	return SystemDashboardRegistry{definitions: byName}, nil
}

func (registry SystemDashboardRegistry) Get(name string) (SystemDashboardDefinition, bool) {
	definition, ok := registry.definitions[name]
	return definition, ok
}

// List returns the definitions sorted by name so provisioning order is stable.
func (registry SystemDashboardRegistry) List() []SystemDashboardDefinition {
	definitions := make([]SystemDashboardDefinition, 0, len(registry.definitions))
	for _, definition := range registry.definitions {
		definitions = append(definitions, definition)
	}
	slices.SortFunc(definitions, func(a, b SystemDashboardDefinition) int { return strings.Compare(a.Name(), b.Name()) })

	return definitions
}
