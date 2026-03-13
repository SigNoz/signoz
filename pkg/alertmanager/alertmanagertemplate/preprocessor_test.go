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

func TestBuildVariableDefinitions(t *testing.T) {
	type SimpleStruct struct {
		Name   string `json:"name"`
		Status string `json:"status"`
	}

	testCases := []struct {
		name         string
		tmpl         string
		data         any
		expectedVars []string // substrings that must appear in result
		expectError  bool
	}{
		{
			name: "empty template still returns struct field definitions",
			tmpl: "",
			data: SimpleStruct{Name: "test"},
			expectedVars: []string{
				"{{ $name := .Name }}",
				"{{ $status := .Status }}",
			},
		},
		{
			name: "only known vars — no fallback definitions",
			tmpl: "$name is $status",
			data: SimpleStruct{Name: "test", Status: "ok"},
			expectedVars: []string{
				"{{ $name := .Name }}",
				"{{ $status := .Status }}",
			},
		},
		{
			name: "mix of known and unknown vars",
			tmpl: "$name: $custom_label",
			data: SimpleStruct{Name: "test", Status: "ok"},
			expectedVars: []string{
				"{{ $name := .Name }}",
				"{{ $status := .Status }}",
				`{{ $custom_label := "<no value>" }}`,
			},
		},
		{
			name:        "invalid template syntax returns error",
			tmpl:        "{{invalid",
			data:        SimpleStruct{},
			expectError: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result, _, err := buildVariableDefinitions(tc.tmpl, tc.data)
			if tc.expectError {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			if len(tc.expectedVars) == 0 {
				require.Empty(t, result)
				return
			}
			for _, expected := range tc.expectedVars {
				require.Contains(t, result, expected)
			}
		})
	}
}

func TestPreProcessTemplateAndDataA(t *testing.T) {
	testCases := []struct {
		name                     string
		tmpl                     string
		data                     any
		expectedTemplateContains []string
		expectedData             map[string]any
		expectedUnknownVars      map[string]bool
		expectError              bool
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
			expectedTemplateContains: []string{
				"{{$status := .status}}",
				"{{$rule_name := .rule_name}}",
				"{{$rule_id := .rule_id}}",
				"{{$total_firing := .total_firing}}",
				"{{$total_resolved := .total_resolved}}",
				"[{{ .status }}] {{ .rule_name }} (ID: {{ .rule_id }}) - Firing: {{ .total_firing }}, Resolved: {{ .total_resolved }}",
			},
			expectedData: map[string]any{
				"status":         "firing",
				"rule_name":      "HighMemory",
				"rule_id":        "rule-123",
				"total_firing":   3,
				"total_resolved": 1,
			},
			expectedUnknownVars: map[string]bool{},
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
			expectedTemplateContains: []string{
				"{{$rule_name := .rule_name}}",
				"{{$value := .value}}",
				"{{$threshold := .threshold}}",
				"{{$status := .status}}",
				"{{$severity := .severity}}",
				"{{ .rule_name }}: Value {{ .value }} exceeded {{ .threshold }} (Status: {{ .status }}, Severity: {{ .severity }})",
			},
			expectedData: map[string]any{
				"status":    "resolved",
				"rule_name": "DiskFull",
				"rule_id":   "disk-001",
				"severity":  "warning",
				"value":     "85%",
				"threshold": "80%",
			},
			expectedUnknownVars: map[string]bool{},
		},
		{
			name: "mixed dollar and dot notation",
			tmpl: "Alert $rule_name has {{.total_firing}} firing alerts",
			data: NotificationTemplateData{
				AlertName:   "HighCPU",
				TotalFiring: 5,
			},
			expectedTemplateContains: []string{
				"{{$rule_name := .rule_name}}",
				"Alert {{ .rule_name }} has {{.total_firing}} firing alerts",
			},
			expectedData: map[string]any{
				"rule_name":    "HighCPU",
				"total_firing": 5,
			},
			expectedUnknownVars: map[string]bool{},
		},
		{
			name: "empty template",
			tmpl: "",
			data: NotificationTemplateData{Receiver: "slack"},
		},
		{
			name:        "invalid template syntax",
			tmpl:        "{{invalid",
			data:        NotificationTemplateData{},
			expectError: true,
		},
		{
			name: "unknown dollar var in text renders empty",
			tmpl: "alert $custom_note fired",
			data: NotificationTemplateData{AlertName: "HighCPU"},
			expectedTemplateContains: []string{
				`{{$custom_note := "<no value>"}}`,
				"alert {{ .custom_note }} fired",
			},
			expectedUnknownVars: map[string]bool{"custom_note": true},
		},
		{
			name: "unknown dollar var in action block renders empty",
			tmpl: "alert {{ $custom_note }} fired",
			data: NotificationTemplateData{AlertName: "HighCPU"},
			expectedTemplateContains: []string{
				`{{$custom_note := "<no value>"}}`,
				`alert {{$custom_note}} fired`,
			},
			expectedUnknownVars: map[string]bool{"custom_note": true},
		},
		{
			name: "mix of known and unknown vars",
			tmpl: "$rule_name: $custom_label",
			data: NotificationTemplateData{AlertName: "HighCPU"},
			expectedTemplateContains: []string{
				"{{$rule_name := .rule_name}}",
				`{{$custom_label := "<no value>"}}`,
				"{{ .rule_name }}: {{ .custom_label }}",
			},
			expectedData:        map[string]any{"rule_name": "HighCPU"},
			expectedUnknownVars: map[string]bool{"custom_label": true},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result, err := PreProcessTemplateAndData(tc.tmpl, tc.data)

			if tc.expectError {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)

			if tc.tmpl == "" {
				require.Equal(t, "", result.Template)
				return
			}

			for _, substr := range tc.expectedTemplateContains {
				require.Contains(t, result.Template, substr)
			}
			for k, v := range tc.expectedData {
				require.Equal(t, v, result.Data[k])
			}
			if tc.expectedUnknownVars != nil {
				require.Equal(t, tc.expectedUnknownVars, result.UnknownVars)
			}
		})
	}
}
