package dashboardtypes

import (
	"sort"

	"github.com/perses/spec/go/dashboard/variable"
)

// ══════════════════════════════════════════════
// Variables
// ══════════════════════════════════════════════

// convertV1Variables walks the v1 `variables` map (UUID-keyed) and produces an
// ordered []Variable. Variables sort by `order` first, then by id for stable
// output. v1 variable types map as follows:
//
//	QUERY    → ListVariable + signoz/QueryVariable
//	CUSTOM   → ListVariable + signoz/CustomVariable
//	DYNAMIC  → ListVariable + signoz/DynamicVariable
//	TEXTBOX  → TextVariable
func (d *v1Decoder) convertV1Variables(raw any) []Variable {
	if raw == nil {
		return nil
	}
	rawVariablesMap, ok := raw.(map[string]any)
	if !ok {
		d.noteMalformedField("variables", raw)
		return nil
	}
	type ordered struct {
		variableID      string
		variableContent map[string]any
		order           float64
	}
	entries := make([]ordered, 0, len(rawVariablesMap))
	for variableID, variableContentRaw := range rawVariablesMap {
		variableContent, ok := variableContentRaw.(map[string]any)
		if !ok {
			d.noteMalformedField("variables."+variableID, variableContentRaw)
			continue
		}
		entries = append(entries, ordered{variableID: variableID, variableContent: variableContent, order: d.readFloat(variableContent, "order")})
	}
	sort.SliceStable(entries, func(i, j int) bool {
		if entries[i].order != entries[j].order {
			return entries[i].order < entries[j].order
		}
		return entries[i].variableID < entries[j].variableID
	})

	variablesV2 := make([]Variable, 0, len(entries))
	for _, e := range entries {
		v, ok := d.convertV1Variable(e.variableContent)
		if !ok {
			continue
		}
		variablesV2 = append(variablesV2, v)
	}
	return variablesV2
}

func (d *v1Decoder) convertV1Variable(v map[string]any) (Variable, bool) {
	name := d.readString(v, "name")
	if name == "" {
		return Variable{}, false
	}
	description := d.readString(v, "description")
	kind := d.readString(v, "type")

	switch kind {
	case "TEXTBOX":
		spec := &TextVariableSpec{
			Display: Display{Name: name, Description: description},
			Value:   d.readString(v, "textboxValue"),
			Name:    name,
		}
		return Variable{Kind: variable.KindText, Spec: spec}, true

	case "QUERY", "CUSTOM", "DYNAMIC":
		listSpec := &ListVariableSpec{
			Display:         Display{Name: name, Description: description},
			AllowAllValue:   d.readBool(v, "showALLOption"),
			AllowMultiple:   d.readBool(v, "multiSelect"),
			CustomAllValue:  d.readString(v, "customAllValue"),
			CapturingRegexp: d.readString(v, "capturingRegexp"),
			Sort:            mapV1Sort(d.readString(v, "sort")),
			Plugin:          d.variablePluginFor(kind, v),
			Name:            name,
		}
		if dv := mapV1VariableDefault(v); dv != nil {
			listSpec.DefaultValue = dv
		}
		return Variable{Kind: variable.KindList, Spec: listSpec}, true

	default:
		d.note("variable %q has unknown type %q", name, kind)
		return Variable{}, false
	}
}

func (d *v1Decoder) variablePluginFor(kind string, v map[string]any) VariablePlugin {
	switch kind {
	case "QUERY":
		return VariablePlugin{
			Kind: VariableKindQuery,
			Spec: &QueryVariableSpec{QueryValue: d.readString(v, "queryValue")},
		}
	case "CUSTOM":
		return VariablePlugin{
			Kind: VariableKindCustom,
			Spec: &CustomVariableSpec{CustomValue: d.readString(v, "customValue")},
		}
	case "DYNAMIC":
		spec := &DynamicVariableSpec{Name: d.readString(v, "dynamicVariablesAttribute")}
		if signal := signalFromDataSource(v["dynamicVariablesSource"]); !signal.IsZero() {
			spec.Signal = signal
		}
		return VariablePlugin{Kind: VariableKindDynamic, Spec: spec}
	}
	return VariablePlugin{}
}

// mapV1VariableDefault reads selectedValue/defaultValue, both polymorphic
// (string|array), so it indexes the raw value and lets defaultValueFromAny
// type-switch — no typed accessor, intentionally lenient.
func mapV1VariableDefault(v map[string]any) *VariableDefaultValue {
	if raw, ok := v["selectedValue"]; ok {
		return defaultValueFromAny(raw)
	}
	if raw, ok := v["defaultValue"]; ok {
		return defaultValueFromAny(raw)
	}
	return nil
}

func defaultValueFromAny(raw any) *VariableDefaultValue {
	switch v := raw.(type) {
	case string:
		if v == "" {
			return nil
		}
		return &VariableDefaultValue{variable.DefaultValue{SingleValue: v}}
	case []any:
		if len(v) == 0 {
			return nil
		}
		values := make([]string, 0, len(v))
		for _, item := range v {
			if s, ok := item.(string); ok && s != "" {
				values = append(values, s)
			}
		}
		if len(values) == 0 {
			return nil
		}
		return &VariableDefaultValue{variable.DefaultValue{SliceValues: values}}
	}
	return nil
}

func mapV1Sort(s string) ListVariableSpecSort {
	switch s {
	case "ASC":
		return SortAlphabeticalAsc
	case "DESC":
		return SortAlphabeticalDesc
	}
	return ListVariableSpecSort{} // zero (omitzero) — SortNone is the implicit default
}
