package systemdashboardtypes

import (
	"bytes"
	"encoding/json"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
)

// Definition is one shipped system dashboard. Version is bumped on every content
// change and drives upgrade detection; the name is the stable key and never changes.
type Definition struct {
	Version   int                                `json:"version"`
	Dashboard dashboardtypes.PostableDashboardV2 `json:"definition"`
}

func (definition Definition) Name() string {
	return definition.Dashboard.Name
}

func NewDefinition(raw []byte) (Definition, error) {
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.DisallowUnknownFields()

	var definition Definition
	if err := decoder.Decode(&definition); err != nil {
		return Definition{}, errors.WrapInvalidInputf(err, ErrCodeSystemDashboardDefinitionInvalid, "%s", err.Error())
	}
	if err := definition.validate(); err != nil {
		return Definition{}, err
	}

	return definition, nil
}

func (definition Definition) validate() error {
	if definition.Version < 1 {
		return errors.NewInvalidInputf(ErrCodeSystemDashboardDefinitionInvalid, "version must be at least 1, got %d", definition.Version)
	}
	if !strings.HasPrefix(definition.Name(), dashboardtypes.SystemDashboardNamePrefix) {
		return errors.NewInvalidInputf(ErrCodeSystemDashboardDefinitionInvalid, "name %q must start with %q", definition.Name(), dashboardtypes.SystemDashboardNamePrefix)
	}
	if definition.Dashboard.GenerateName {
		return errors.NewInvalidInputf(ErrCodeSystemDashboardDefinitionInvalid, "%s: generateName is not allowed, the name is the stable key", definition.Name())
	}

	return nil
}

// ToUpdatable is how an upgrade re-applies a definition onto an existing row:
// everything but the dashboard's identity comes from the shipped definition.
func (definition Definition) ToUpdatable() dashboardtypes.UpdatableDashboardV2 {
	return dashboardtypes.UpdatableDashboardV2{
		DashboardV2MetadataBase: definition.Dashboard.DashboardV2MetadataBase,
		Name:                    definition.Dashboard.Name,
		Tags:                    definition.Dashboard.Tags,
		Spec:                    definition.Dashboard.Spec,
	}
}

// Registry holds every definition embedded in the binary, keyed by name.
type Registry struct {
	definitions map[string]Definition
}

func NewRegistry(definitions []Definition) (Registry, error) {
	byName := make(map[string]Definition, len(definitions))
	for _, definition := range definitions {
		if _, duplicate := byName[definition.Name()]; duplicate {
			return Registry{}, errors.NewInvalidInputf(ErrCodeSystemDashboardDefinitionInvalid, "duplicate system dashboard name %q", definition.Name())
		}
		byName[definition.Name()] = definition
	}

	return Registry{definitions: byName}, nil
}

func (registry Registry) Get(name string) (Definition, bool) {
	definition, ok := registry.definitions[name]
	return definition, ok
}

// List returns the definitions sorted by name so provisioning order is stable.
func (registry Registry) List() []Definition {
	definitions := make([]Definition, 0, len(registry.definitions))
	for _, definition := range registry.definitions {
		definitions = append(definitions, definition)
	}
	slices.SortFunc(definitions, func(a, b Definition) int { return strings.Compare(a.Name(), b.Name()) })

	return definitions
}
