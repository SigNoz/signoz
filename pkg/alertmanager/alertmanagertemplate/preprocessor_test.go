package alertmanagertemplate

import (
	"testing"
	"time"

	test "github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/alertmanagernotifytest"
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
			tmpl: "Alert $rule_name has {{.total_firing}} firing alerts",
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
		{
			name:     "unknown dollar var in text renders empty",
			tmpl:     "alert $custom_note fired",
			data:     NotificationTemplateData{AlertName: "HighCPU"},
			expected: "alert <no value> fired",
		},
		{
			name:     "unknown dollar var in action block renders empty",
			tmpl:     "alert {{ $custom_note }} fired",
			data:     NotificationTemplateData{AlertName: "HighCPU"},
			expected: "alert <no value> fired",
		},
		{
			name:     "mix of known and unknown vars",
			tmpl:     "$rule_name: $custom_label",
			data:     NotificationTemplateData{AlertName: "HighCPU"},
			expected: "HighCPU: <no value>",
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

			goTmpl := test.CreateTmpl(t)
			res, err := goTmpl.ExecuteTextString(result.Template, result.Data)
			if err != nil {
				t.Fatal(err)
				return
			}

			require.Equal(t, tc.expected, res)
		})
	}
}
