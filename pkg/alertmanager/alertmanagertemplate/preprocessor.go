package alertmanagertemplate

import (
	"fmt"
	"reflect"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/go-viper/mapstructure/v2"
)

// fieldPath is a dotted mapstructure path into the templating data map,
// e.g. "alert.is_firing" or "rule.threshold.value".
type fieldPath string

// extractFieldMappings flattens the struct hierarchy into a list of dotted
// mapstructure paths that user templates can reference. It emits:
//   - a leaf for every scalar field
//   - a leaf for every map field (labels, annotations)
//   - a mapping for each intermediate sub-struct itself, so {{ $alert := .alert }}
//     bindings let action blocks write {{ if $alert.is_firing }}
//
// Slices and interfaces are not surfaced. Pointer fields are dereferenced.
func extractFieldMappings(data any) []fieldPath {
	val := reflect.ValueOf(data)
	if val.Kind() == reflect.Ptr {
		if val.IsNil() {
			return nil
		}
		val = val.Elem()
	}
	if val.Kind() != reflect.Struct {
		return nil
	}
	return collectFieldMappings(val, "")
}

func collectFieldMappings(val reflect.Value, prefix string) []fieldPath {
	typ := val.Type()
	var paths []fieldPath
	for i := 0; i < typ.NumField(); i++ {
		field := typ.Field(i)
		if !field.IsExported() {
			continue
		}

		tag := field.Tag.Get("mapstructure")
		if tag == "" || tag == "-" {
			continue
		}
		name := strings.Split(tag, ",")[0]
		if name == "" {
			continue
		}

		key := name
		if prefix != "" {
			key = prefix + "." + name
		}

		ft := field.Type
		if ft.Kind() == reflect.Ptr {
			ft = ft.Elem()
		}

		switch ft.Kind() {
		case reflect.Slice, reflect.Interface:
			continue
		}

		// Recurse into sub-structs (time.Time treated as a leaf).
		if ft.Kind() == reflect.Struct && ft.String() != "time.Time" {
			paths = append(paths, fieldPath(key))
			fv := val.Field(i)
			if fv.Kind() == reflect.Ptr {
				if fv.IsNil() {
					continue
				}
				fv = fv.Elem()
			}
			paths = append(paths, collectFieldMappings(fv, key)...)
			continue
		}

		paths = append(paths, fieldPath(key))
	}
	return paths
}

// structRootSet returns the top-level mapstructure tag names whose field
// type is a nested struct (excluding time.Time and map/slice/interface
// fields). These are the paths the rewriter walks segment-by-segment; any
// other dotted $-reference is treated as a flat key on the root map so that
// flattened OTel-style label keys like "service.name" resolve naturally.
func structRootSet(data any) map[string]bool {
	val := reflect.ValueOf(data)
	if val.Kind() == reflect.Ptr {
		if val.IsNil() {
			return nil
		}
		val = val.Elem()
	}
	if val.Kind() != reflect.Struct {
		return nil
	}

	roots := make(map[string]bool)
	typ := val.Type()
	for i := 0; i < typ.NumField(); i++ {
		field := typ.Field(i)
		if !field.IsExported() {
			continue
		}
		tag := field.Tag.Get("mapstructure")
		if tag == "" || tag == "-" {
			continue
		}
		name := strings.Split(tag, ",")[0]
		if name == "" {
			continue
		}
		ft := field.Type
		if ft.Kind() == reflect.Ptr {
			ft = ft.Elem()
		}
		if ft.Kind() == reflect.Struct && ft.String() != "time.Time" {
			roots[name] = true
		}
	}
	return roots
}

// buildDataMap converts the typed data struct to the map[string]any that the
// template engine indexes into. Each label and annotation is additionally
// exposed at the root under its raw key, so $service.name resolves a flat
// OTel-style label as a single-key index on the root. Struct-path keys
// already present at the root take precedence on collisions.
func buildDataMap(data any) (map[string]any, error) {
	var result map[string]any
	if err := mapstructure.Decode(data, &result); err != nil {
		return nil, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "failed to build template data map")
	}

	flatten := func(labels, annotations map[string]string) {
		for k, v := range labels {
			if _, ok := result[k]; !ok {
				result[k] = v
			}
		}
		for k, v := range annotations {
			if _, ok := result[k]; !ok {
				result[k] = v
			}
		}
	}

	switch data := data.(type) {
	case *alertmanagertypes.NotificationTemplateData:
		flatten(data.Labels, data.Annotations)
	case *alertmanagertypes.AlertData:
		flatten(data.Labels, data.Annotations)
	}
	return result, nil
}

// renderPreamble serialises a map of binding name → RHS expression into
// `{{ $name := expr }}` declarations. Dotted names are skipped: Go's
// text/template parser rejects `{{ $a.b := ... }}`; dotted paths are resolved
// at expansion time by the rewriter.
func renderPreamble(bindings map[string]string) string {
	if len(bindings) == 0 {
		return ""
	}
	var sb strings.Builder
	for name, expr := range bindings {
		if strings.Contains(name, ".") {
			continue
		}
		fmt.Fprintf(&sb, `{{ $%s := %s }}`, name, expr)
	}
	return sb.String()
}

// buildPreamble constructs the variable-definition preamble prepended to the
// user template, covering:
//   - known root-level struct paths ({{ $alert := .alert }})
//   - "<no value>" stubs for $-refs whose first segment matches nothing, so
//     action blocks like {{ if $custom_note }} don't error at parse time
//
// The set of unmatched names is returned separately so callers (preview API)
// can surface warnings.
func buildPreamble(tmpl string, data any) (string, map[string]bool, error) {
	bindings := make(map[string]string)
	// knownFirstSegments tracks every valid first segment of a $-ref, since
	// extractUsedVariables only gives us first segments. A label key like
	// "service.name" contributes "service" here, so $service.name isn't
	// flagged as unknown even though "service" has no direct binding.
	knownFirstSegments := make(map[string]bool)

	for _, p := range extractFieldMappings(data) {
		bindings[string(p)] = fmt.Sprintf(".%s", p)
		knownFirstSegments[firstSegment(string(p))] = true
	}
	// Labels/annotations are flattened into the root map by buildDataMap, so
	// a bare-accessible key (no dots) can be bound in the preamble — this is
	// what makes {{ if $severity }} or {{ $severity | toUpper }} work in
	// action blocks. Dotted label keys only contribute to knownFirstSegments:
	// their action-block use would be a syntax error anyway ($a.b is not a
	// valid Go template identifier).
	for k := range dataLabelsAndAnnotations(data) {
		knownFirstSegments[firstSegment(k)] = true
		if !strings.Contains(k, ".") {
			if _, ok := bindings[k]; !ok {
				bindings[k] = fmt.Sprintf(".%s", k)
			}
		}
	}

	used, err := extractUsedVariables(tmpl)
	if err != nil {
		return "", nil, err
	}

	unknown := make(map[string]bool)
	for name := range used {
		if !knownFirstSegments[name] {
			unknown[name] = true
			bindings[name] = `"<no value>"`
		}
	}

	return renderPreamble(bindings), unknown, nil
}

// firstSegment returns the portion of a dotted path before the first dot,
// or the whole string if there is no dot.
func firstSegment(path string) string {
	if i := strings.IndexByte(path, '.'); i >= 0 {
		return path[:i]
	}
	return path
}

// dataLabelsAndAnnotations returns the union of label and annotation keys on
// the given data struct (if it carries them). Used for first-segment
// recognition of $-refs that point into flat OTel-style label keys.
func dataLabelsAndAnnotations(data any) map[string]struct{} {
	keys := make(map[string]struct{})
	switch d := data.(type) {
	case *alertmanagertypes.NotificationTemplateData:
		for k := range d.Labels {
			keys[k] = struct{}{}
		}
		for k := range d.Annotations {
			keys[k] = struct{}{}
		}
	case *alertmanagertypes.AlertData:
		for k := range d.Labels {
			keys[k] = struct{}{}
		}
		for k := range d.Annotations {
			keys[k] = struct{}{}
		}
	}
	return keys
}

// processingResult is the rewritten template and its backing data map,
// ready to be passed to Go text/template's Execute.
type processingResult struct {
	// Template is the input template with $-refs rewritten to Go template
	// syntax and an identifier preamble prepended.
	Template string
	// Data is the flattened map the template indexes into.
	Data map[string]any
	// UnknownVars are $-refs in the input that had no matching data path.
	// They render as "<no value>" at execution; useful for preview warnings.
	UnknownVars map[string]bool
}

// preProcessTemplateAndData prepares a user-authored template and its backing
// struct for Go text/template execution.
//
//	Input (with data *AlertData):
//	    "$rule.name fired with value $alert.value"
//	Output:
//	    "{{ $alert := .alert }}{{ $rule := .rule }}..."
//	    "{{ index . \"rule\" \"name\" }} fired with value {{ index . \"alert\" \"value\" }}"
func preProcessTemplateAndData(tmpl string, data any) (*processingResult, error) {
	unknownVars := make(map[string]bool)
	if tmpl == "" {
		result, err := buildDataMap(data)
		if err != nil {
			return nil, err
		}
		return &processingResult{Data: result, UnknownVars: unknownVars}, nil
	}

	preamble, unknownVars, err := buildPreamble(tmpl, data)
	if err != nil {
		return nil, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "failed to build template preamble")
	}

	// Prepend the preamble so wrapDollarVariables can parse the AST without
	// "undefined variable" errors for $-refs inside action blocks.
	wrapped, err := wrapDollarVariables(preamble+tmpl, structRootSet(data))
	if err != nil {
		return nil, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "failed to rewrite template")
	}

	result, err := buildDataMap(data)
	if err != nil {
		return nil, err
	}

	return &processingResult{Template: wrapped, Data: result, UnknownVars: unknownVars}, nil
}
