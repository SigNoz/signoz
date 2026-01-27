package querybuilder

import (
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
)

func TestAdjustDuplicateKeys(t *testing.T) {
	tests := []struct {
		name            string
		query           qbtypes.QueryBuilderQuery[any]
		expectedQuery   qbtypes.QueryBuilderQuery[any]
		expectedActions []string
		description     string
	}{
		{
			name: "no duplicates - should remain unchanged",
			query: qbtypes.QueryBuilderQuery[any]{
				SelectFields: []telemetrytypes.TelemetryFieldKey{
					{Name: "field1", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString},
					{Name: "field2", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeNumber},
				},
				GroupBy: []qbtypes.GroupByKey{
					{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "field3", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString}},
				},
				Order: []qbtypes.OrderBy{
					{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "field4", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeNumber}}},
				},
			},
			expectedQuery: qbtypes.QueryBuilderQuery[any]{
				SelectFields: []telemetrytypes.TelemetryFieldKey{
					{Name: "field1", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString},
					{Name: "field2", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeNumber},
				},
				GroupBy: []qbtypes.GroupByKey{
					{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "field3", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString}},
				},
				Order: []qbtypes.OrderBy{
					{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "field4", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeNumber}}},
				},
			},
			expectedActions: []string{},
			description:     "No duplicate keys - fields should remain unchanged",
		},
		{
			name: "duplicate in SelectFields with different context",
			query: qbtypes.QueryBuilderQuery[any]{
				SelectFields: []telemetrytypes.TelemetryFieldKey{
					{Name: "duration", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeNumber},
					{Name: "duration", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeNumber},
				},
			},
			expectedQuery: qbtypes.QueryBuilderQuery[any]{
				SelectFields: []telemetrytypes.TelemetryFieldKey{
					{Name: "duration", FieldContext: telemetrytypes.FieldContextUnspecified, FieldDataType: telemetrytypes.FieldDataTypeNumber},
				},
				GroupBy: []qbtypes.GroupByKey{},
				Order:   []qbtypes.OrderBy{},
			},
			expectedActions: []string{
				"Removed field context from name=duration,context=attribute,datatype=number for duplicate key name=duration,context=resource,datatype=number",
				"Skipped duplicate SelectField key name=duration,context=resource,datatype=number",
			},
			description: "Duplicate key with different context should be merged with unspecified context",
		},
		{
			name: "duplicate in SelectFields with different data type",
			query: qbtypes.QueryBuilderQuery[any]{
				SelectFields: []telemetrytypes.TelemetryFieldKey{
					{Name: "value", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString},
					{Name: "value", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeNumber},
				},
			},
			expectedQuery: qbtypes.QueryBuilderQuery[any]{
				SelectFields: []telemetrytypes.TelemetryFieldKey{
					{Name: "value", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeUnspecified},
				},
				GroupBy: []qbtypes.GroupByKey{},
				Order:   []qbtypes.OrderBy{},
			},
			expectedActions: []string{
				"Removed field data type from name=value,context=attribute,datatype=string for duplicate key name=value,context=attribute,datatype=number",
				"Skipped duplicate SelectField key name=value,context=attribute,datatype=number",
			},
			description: "Duplicate key with different data type should be merged with unspecified data type",
		},
		{
			name: "duplicate in SelectFields with different context and data type",
			query: qbtypes.QueryBuilderQuery[any]{
				SelectFields: []telemetrytypes.TelemetryFieldKey{
					{Name: "field", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString},
					{Name: "field", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeNumber},
				},
			},
			expectedQuery: qbtypes.QueryBuilderQuery[any]{
				SelectFields: []telemetrytypes.TelemetryFieldKey{
					{Name: "field", FieldContext: telemetrytypes.FieldContextUnspecified, FieldDataType: telemetrytypes.FieldDataTypeUnspecified},
				},
				GroupBy: []qbtypes.GroupByKey{},
				Order:   []qbtypes.OrderBy{},
			},
			expectedActions: []string{
				"Removed field context from name=field,context=attribute,datatype=string for duplicate key name=field,context=resource,datatype=number",
				"Removed field data type from name=field,datatype=string for duplicate key name=field,context=resource,datatype=number",
				"Skipped duplicate SelectField key name=field,context=resource,datatype=number",
			},
			description: "Duplicate key with different context and data type should be merged with both unspecified",
		},
		{
			name: "duplicate across SelectFields and GroupBy",
			query: qbtypes.QueryBuilderQuery[any]{
				SelectFields: []telemetrytypes.TelemetryFieldKey{
					{Name: "service", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString},
				},
				GroupBy: []qbtypes.GroupByKey{
					{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeString}},
				},
			},
			expectedQuery: qbtypes.QueryBuilderQuery[any]{
				SelectFields: []telemetrytypes.TelemetryFieldKey{
					{Name: "service", FieldContext: telemetrytypes.FieldContextUnspecified, FieldDataType: telemetrytypes.FieldDataTypeString},
				},
				GroupBy: []qbtypes.GroupByKey{
					{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service", FieldContext: telemetrytypes.FieldContextUnspecified, FieldDataType: telemetrytypes.FieldDataTypeString}},
				},
				Order: []qbtypes.OrderBy{},
			},
			expectedActions: []string{
				"Removed field context from name=service,context=attribute,datatype=string for duplicate key name=service,context=resource,datatype=string",
			},
			description: "Duplicate across SelectFields and GroupBy with different context should be merged",
		},
		{
			name: "duplicate across SelectFields, GroupBy, and OrderBy",
			query: qbtypes.QueryBuilderQuery[any]{
				SelectFields: []telemetrytypes.TelemetryFieldKey{
					{Name: "timestamp", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeNumber},
				},
				GroupBy: []qbtypes.GroupByKey{
					{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "timestamp", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeNumber}},
				},
				Order: []qbtypes.OrderBy{
					{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "timestamp", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString}}},
				},
			},
			expectedQuery: qbtypes.QueryBuilderQuery[any]{
				SelectFields: []telemetrytypes.TelemetryFieldKey{
					{Name: "timestamp", FieldContext: telemetrytypes.FieldContextUnspecified, FieldDataType: telemetrytypes.FieldDataTypeUnspecified},
				},
				GroupBy: []qbtypes.GroupByKey{
					{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "timestamp", FieldContext: telemetrytypes.FieldContextUnspecified, FieldDataType: telemetrytypes.FieldDataTypeUnspecified}},
				},
				Order: []qbtypes.OrderBy{
					{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "timestamp", FieldContext: telemetrytypes.FieldContextUnspecified, FieldDataType: telemetrytypes.FieldDataTypeUnspecified}}},
				},
			},
			expectedActions: []string{
				"Removed field context from name=timestamp,context=attribute,datatype=number for duplicate key name=timestamp,context=resource,datatype=number",
				"Removed field data type from name=timestamp,datatype=number for duplicate key name=timestamp,context=attribute,datatype=string",
			},
			description: "Duplicate across all three sections with different contexts and data types should be fully merged",
		},
		{
			name: "multiple duplicates in OrderBy - keeps first occurrence",
			query: qbtypes.QueryBuilderQuery[any]{
				Order: []qbtypes.OrderBy{
					{
						Key:       qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "field", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString}},
						Direction: qbtypes.OrderDirectionAsc,
					},
					{
						Key:       qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "field", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeString}},
						Direction: qbtypes.OrderDirectionDesc,
					},
				},
			},
			expectedQuery: qbtypes.QueryBuilderQuery[any]{
				SelectFields: []telemetrytypes.TelemetryFieldKey{},
				GroupBy:      []qbtypes.GroupByKey{},
				Order: []qbtypes.OrderBy{
					{
						Key:       qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "field", FieldContext: telemetrytypes.FieldContextUnspecified, FieldDataType: telemetrytypes.FieldDataTypeString}},
						Direction: qbtypes.OrderDirectionAsc,
					},
				},
			},
			expectedActions: []string{
				"Removed field context from name=field,context=attribute,datatype=string for duplicate key name=field,context=resource,datatype=string",
				"Skipped duplicate OrderBy key name=field,context=resource,datatype=string",
			},
			description: "Multiple OrderBy on same key keeps first occurrence and merges contexts",
		},
		{
			name: "three duplicate entries in SelectFields",
			query: qbtypes.QueryBuilderQuery[any]{
				SelectFields: []telemetrytypes.TelemetryFieldKey{
					{Name: "status", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString},
					{Name: "status", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeString},
					{Name: "status", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeNumber},
				},
			},
			expectedQuery: qbtypes.QueryBuilderQuery[any]{
				SelectFields: []telemetrytypes.TelemetryFieldKey{
					{Name: "status", FieldContext: telemetrytypes.FieldContextUnspecified, FieldDataType: telemetrytypes.FieldDataTypeUnspecified},
				},
				GroupBy: []qbtypes.GroupByKey{},
				Order:   []qbtypes.OrderBy{},
			},
			expectedActions: []string{
				"Removed field context from name=status,context=attribute,datatype=string for duplicate key name=status,context=resource,datatype=string",
				"Removed field data type from name=status,datatype=string for duplicate key name=status,context=attribute,datatype=number",
				"Skipped duplicate SelectField key name=status,context=resource,datatype=string",
				"Skipped duplicate SelectField key name=status,context=attribute,datatype=number",
			},
			description: "Three duplicate entries with various differences should be fully merged",
		},
		{
			name: "duplicate entries in GroupBy",
			query: qbtypes.QueryBuilderQuery[any]{
				GroupBy: []qbtypes.GroupByKey{
					{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "status", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString}},
					{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "status", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeNumber}},
				},
			},
			expectedQuery: qbtypes.QueryBuilderQuery[any]{
				SelectFields: []telemetrytypes.TelemetryFieldKey{},
				GroupBy: []qbtypes.GroupByKey{
					{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "status", FieldContext: telemetrytypes.FieldContextUnspecified, FieldDataType: telemetrytypes.FieldDataTypeUnspecified}},
				},
				Order: []qbtypes.OrderBy{},
			},
			expectedActions: []string{
				"Removed field context from name=status,context=attribute,datatype=string for duplicate key name=status,context=resource,datatype=number",
				"Removed field data type from name=status,datatype=string for duplicate key name=status,context=resource,datatype=number",
				"Skipped duplicate GroupBy key name=status,context=resource,datatype=number",
			},
			description: "Duplicate entries in GroupBy with different context should be merged",
		},
		{
			name:  "empty query",
			query: qbtypes.QueryBuilderQuery[any]{},
			expectedQuery: qbtypes.QueryBuilderQuery[any]{
				SelectFields: []telemetrytypes.TelemetryFieldKey{},
				GroupBy:      []qbtypes.GroupByKey{},
				Order:        []qbtypes.OrderBy{},
			},
			expectedActions: []string{},
			description:     "Empty query should result in empty slices",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Make a copy to avoid modifying the original
			query := tt.query
			actions := AdjustDuplicateKeys(&query)

			assert.Equal(t, tt.expectedQuery.SelectFields, query.SelectFields, "SelectFields mismatch: %s", tt.description)
			assert.Equal(t, tt.expectedQuery.GroupBy, query.GroupBy, "GroupBy mismatch: %s", tt.description)
			assert.Equal(t, tt.expectedQuery.Order, query.Order, "Order mismatch: %s", tt.description)
			assert.Equal(t, tt.expectedActions, actions, "Actions mismatch: %s", tt.description)
		})
	}
}

func TestAdjustKey(t *testing.T) {
	tests := []struct {
		name                       string
		key                        telemetrytypes.TelemetryFieldKey
		keys                       map[string][]*telemetrytypes.TelemetryFieldKey
		intrinsicOrCalculatedField *telemetrytypes.TelemetryFieldKey
		expectedKey                telemetrytypes.TelemetryFieldKey
		expectedActions            []string
		description                string
	}{
		{
			name: "intrinsic field with no matching attribute/resource key",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "trace_id", // User provided key "trace_id" with no context or data type
				FieldContext:  telemetrytypes.FieldContextUnspecified,
				FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
			},
			keys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"trace_id": { // This is the intrinsic field itself in the keys map
					&telemetrytypes.TelemetryFieldKey{
						Name:          "trace_id",
						FieldContext:  telemetrytypes.FieldContextLog,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			intrinsicOrCalculatedField: &telemetrytypes.TelemetryFieldKey{
				Name:          "trace_id",
				FieldContext:  telemetrytypes.FieldContextLog,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			expectedKey: telemetrytypes.TelemetryFieldKey{
				Name:          "trace_id",
				FieldContext:  telemetrytypes.FieldContextLog,     // Use intrinsic field context
				FieldDataType: telemetrytypes.FieldDataTypeString, // Use intrinsic field data type
			},
			expectedActions: []string{
				"Overriding key: name=trace_id to name=trace_id,context=log,datatype=string",
			},
			description: "Intrinsic field with no attribute.resource key match should use intrinsic field properties",
		},
		{
			name: "intrinsic field with matching attribute/resource key",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "trace_id", // User provided key "trace_id" with no context or data type
				FieldContext:  telemetrytypes.FieldContextUnspecified,
				FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
			},
			keys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"trace_id": {
					{
						Name:          "trace_id", // This is an attribute key matching the intrinsic field name
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
						Materialized:  true,
					},
					{
						Name:          "trace_id", // This is the intrinsic field itself in the keys map
						FieldContext:  telemetrytypes.FieldContextLog,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			intrinsicOrCalculatedField: &telemetrytypes.TelemetryFieldKey{
				Name:          "trace_id",
				FieldContext:  telemetrytypes.FieldContextLog,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			expectedKey: telemetrytypes.TelemetryFieldKey{
				Name:          "trace_id",
				FieldContext:  telemetrytypes.FieldContextUnspecified, // This is left unspecified due to ambiguity
				FieldDataType: telemetrytypes.FieldDataTypeString,     // This is set to string as both have same type
				Materialized:  false,
			},
			expectedActions: []string{"Adjusting key name=trace_id to have data type string"},
			description:     "Intrinsic field with attribute key match should set data type to string since both in both intrinsic and attribute have same type (ambiguous case)",
		},
		{
			name: "non-intrinsic field with single matching attribute key",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "custom_field",
				FieldContext:  telemetrytypes.FieldContextUnspecified,
				FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
			},
			keys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"custom_field": {
					{
						Name:          "custom_field",
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
						Materialized:  true,
					},
				},
			},
			intrinsicOrCalculatedField: nil,
			expectedKey: telemetrytypes.TelemetryFieldKey{
				Name:          "custom_field",
				FieldContext:  telemetrytypes.FieldContextAttribute, // Use attribute field context
				FieldDataType: telemetrytypes.FieldDataTypeString,   // Use attribute field data type
				Materialized:  true,
			},
			expectedActions: []string{
				"Adjusting key name=custom_field to name=custom_field,context=attribute,datatype=string,materialized=true",
			},
			description: "Single matching attribute key should use its properties",
		},
		{
			name: "non-intrinsic field with attribute prefix as matching key",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "custom_field",
				FieldContext:  telemetrytypes.FieldContextLog,
				FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
			},
			keys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"log.custom_field": {
					{
						Name:          "log.custom_field",
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
						Materialized:  true,
					},
				},
			},
			intrinsicOrCalculatedField: nil,
			expectedKey: telemetrytypes.TelemetryFieldKey{
				Name:          "log.custom_field",
				FieldContext:  telemetrytypes.FieldContextAttribute, // Use attribute field context
				FieldDataType: telemetrytypes.FieldDataTypeString,   // Use attribute field data type
				Materialized:  true,
			},
			expectedActions: []string{
				"Adjusting key name=custom_field,context=log to name=log.custom_field,context=attribute,datatype=string,materialized=true",
			},
			description: "Single matching attribute key should use its properties",
		},
		{
			name: "non-intrinsic field with no matching attribute keys",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "unknown_field",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			keys:                       map[string][]*telemetrytypes.TelemetryFieldKey{},
			intrinsicOrCalculatedField: nil,
			expectedKey: telemetrytypes.TelemetryFieldKey{
				Name:          "unknown_field",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
				Materialized:  false,
			},
			expectedActions: []string{},
			description:     "No matching attribute keys should set materialized to false",
		},
		{
			name: "multiple matching keys with different contexts",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "field", // User provided key "field" with no context and string data type
				FieldContext:  telemetrytypes.FieldContextUnspecified,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			keys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"field": {
					{
						Name:          "field", // Attribute context
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
						Materialized:  true,
					},
					{
						Name:          "field", // Resource context
						FieldContext:  telemetrytypes.FieldContextResource,
						FieldDataType: telemetrytypes.FieldDataTypeString,
						Materialized:  true,
					},
				},
			},
			intrinsicOrCalculatedField: nil,
			expectedKey: telemetrytypes.TelemetryFieldKey{
				Name:          "field",
				FieldContext:  telemetrytypes.FieldContextUnspecified, // Too ambiguous to set context
				FieldDataType: telemetrytypes.FieldDataTypeString,     // Both have same data type
				Materialized:  true,
			},
			expectedActions: []string{},
			description:     "Multiple matching keys with different contexts should keep context unspecified but data type specified",
		},
		{
			name: "multiple matching keys with different data types",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "field",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
			},
			keys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"field": {
					{
						Name:          "field",
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
						Materialized:  true,
					},
					{
						Name:          "field",
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeNumber,
						Materialized:  true,
					},
				},
			},
			intrinsicOrCalculatedField: nil,
			expectedKey: telemetrytypes.TelemetryFieldKey{
				Name:          "field",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
				Materialized:  true,
			},
			expectedActions: []string{},
			description:     "Multiple matching keys with different data types should keep data type unspecified but context specified",
		},
		{
			name: "specific context filters matching keys",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "field",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
			},
			keys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"field": {
					{
						Name:          "field",
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
						Materialized:  true,
					},
					{
						Name:          "field",
						FieldContext:  telemetrytypes.FieldContextResource,
						FieldDataType: telemetrytypes.FieldDataTypeString,
						Materialized:  false,
					},
				},
			},
			intrinsicOrCalculatedField: nil,
			expectedKey: telemetrytypes.TelemetryFieldKey{
				Name:          "field",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
				Materialized:  true,
			},
			expectedActions: []string{
				"Adjusting key name=field,context=attribute to name=field,context=attribute,datatype=string,materialized=true",
			},
			description: "Specific context should filter to matching keys only",
		},
		{
			name: "specific data type filters matching keys",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "field",
				FieldContext:  telemetrytypes.FieldContextUnspecified,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			keys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"field": {
					{
						Name:          "field",
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
						Materialized:  true,
					},
					{
						Name:          "field",
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeNumber,
						Materialized:  false,
					},
				},
			},
			intrinsicOrCalculatedField: nil,
			expectedKey: telemetrytypes.TelemetryFieldKey{
				Name:          "field",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
				Materialized:  true,
			},
			expectedActions: []string{
				"Adjusting key name=field,datatype=string to name=field,context=attribute,datatype=string,materialized=true",
			},
			description: "Specific data type should filter to matching keys only",
		},
		{
			name: "intrinsic field with explicit different context matches metadata",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "duration",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
			},
			keys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"duration": {
					{
						Name:          "duration", // This is an attribute key matching the intrinsic field name
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeNumber,
						Materialized:  false,
					},
					{
						Name:          "duration", // This is the intrinsic field itself in the keys map
						FieldContext:  telemetrytypes.FieldContextSpan,
						FieldDataType: telemetrytypes.FieldDataTypeNumber,
						Materialized:  true,
					},
				},
			},
			intrinsicOrCalculatedField: &telemetrytypes.TelemetryFieldKey{
				Name:          "duration",
				FieldContext:  telemetrytypes.FieldContextSpan,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
				Materialized:  true,
			},
			expectedKey: telemetrytypes.TelemetryFieldKey{
				Name:          "duration",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
				Materialized:  false,
			},
			expectedActions: []string{"Adjusting key name=duration,context=attribute to name=duration,context=attribute,datatype=number"},
			description:     "User explicitly specified attribute.duration, should prefer metadata over intrinsic",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			key := tt.key
			actions := AdjustKey(&key, tt.keys, tt.intrinsicOrCalculatedField)

			assert.Equal(t, tt.expectedKey.Name, key.Name, "Name mismatch: %s", tt.description)
			assert.Equal(t, tt.expectedKey.FieldContext, key.FieldContext, "FieldContext mismatch: %s", tt.description)
			assert.Equal(t, tt.expectedKey.FieldDataType, key.FieldDataType, "FieldDataType mismatch: %s", tt.description)
			assert.Equal(t, tt.expectedKey.Materialized, key.Materialized, "Materialized mismatch: %s", tt.description)
			assert.Equal(t, tt.expectedActions, actions, "Actions mismatch: %s", tt.description)
		})
	}
}
