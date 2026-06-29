// Package jsonschema holds small reflection helpers shared across packages.
package jsonschema

import (
	"reflect"
	"strings"
)

// JSONFieldNames returns the JSON field names of a struct (or pointer to one),
// skipping fields tagged "-" or without a json tag.
func JSONFieldNames(v any) []string {
	var fields []string

	t := reflect.TypeOf(v)
	if t.Kind() == reflect.Pointer {
		t = t.Elem()
	}

	if t.Kind() != reflect.Struct {
		return fields
	}

	for i := 0; i < t.NumField(); i++ {
		field := t.Field(i)
		jsonTag := field.Tag.Get("json")

		if jsonTag == "" || jsonTag == "-" {
			continue
		}

		fieldName := strings.Split(jsonTag, ",")[0]
		if fieldName != "" {
			fields = append(fields, fieldName)
		}
	}

	return fields
}
