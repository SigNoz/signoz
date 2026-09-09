package spantypes

import (
	"bytes"
	"encoding/json"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
)

var ErrCodeMappingDefinitionInvalid = errors.MustNewCode("span_attribute_mapping_definition_invalid")

// ProvisionerIdentity is stamped into created_by/updated_by by the reconciler.
const ProvisionerIdentity = "signoz"

// SpanMapperGroupDefinition is one shipped mapping group. Version is bumped on
// every content change and drives upgrades; the group name is the stable key
// and never changes.
type SpanMapperGroupDefinition struct {
	Version    int                         `json:"version"`
	Definition PostableSpanMapperTestGroup `json:"definition"`
}

func (d SpanMapperGroupDefinition) Name() string {
	return d.Definition.Name
}

func NewSpanMapperGroupDefinition(raw []byte) (SpanMapperGroupDefinition, error) {
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.DisallowUnknownFields()

	var d SpanMapperGroupDefinition
	if err := decoder.Decode(&d); err != nil {
		return SpanMapperGroupDefinition{}, errors.WrapInvalidInputf(err, ErrCodeMappingDefinitionInvalid, "%s", err.Error())
	}
	if err := d.validate(); err != nil {
		return SpanMapperGroupDefinition{}, err
	}
	return d, nil
}

// SystemCondition is the shipped condition with every substring stamped as an
// enabled system item.
func (d SpanMapperGroupDefinition) SystemCondition() SpanMapperGroupCondition {
	return SpanMapperGroupCondition{
		Attributes: enabledSystemConditionKeys(d.Definition.Condition.Attributes),
		Resource:   enabledSystemConditionKeys(d.Definition.Condition.Resource),
	}
}

// SystemSources returns a shipped mapper's sources stamped as enabled system items.
func (d SpanMapperGroupDefinition) SystemSources(m *PostableSpanMapper) []SpanMapperSource {
	return enabledSystemSources(m.Config.Sources)
}

// SpanMapperGroupRegistry holds every definition embedded in the binary, keyed by name.
type SpanMapperGroupRegistry struct {
	definitions map[string]SpanMapperGroupDefinition
}

func NewSpanMapperGroupRegistry(definitions []SpanMapperGroupDefinition) (SpanMapperGroupRegistry, error) {
	byName := make(map[string]SpanMapperGroupDefinition, len(definitions))
	for _, d := range definitions {
		if _, dup := byName[d.Name()]; dup {
			return SpanMapperGroupRegistry{}, errors.NewInvalidInputf(ErrCodeMappingDefinitionInvalid, "duplicate span mapper group name %q", d.Name())
		}
		byName[d.Name()] = d
	}
	return SpanMapperGroupRegistry{definitions: byName}, nil
}

func (r SpanMapperGroupRegistry) Get(name string) (SpanMapperGroupDefinition, bool) {
	d, ok := r.definitions[name]
	return d, ok
}

func (r SpanMapperGroupRegistry) IsReserved(name string) bool {
	_, ok := r.definitions[name]
	return ok
}

// List returns the definitions sorted by name so provisioning order is stable.
func (r SpanMapperGroupRegistry) List() []SpanMapperGroupDefinition {
	out := make([]SpanMapperGroupDefinition, 0, len(r.definitions))
	for _, d := range r.definitions {
		out = append(out, d)
	}
	slices.SortFunc(out, func(a, b SpanMapperGroupDefinition) int { return strings.Compare(a.Name(), b.Name()) })
	return out
}

func (d SpanMapperGroupDefinition) validate() error {
	if d.Version < 1 {
		return errors.NewInvalidInputf(ErrCodeMappingDefinitionInvalid, "version must be at least 1, got %d", d.Version)
	}
	if err := d.Definition.PostableSpanMapperGroup.Validate(); err != nil {
		return errors.Wrapf(err, errors.TypeInvalidInput, ErrCodeMappingDefinitionInvalid, "%s", d.Name())
	}
	if len(d.Definition.Mappers) == 0 {
		return errors.NewInvalidInputf(ErrCodeMappingDefinitionInvalid, "%s: at least one mapper is required", d.Name())
	}
	names := make(map[string]struct{}, len(d.Definition.Mappers))
	for i := range d.Definition.Mappers {
		m := &d.Definition.Mappers[i]
		if err := m.Validate(); err != nil {
			return errors.Wrapf(err, errors.TypeInvalidInput, ErrCodeMappingDefinitionInvalid, "%s: mapper %q", d.Name(), m.Name)
		}
		if _, dup := names[m.Name]; dup {
			return errors.NewInvalidInputf(ErrCodeMappingDefinitionInvalid, "%s: duplicate mapper %q", d.Name(), m.Name)
		}
		names[m.Name] = struct{}{}
		for _, s := range m.Config.Sources {
			if !s.Origin.IsZero() || s.Enabled {
				return errors.NewInvalidInputf(ErrCodeMappingDefinitionInvalid, "%s: mapper %q: sources must not set origin or enabled", d.Name(), m.Name)
			}
		}
	}
	for _, k := range slices.Concat(d.Definition.Condition.Attributes, d.Definition.Condition.Resource) {
		if !k.Origin.IsZero() || k.Enabled {
			return errors.NewInvalidInputf(ErrCodeMappingDefinitionInvalid, "%s: condition substrings must not set origin or enabled", d.Name())
		}
	}
	return nil
}
