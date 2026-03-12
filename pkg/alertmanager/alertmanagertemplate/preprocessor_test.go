package alertmanagertemplate

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestExtractFieldMappings(t *testing.T) {
	// Struct with various field types to test extraction logic
	type TestStruct struct {
		Name       string    `json:"name"`
		Status     string    `json:"status"`
		Count      int       `json:"count"`
		IsActive   bool      `json:"is_active"`
		CreatedAt  time.Time `json:"created_at"` // time.Time allowed
		Items      []string  `json:"items"`      // slice skipped
		unexported string    // unexported skipped (no tag needed)
		NoTag      string    // no json tag skipped
		SkippedTag string    `json:"-"` // json:"-" skipped
	}

	testCases := []struct {
		name     string
		data     any
		expected []fieldMapping
	}{
		{
			name: "struct with mixed field types",
			data: TestStruct{Name: "test", Count: 5, unexported: ""},
			expected: []fieldMapping{
				{VarName: "name", FieldName: "Name"},
				{VarName: "status", FieldName: "Status"},
				{VarName: "count", FieldName: "Count"},
				{VarName: "is_active", FieldName: "IsActive"},
				{VarName: "created_at", FieldName: "CreatedAt"},
			},
		},
		{
			name:     "nil data",
			data:     nil,
			expected: nil,
		},
		{
			name:     "non-struct type",
			data:     "string",
			expected: nil,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := extractFieldMappings(tc.data)
			require.Equal(t, tc.expected, result)
		})
	}
}

func TestGenerateVariableDefinitions(t *testing.T) {
	testCases := []struct {
		name     string
		mappings []fieldMapping
		expected string
	}{
		{
			name:     "empty mappings",
			mappings: nil,
			expected: "",
		},
		{
			name: "single mapping",
			mappings: []fieldMapping{
				{VarName: "name", FieldName: "Name"},
			},
			expected: "{{ $name := .Name }}",
		},
		{
			name: "multiple mappings",
			mappings: []fieldMapping{
				{VarName: "receiver", FieldName: "Receiver"},
				{VarName: "status", FieldName: "Status"},
				{VarName: "rule_name", FieldName: "AlertName"},
			},
			expected: "{{ $receiver := .Receiver }}{{ $status := .Status }}{{ $rule_name := .AlertName }}",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := generateVariableDefinitions(tc.mappings)
			require.Equal(t, tc.expected, result)
		})
	}
}

func TestPreProcessTemplateAndData(t *testing.T) {
	testCases := []struct {
		name        string
		tmpl        string
		data        any
		expected    string
		expectError bool
	}{
		{
			name: "NotificationTemplateData with dollar variables",
			tmpl: "[$status] $rule_name (ID: $rule_id) - Firing: $total_firing, Resolved: $total_resolved",
			data: NotificationTemplateData{
				Receiver:      "pagerduty",
				Status:        "firing",
				AlertName:     "HighMemory",
				RuleID:        "rule-123",
				TotalFiring:   3,
				TotalResolved: 1,
			},
			expected: "[firing] HighMemory (ID: rule-123) - Firing: 3, Resolved: 1",
		},
		{
			name: "AlertData with dollar variables",
			tmpl: "$rule_name: Value $value exceeded $threshold (Status: $status, Severity: $severity)",
			data: AlertData{
				Receiver:   "webhook",
				Status:     "resolved",
				AlertName:  "DiskFull",
				RuleID:     "disk-001",
				Severity:   "warning",
				Value:      "85%",
				Threshold:  "80%",
				IsFiring:   false,
				IsResolved: true,
			},
			expected: "DiskFull: Value 85% exceeded 80% (Status: resolved, Severity: warning)",
		},
		{
			name: "mixed dollar and dot notation",
			tmpl: "Alert $rule_name has {{.TotalFiring}} firing alerts",
			data: NotificationTemplateData{
				AlertName:   "HighCPU",
				TotalFiring: 5,
			},
			expected: "Alert HighCPU has 5 firing alerts",
		},
		{
			name:     "empty template",
			tmpl:     "",
			data:     NotificationTemplateData{Receiver: "slack"},
			expected: "",
		},
		{
			name:        "invalid template syntax",
			tmpl:        "{{invalid",
			data:        NotificationTemplateData{},
			expectError: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			processedTmpl, mapData, err := PreProcessTemplateAndData(tc.tmpl, tc.data)

			if tc.expectError {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)

			if tc.tmpl == "" {
				require.Equal(t, "", processedTmpl)
				return
			}

			goTmpl, _, _ := testSetup(t)
			res, err := goTmpl.ExecuteTextString(processedTmpl, mapData)
			if err != nil {
				require.Error(t, err)
				return
			}

			require.Equal(t, tc.expected, res)
		})
	}
}
