package dashboardtypes

import (
	"sort"
	"strconv"
	"strings"

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
		return []Variable{}
	}
	rawVariablesMap, ok := raw.(map[string]any)
	if !ok {
		// v1 sometimes stores variables as a list. The frontend consumes it via
		// Object.entries/keys, which for an array yields the stringified index as the
		// key, so mirror that: [{...}] is treated as {"0":{...}}. An empty list is
		// simply "no variables".
		rawSlice, isSlice := raw.([]any)
		if !isSlice {
			d.noteMalformedField("variables", raw)
			return nil
		}
		rawVariablesMap = make(map[string]any, len(rawSlice))
		for i, v := range rawSlice {
			rawVariablesMap[strconv.Itoa(i)] = v
		}
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
			// A variable whose content isn't an object (e.g. a stray "list" array) can't
			// render in the current UI, so it's useless — skip it instead of failing the
			// migration.
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
	// v1 stores the type upper-cased (QUERY/CUSTOM/…); tolerate any casing.
	kind := strings.ToUpper(d.readString(v, "type"))

	switch kind {
	case "TEXTBOX":
		spec := &TextVariableSpec{
			Display: Display{Name: clipName(name, MaxDisplayNameLen), Description: description},
			Value:   d.readString(v, "textboxValue"),
			Name:    name,
		}
		return Variable{Kind: variable.KindText, Spec: spec}, true

	case "QUERY", "CUSTOM", "DYNAMIC":
		// Drop (don't fail on) a dynamic variable with no attribute — it can't resolve.
		if kind == "DYNAMIC" && d.readString(v, "dynamicVariablesAttribute") == "" {
			return Variable{}, false
		}
		// Drop a custom variable with no recoverable option list — v2 requires one.
		if kind == "CUSTOM" && d.readString(v, "customValue") == "" && d.readString(v, "selectedValue") == "" && d.readString(v, "defaultValue") == "" {
			return Variable{}, false
		}
		// Drop a query variable with no query — it can't resolve.
		if kind == "QUERY" && d.readString(v, "queryValue") == "" {
			return Variable{}, false
		}
		listSpec := &ListVariableSpec{
			Display:         Display{Name: clipName(name, MaxDisplayNameLen), Description: description},
			AllowAllValue:   d.readBool(v, "showALLOption"),
			AllowMultiple:   d.readBool(v, "multiSelect"),
			CustomAllValue:  d.readString(v, "customAllValue"),
			CapturingRegexp: d.readString(v, "capturingRegexp"),
			Sort:            mapV1Sort(v["sort"]),
			Plugin:          d.variablePluginFor(kind, v),
			Name:            name,
		}
		// A single-select variable can't offer an "All" option: v2 rejects allowAllValue
		// (and thus customAllValue) without allowMultiple. Drop them rather than fail.
		if !listSpec.AllowMultiple {
			listSpec.AllowAllValue = false
			listSpec.CustomAllValue = ""
		}
		if dv := mapV1VariableDefault(v, listSpec.AllowMultiple); dv != nil {
			listSpec.DefaultValue = dv
		}
		return Variable{Kind: variable.KindList, Spec: listSpec}, true

	case "":
		// v1 sometimes stores a variable with no type; it can't render, so drop it
		// silently rather than flagging it malformed.
		return Variable{}, false

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
		// Some v1 dashboards stored the option list in selectedValue/defaultValue
		// instead of customValue; fall back so the variable survives migration.
		customValue := d.readString(v, "customValue")
		if customValue == "" {
			customValue = d.readString(v, "selectedValue")
		}
		if customValue == "" {
			customValue = d.readString(v, "defaultValue")
		}
		return VariablePlugin{
			Kind: VariableKindCustom,
			Spec: &CustomVariableSpec{CustomValue: customValue},
		}
	case "DYNAMIC":
		return VariablePlugin{
			Kind: VariableKindDynamic,
			Spec: &DynamicVariableSpec{
				Name:   d.readString(v, "dynamicVariablesAttribute"),
				Signal: mapV1VariableSignal(v["dynamicVariablesSource"]),
			},
		}
	}
	return VariablePlugin{}
}

// mapV1VariableSignal maps a v1 dynamicVariablesSource to a dynamic variable's
// signal. v1 stores it capitalized ("Traces"), so match case-insensitively;
// v1's "All telemetry" (and any unrecognized/empty source) means every signal.
func mapV1VariableSignal(raw any) DynamicVariableSignal {
	s, _ := raw.(string)
	switch strings.ToLower(s) {
	case "traces":
		return DynamicVariableSignalTraces
	case "logs":
		return DynamicVariableSignalLogs
	case "metrics":
		return DynamicVariableSignalMetrics
	}
	return DynamicVariableSignalAll
}

// mapV1VariableDefault reads selectedValue/defaultValue, both polymorphic
// (string|array), so it indexes the raw value and lets defaultValueFromAny
// type-switch — no typed accessor, intentionally lenient.
func mapV1VariableDefault(v map[string]any, allowMultiple bool) *VariableDefaultValue {
	if raw, ok := v["selectedValue"]; ok {
		return defaultValueFromAny(raw, allowMultiple)
	}
	if raw, ok := v["defaultValue"]; ok {
		return defaultValueFromAny(raw, allowMultiple)
	}
	return nil
}

func defaultValueFromAny(raw any, allowMultiple bool) *VariableDefaultValue {
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
		// A single-select variable can't carry a list default; collapse a lone value.
		if !allowMultiple && len(values) == 1 {
			return &VariableDefaultValue{variable.DefaultValue{SingleValue: values[0]}}
		}
		return &VariableDefaultValue{variable.DefaultValue{SliceValues: values}}
	}
	return nil
}

// mapV1Sort reads the raw value (not via readString) so a non-string sort — some v1
// dashboards store it as a number (e.g. 0) — defaults to none silently instead of
// being flagged malformed.
func mapV1Sort(raw any) ListVariableSpecSort {
	s, _ := raw.(string)
	switch s {
	case "ASC":
		return SortAlphabeticalAsc
	case "DESC":
		return SortAlphabeticalDesc
	}
	return ListVariableSpecSort{} // zero (omitzero) — SortNone is the implicit default
}
