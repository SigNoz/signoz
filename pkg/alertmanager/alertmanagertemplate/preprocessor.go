package alertmanagertemplate

import (
	"fmt"
	"reflect"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/go-viper/mapstructure/v2"
)

// fieldMapping represents a mapping from a JSON tag name to its struct field name.
type fieldMapping struct {
	VarName   string // JSON tag name (e.g., "receiver", "rule_name")
	FieldName string // Struct field name (e.g., "Receiver", "AlertName")
}

// extractFieldMappings uses reflection to extract field mappings from a struct.
func extractFieldMappings(data any) []fieldMapping {
	val := reflect.ValueOf(data)
	// Handle pointer types
	if val.Kind() == reflect.Ptr {
		if val.IsNil() {
			return nil
		}
		val = val.Elem()
	}
	// return nil if the given data is not a struct
	if val.Kind() != reflect.Struct {
		return nil
	}
	typ := val.Type()

	var mappings []fieldMapping
	for i := 0; i < typ.NumField(); i++ {
		field := typ.Field(i)
		// Skip unexported fields
		if !field.IsExported() {
			continue
		}
		// Get JSON tag name
		jsonTag := field.Tag.Get("json")
		if jsonTag == "" || jsonTag == "-" {
			continue
		}
		// Extract the name part (before any comma options like omitempty)
		varName := strings.Split(jsonTag, ",")[0]
		if varName == "" {
			continue
		}
		varFieldName := field.Tag.Get("mapstructure")
		if varFieldName == "" {
			varFieldName = field.Name
		}
		// Skip complex types: slices and interfaces
		kind := field.Type.Kind()
		if kind == reflect.Slice || kind == reflect.Interface {
			continue
		}
		// For struct types, we skip all but with few exceptions like time.Time
		if kind == reflect.Struct {
			// Allow time.Time which is commonly used
			if field.Type.String() != "time.Time" {
				continue
			}
		}

		mappings = append(mappings, fieldMapping{
			VarName:   varName,
			FieldName: varFieldName,
		})
	}

	return mappings
}

// extractNestedFieldsDefinitions extracts the labels, annotations map and adds their keys to template variable definitions
func extractNestedFieldsDefinitions(data any) map[string]string {
	variables := make(map[string]string)

	addLabelsAndAnnotations := func(labels, annotations map[string]string) {
		for k := range annotations {
			variables[k] = fmt.Sprintf("index .annotations \"%s\"", k)
		}
		for k := range labels {
			variables[k] = fmt.Sprintf("index .labels \"%s\"", k)
		}
	}

	switch data := data.(type) {
	case *NotificationTemplateData:
		addLabelsAndAnnotations(data.Labels, data.Annotations)
	case *AlertData:
		addLabelsAndAnnotations(data.Labels, data.Annotations)
	default:
		return variables
	}

	return variables
}

// prepareDataForTemplating prepares the data for templating by adding the labels and annotations values to the resulting map
// so they can be accessed directly from root level, the default values takes precedence over the labels and annotations values
func prepareDataForTemplating(data any) (map[string]interface{}, error) {
	var result map[string]interface{}
	if err := mapstructure.Decode(data, &result); err != nil {
		return nil, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "failed to prepare data for templating")
	}

	addLabelsAndAnnotationsValues := func(labels, annotations map[string]string) {
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
	case *NotificationTemplateData:
		addLabelsAndAnnotationsValues(data.Labels, data.Annotations)
	case *AlertData:
		addLabelsAndAnnotationsValues(data.Labels, data.Annotations)
	default:
		return result, nil
	}

	return result, nil
}

// generateVariableDefinitions creates `{{ $varname := "" }}` declarations for each variable name.
func generateVariableDefinitions(varNames map[string]string) string {
	if len(varNames) == 0 {
		return ""
	}
	var sb strings.Builder
	for name := range varNames {
		fmt.Fprintf(&sb, `{{ $%s := %s }}`, name, varNames[name])
	}
	return sb.String()
}

// buildVariableDefinitions constructs the full variable definition preamble for a template.
// containing all known and unknown variables, the reason to include unknown variables is to
// populate them with "<no value>" in template so go-text-template don't throw errors
// when these variables are used in the template.
func buildVariableDefinitions(tmpl string, data any) (string, map[string]bool, error) {
	// Extract the initial fields from the data struct and add to the definitions
	mappings := extractFieldMappings(data)

	variables := make(map[string]string)
	for _, m := range mappings {
		variables[m.VarName] = fmt.Sprintf(".%s", m.FieldName)
	}

	// Extract the nested fields definitions from the data struct
	// nested fields are all maps that are present in data like labels, annotations, etc.
	// once extracted we add them to the variables map along with the field address
	nestedVariables := extractNestedFieldsDefinitions(data)
	for k, v := range nestedVariables {
		variables[k] = v
	}

	// variables that are used throughout the template
	usedVars, err := ExtractUsedVariables(tmpl)
	if err != nil {
		return "", nil, err
	}

	// Compute unknown variables: used in template but not covered by a field mapping
	probableUnknownVars := make(map[string]bool)
	for name := range usedVars {
		_, ok := variables[name]
		if !ok {
			probableUnknownVars[name] = true
		}
	}

	// Add the remaining variables to the definitions with missing values
	// as "<no value>" indicating that the variable is not available in the data
	for name := range probableUnknownVars {
		variables[name] = `"<no value>"`
	}

	return generateVariableDefinitions(variables), probableUnknownVars, nil
}

type ProcessingResult struct {
	Template string
	Data     map[string]interface{}
	// UnknownVars is the set of possible unknown variables exptracted using regex
	UnknownVars map[string]bool
}

// PreProcessTemplateAndData prepares a template string and struct data for Go template execution.
//
//	Input:  "$receiver has $rule_name in $status state"
//	Output: "{{ $receiver := .Receiver }}...{{ $receiver }} has {{ $rule_name }} in {{ $status }} state"
func PreProcessTemplateAndData(tmpl string, data any) (*ProcessingResult, error) {
	// Handle empty template
	unknownVars := make(map[string]bool)
	if tmpl == "" {
		result, err := prepareDataForTemplating(data)
		if err != nil {
			return nil, err
		}
		return &ProcessingResult{Data: result, UnknownVars: unknownVars}, nil
	}

	// Build variable definitions: known struct fields + fallback empty-string declarations
	definitions, unknownVars, err := buildVariableDefinitions(tmpl, data)
	if err != nil {
		return nil, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "failed to build template definitions")
	}

	// Attach definitions prefix so WrapDollarVariables can parse the AST without "undefined variable" errors.
	finalTmpl := definitions + tmpl

	// Call WrapDollarVariables to transform bare $variable references to go-text-template format
	// with {{ $variable }} syntax from $variable syntax
	wrappedTmpl, err := WrapDollarVariables(finalTmpl)
	if err != nil {
		return nil, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "failed to prepare template for templating")
	}

	// Convert struct to map using mapstructure to be used for template execution
	result, err := prepareDataForTemplating(data)
	if err != nil {
		return nil, err
	}

	return &ProcessingResult{Template: wrappedTmpl, Data: result, UnknownVars: unknownVars}, nil
}
