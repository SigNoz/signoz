package alertmanagertemplate

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestWrapBareVars(t *testing.T) {
	testCases := []struct {
		name        string
		input       string
		expected    string
		expectError bool
	}{
		{
			name:     "mixed variables with actions",
			input:    "$name is {{.Status}}",
			expected: "{{ .name }} is {{.Status}}",
		},
		{
			name: "nested variables in range",
			input: `{{range .items}}
					$title
					{{end}}`,
			expected: `{{range .items}}
					{{ .title }}
					{{end}}`,
		},
		{
			name:     "nested variables in if else",
			input:    "{{if .ok}}$a{{else}}$b{{end}}",
			expected: "{{if .ok}}{{ .a }}{{else}}{{ .b }}{{end}}",
		},
		// Labels prefix: index into .labels map
		{
			name:     "labels variables prefix simple",
			input:    "$labels.service",
			expected: `{{ index .labels "service" }}`,
		},
		{
			name:     "labels variables prefix nested with multiple dots",
			input:    "$labels.http.status",
			expected: `{{ index .labels "http.status" }}`,
		},
		{
			name:     "multiple labels variables simple and nested",
			input:    "$labels.service and $labels.instance.id",
			expected: `{{ index .labels "service" }} and {{ index .labels "instance.id" }}`,
		},
		// Annotations prefix: index into .annotations map
		{
			name:     "annotations variables prefix simple",
			input:    "$annotations.summary",
			expected: `{{ index .annotations "summary" }}`,
		},
		{
			name:     "annotations variables prefix nested with multiple dots",
			input:    "$annotations.alert.url",
			expected: `{{ index .annotations "alert.url" }}`,
		},
		// Struct-root paths: walk segment-by-segment via chained index.
		{
			name:     "struct-root dotted path walks via chained index",
			input:    "$alert.is_firing",
			expected: `{{ index . "alert" "is_firing" }}`,
		},
		{
			name:     "deeply nested struct-root path",
			input:    "$rule.threshold.value",
			expected: `{{ index . "rule" "threshold" "value" }}`,
		},
		// Non-struct-root dotted paths: treated as a single flat key on the
		// root map, so flattened OTel-style label keys resolve naturally.
		{
			name:     "non-struct-root dotted path hits flat root key",
			input:    "$service.name",
			expected: `{{ index . "service.name" }}`,
		},
		// Hybrid: all types combined
		{
			name:     "hybrid - all variables types",
			input:    "Alert: $alert_name Labels: $labels.severity Annotations: $annotations.desc Value: $alert.value Count: $error_count",
			expected: `Alert: {{ .alert_name }} Labels: {{ index .labels "severity" }} Annotations: {{ index .annotations "desc" }} Value: {{ index . "alert" "value" }} Count: {{ .error_count }}`,
		},
		{
			name:     "already wrapped should not be changed",
			input:    "{{$status := .status}}{{.name}} is {{$status | toUpper}}",
			expected: "{{$status := .status}}{{.name}} is {{$status | toUpper}}",
		},
		{
			name:     "no variables should not be changed",
			input:    "Hello world",
			expected: "Hello world",
		},
		{
			name:     "empty string",
			input:    "",
			expected: "",
		},
		{
			name:     "deeply nested",
			input:    "{{range .items}}{{if .ok}}$deep{{end}}{{end}}",
			expected: "{{range .items}}{{if .ok}}{{ .deep }}{{end}}{{end}}",
		},
		{
			name: "complex example",
			input: `Hello $name, your score is $score.
					{{if .isAdmin}}
						Welcome back $name, you have {{.unreadCount}} messages.
					{{end}}`,
			expected: `Hello {{ .name }}, your score is {{ .score }}.
					{{if .isAdmin}}
						Welcome back {{ .name }}, you have {{.unreadCount}} messages.
					{{end}}`,
		},
		{
			name:     "with custom function",
			input:    "$name triggered at {{urlescape .url}}",
			expected: "{{ .name }} triggered at {{urlescape .url}}",
		},
		{
			name:        "invalid template",
			input:       "{{invalid",
			expectError: true,
		},
	}

	// structRoots used across the test cases: "alert" and "rule" are walked,
	// anything else dotted is treated as a flat root-map key.
	structRoots := map[string]bool{"alert": true, "rule": true}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result, err := wrapDollarVariables(tc.input, structRoots)

			if tc.expectError {
				require.Error(t, err, "should error on invalid template syntax")
			} else {
				require.NoError(t, err)
				require.Equal(t, tc.expected, result)
			}
		})
	}
}

func TestExtractUsedVariables(t *testing.T) {
	testCases := []struct {
		name        string
		input       string
		expected    map[string]bool
		expectError bool
	}{
		{
			name:     "simple usage in text",
			input:    "$name is $status",
			expected: map[string]bool{"name": true, "status": true},
		},
		{
			name:     "declared in action block",
			input:    "{{ $name := .name }}",
			expected: map[string]bool{"name": true},
		},
		{
			name:     "range loop vars",
			input:    "{{ range $i, $v := .items }}{{ end }}",
			expected: map[string]bool{"i": true, "v": true},
		},
		{
			name:     "mixed text and action",
			input:    "$x and {{ $y }}",
			expected: map[string]bool{"x": true, "y": true},
		},
		{
			name:     "dotted path in text extracts base only",
			input:    "$labels.severity",
			expected: map[string]bool{"labels": true},
		},
		{
			name:     "nested if else",
			input:    "{{ if .ok }}{{ $a }}{{ else }}{{ $b }}{{ end }}",
			expected: map[string]bool{"a": true, "b": true},
		},
		{
			name:     "empty string",
			input:    "",
			expected: map[string]bool{},
		},
		{
			name:     "no variables",
			input:    "Hello world",
			expected: map[string]bool{},
		},
		{
			name:        "invalid template returns error",
			input:       "{{invalid",
			expectError: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result, err := extractUsedVariables(tc.input)

			if tc.expectError {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
				require.Equal(t, tc.expected, result)
			}
		})
	}
}
