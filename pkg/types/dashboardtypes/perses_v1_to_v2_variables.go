package dashboardtypes

import (
	"sort"

	"github.com/perses/spec/go/dashboard"
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
func convertV1Variables(raw any) ([]Variable, error) {
	if raw == nil {
		return nil, nil
	}
	rawMap, ok := raw.(map[string]any)
	if !ok {
		return nil, malformedV1FieldErr("variables", raw)
	}
	if len(rawMap) == 0 {
		return nil, nil
	}
	type ordered struct {
		key string
		val map[string]any
		ord float64
	}
	entries := make([]ordered, 0, len(rawMap))
	for key, value := range rawMap {
		m, ok := value.(map[string]any)
		if !ok {
			continue
		}
		ord, _ := m["order"].(float64)
		entries = append(entries, ordered{key: key, val: m, ord: ord})
	}
	sort.SliceStable(entries, func(i, j int) bool {
		if entries[i].ord != entries[j].ord {
			return entries[i].ord < entries[j].ord
		}
		return entries[i].key < entries[j].key
	})

	out := make([]Variable, 0, len(entries))
	for _, e := range entries {
		v, ok := convertV1Variable(e.val)
		if !ok {
			continue
		}
		out = append(out, v)
	}
	return out, nil
}

func convertV1Variable(v map[string]any) (Variable, bool) {
	name, _ := v["name"].(string)
	if name == "" {
		return Variable{}, false
	}
	description, _ := v["description"].(string)
	kind, _ := v["type"].(string)

	switch kind {
	case "TEXTBOX":
		value, _ := v["textboxValue"].(string)
		spec := &dashboard.TextVariableSpec{
			TextSpec: variable.TextSpec{
				Display: &variable.Display{Name: name, Description: description},
				Value:   value,
			},
			Name: name,
		}
		return Variable{Kind: variable.KindText, Spec: spec}, true

	case "QUERY", "CUSTOM", "DYNAMIC":
		listSpec := &ListVariableSpec{
			Display:         Display{Name: name, Description: description},
			AllowAllValue:   valueAt[bool](v, "showALLOption"),
			AllowMultiple:   valueAt[bool](v, "multiSelect"),
			CustomAllValue:  valueAt[string](v, "customAllValue"),
			CapturingRegexp: valueAt[string](v, "capturingRegexp"),
			Sort:            mapV1Sort(v["sort"]),
			Plugin:          variablePluginFor(kind, v),
			Name:            name,
		}
		if dv := mapV1VariableDefault(v); dv != nil {
			listSpec.DefaultValue = dv
		}
		return Variable{Kind: variable.KindList, Spec: listSpec}, true
	}

	return Variable{}, false
}

func variablePluginFor(kind string, v map[string]any) VariablePlugin {
	switch kind {
	case "QUERY":
		return VariablePlugin{
			Kind: VariableKindQuery,
			Spec: &QueryVariableSpec{QueryValue: valueAt[string](v, "queryValue")},
		}
	case "CUSTOM":
		return VariablePlugin{
			Kind: VariableKindCustom,
			Spec: &CustomVariableSpec{CustomValue: valueAt[string](v, "customValue")},
		}
	case "DYNAMIC":
		spec := &DynamicVariableSpec{Name: valueAt[string](v, "dynamicVariablesAttribute")}
		if signal := signalFromDataSource(v["dynamicVariablesSource"]); !signal.IsZero() {
			spec.Signal = signal
		}
		return VariablePlugin{Kind: VariableKindDynamic, Spec: spec}
	}
	return VariablePlugin{}
}

func mapV1VariableDefault(v map[string]any) *variable.DefaultValue {
	if raw, ok := v["selectedValue"]; ok {
		return defaultValueFromAny(raw)
	}
	if raw, ok := v["defaultValue"]; ok {
		return defaultValueFromAny(raw)
	}
	return nil
}

func defaultValueFromAny(raw any) *variable.DefaultValue {
	switch v := raw.(type) {
	case string:
		if v == "" {
			return nil
		}
		return &variable.DefaultValue{SingleValue: v}
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
		return &variable.DefaultValue{SliceValues: values}
	}
	return nil
}

func mapV1Sort(raw any) *variable.Sort {
	s, _ := raw.(string)
	var sort variable.Sort
	switch s {
	case "ASC":
		sort = variable.SortAlphabeticalAsc
	case "DESC":
		sort = variable.SortAlphabeticalDesc
	case "DISABLED", "":
		return nil // SortNone is the implicit default
	default:
		return nil
	}
	return &sort
}
