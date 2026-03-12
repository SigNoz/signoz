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
			FieldName: field.Name,
		})
	}

	return mappings
}

// generateVariableDefinitions creates a Go template prefix string that defines
// variables for each field mapping. For example:
// "{{ $receiver := .Receiver }}{{ $status := .Status }}"
func generateVariableDefinitions(mappings []fieldMapping) string {
	if len(mappings) == 0 {
		return ""
	}

	var sb strings.Builder
	for _, m := range mappings {
		sb.WriteString(fmt.Sprintf("{{ $%s := .%s }}", m.VarName, m.FieldName))
	}
	return sb.String()
}

// PreProcessTemplateAndData prepares a template string and struct data for Go template execution.
//
//	Input:  "$receiver has $rule_name in $status state"
//	Output: "{{ $receiver := .Receiver }}...{{ $receiver }} has {{ $rule_name }} in {{ $status }} state"
func PreProcessTemplateAndData(tmpl string, data any) (string, map[string]interface{}, error) {
	// Handle empty template
	if tmpl == "" {
		var result map[string]interface{}
		if err := mapstructure.Decode(data, &result); err != nil {
			return "", nil, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "failed to decode data to map")
		}
		return "", result, nil
	}

	// Extract field mappings from the struct
	mappings := extractFieldMappings(data)

	// Use mapping to generate variable definitions prefix
	definitions := generateVariableDefinitions(mappings)

	// attach the definitions to the provided template so WrapDollarVariables does not
	// error due to missing variables when parsing go-text-template AST
	finalTmpl := definitions + tmpl

	// Call WrapDollarVariables to transform bare $variable references to go-text-template format
	// with {{ $variable }} syntax from $variable syntax
	wrappedTmpl, err := WrapDollarVariables(finalTmpl)
	if err != nil {
		return "", nil, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "failed to wrap dollar variables")
	}

	// Convert struct to map using mapstructure to be used for template execution
	var result map[string]interface{}
	if err := mapstructure.Decode(data, &result); err != nil {
		return "", nil, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "failed to convert data to map")
	}

	return wrappedTmpl, result, nil
}
