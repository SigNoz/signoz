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
	mappings := extractFieldMappings(data)

	// prepare the variables and their values to use in defintions
	variables := make(map[string]string)
	for _, m := range mappings {
		variables[m.VarName] = fmt.Sprintf(".%s", m.FieldName)
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
		var result map[string]interface{}
		if err := mapstructure.Decode(data, &result); err != nil {
			return nil, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "failed to prepare data for templating")
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
	var result map[string]interface{}
	if err := mapstructure.Decode(data, &result); err != nil {
		return nil, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "failed to prepare data for templating")
	}

	return &ProcessingResult{Template: wrappedTmpl, Data: result, UnknownVars: unknownVars}, nil
}
