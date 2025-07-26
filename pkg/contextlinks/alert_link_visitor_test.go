package contextlinks

import (
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
)

func TestPrepareFiltersV5(t *testing.T) {
	tests := []struct {
		name         string
		labels       map[string]string
		whereClause  string
		groupByItems []qbtypes.GroupByKey
		expected     string
		description  string
	}{
		{
			name:         "empty_inputs",
			labels:       map[string]string{},
			whereClause:  "",
			groupByItems: []qbtypes.GroupByKey{},
			expected:     "",
			description:  "Should return empty string for empty inputs",
		},
		{
			name:        "no_label_replacement",
			labels:      map[string]string{},
			whereClause: "service.name = 'serviceB'",
			groupByItems: []qbtypes.GroupByKey{
				{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service.name"}},
			},
			expected:    "service.name='serviceB'",
			description: "No change",
		},
		{
			name: "in_clause_replacement",
			labels: map[string]string{
				"severity_text": "WARN",
			},
			whereClause: "severity_text IN ('WARN', 'ERROR')",
			groupByItems: []qbtypes.GroupByKey{
				{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "severity_text"}},
			},
			expected:    "severity_text='WARN'",
			description: "Should replace IN clause with actual value when key is in group by",
		},
		{
			name: "missing_label_addition", // case 2
			labels: map[string]string{
				"service.name": "serviceA",
			},
			whereClause: "status_code > 400",
			groupByItems: []qbtypes.GroupByKey{
				{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service.name"}},
			},
			expected:    "(status_code>400) AND service.name='serviceA'",
			description: "Should add missing labels from labels map",
		},
		{
			name: "multiple_missing_labels",
			labels: map[string]string{
				"service.name": "serviceA",
				"region":       "us-east-1",
			},
			whereClause: "status_code > 400",
			groupByItems: []qbtypes.GroupByKey{
				{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service.name"}},
				{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "region"}},
			},
			expected:    "(status_code>400) AND region='us-east-1' AND service.name='serviceA'",
			description: "Should add all missing labels",
		},
		{
			name: "complex_where_clause",
			labels: map[string]string{
				"service.name": "serviceA",
			},
			whereClause: "(status_code > 400 OR status_code < 200) AND method = 'GET'",
			groupByItems: []qbtypes.GroupByKey{
				{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service.name"}},
			},
			expected:    "((status_code>400 OR status_code<200) AND method='GET') AND service.name='serviceA'",
			description: "Should preserve complex boolean logic and add missing labels",
		},
		{
			name: "label_not_in_group_by",
			labels: map[string]string{
				"service.name": "serviceA",
			},
			whereClause: "service.name = 'serviceB'",
			groupByItems: []qbtypes.GroupByKey{
				{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "region"}}, // service.name not in group by
			},
			expected:    "service.name='serviceB'",
			description: "Should not replace label if not in group by items",
		},
		{
			name: "special_characters_in_values",
			labels: map[string]string{
				"message": "Error: Connection failed",
				"path":    "/api/v1/users",
			},
			whereClause: "",
			groupByItems: []qbtypes.GroupByKey{
				{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "message"}},
				{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "path"}},
			},
			expected:    "message='Error: Connection failed' AND path='/api/v1/users'",
			description: "Should quote values with special characters",
		},
		{
			name: "numeric_and_boolean_values",
			labels: map[string]string{
				"count":     "42",
				"isEnabled": "true",
			},
			whereClause: "",
			groupByItems: []qbtypes.GroupByKey{
				{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "count"}},
				{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "isEnabled"}},
			},
			expected:    "count=42 AND isEnabled=true",
			description: "Should not quote numeric and boolean values",
		},

		{
			name: "like_operator",
			labels: map[string]string{
				"path": "/api/users",
			},
			whereClause: "path LIKE '/api%'",
			groupByItems: []qbtypes.GroupByKey{
				{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "path"}},
			},
			expected:    "path='/api/users'",
			description: "Should replace LIKE comparisons when key is in group by",
		},

		{
			name: "not_operators",
			labels: map[string]string{
				"status": "active",
			},
			whereClause: "status NOT IN ('deleted', 'archived')",
			groupByItems: []qbtypes.GroupByKey{
				{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "status"}},
			},
			expected:    "status='active'",
			description: "Should replace NOT IN clause when key is in group by",
		},

		{
			name: "between_operator",
			labels: map[string]string{
				"response_time": "250",
			},
			whereClause: "response_time BETWEEN 100 AND 500",
			groupByItems: []qbtypes.GroupByKey{
				{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "response_time"}},
			},
			expected:    "response_time=250",
			description: "Should replace BETWEEN clause when key is in group by",
		},

		{
			name: "function_calls",
			labels: map[string]string{
				"service.name": "serviceA",
			},
			whereClause: "has(tags, 'production')",
			groupByItems: []qbtypes.GroupByKey{
				{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service.name"}},
			},
			expected:    "(has(tags, 'production')) AND service.name='serviceA'",
			description: "Should preserve function calls and add missing labels",
		},
		{
			name: "already_quoted_values",
			labels: map[string]string{
				"message": "\"Error message\"",
				"tag":     "'production'",
			},
			whereClause: "",
			groupByItems: []qbtypes.GroupByKey{
				{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "message"}},
				{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "tag"}},
			},
			expected:    "message='\"Error message\"' AND tag='\\'production\\''",
			description: "Should not double-quote already quoted values",
		},

		{
			name: "mixed_replacement_and_addition",
			labels: map[string]string{
				"service.name":  "serviceA",
				"severity_text": "ERROR",
				"region":        "us-west-2",
			},
			whereClause: "severity_text IN ('WARN', 'ERROR') AND status_code > 400",
			groupByItems: []qbtypes.GroupByKey{
				{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service.name"}},
				{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "severity_text"}},
				{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "region"}},
			},
			expected:    "(severity_text='ERROR' AND status_code>400) AND region='us-west-2' AND service.name='serviceA'",
			description: "Should both replace existing labels and add missing ones",
		},

		{
			name: "implicit_and_handling",
			labels: map[string]string{
				"env": "production",
			},
			whereClause: "status_code=200 method='GET'", // implicit AND
			groupByItems: []qbtypes.GroupByKey{
				{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "env"}},
			},
			expected:    "(status_code=200 AND method='GET') AND env='production'",
			description: "Should handle implicit AND between expressions",
		},

		{
			name: "exists_operator",
			labels: map[string]string{
				"service.name": "serviceA",
			},
			whereClause: "error_details EXISTS",
			groupByItems: []qbtypes.GroupByKey{
				{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service.name"}},
			},
			expected:    "(error_details EXISTS) AND service.name='serviceA'",
			description: "Should preserve EXISTS operator",
		},

		{
			name: "empty_where_clause_with_labels",
			labels: map[string]string{
				"service.name": "serviceA",
				"region":       "us-east-1",
			},
			whereClause: "",
			groupByItems: []qbtypes.GroupByKey{
				{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service.name"}},
				{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "region"}},
			},
			expected:    "region='us-east-1' AND service.name='serviceA'",
			description: "Should create where clause from labels when original is empty",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := PrepareFilterExpression(tt.labels, tt.whereClause, tt.groupByItems)
			assert.Equal(t, tt.expected, result, tt.description)
		})
	}
}
