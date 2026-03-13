package alertmanagertemplate

import (
	"testing"

	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/common/model"
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
		// Other dotted paths: index into root context
		{
			name:     "other variables with multiple dots",
			input:    "$service.name",
			expected: `{{ index . "service.name" }}`,
		},
		{
			name:     "other variables with multiple dots nested",
			input:    "$http.status.code",
			expected: `{{ index . "http.status.code" }}`,
		},
		// Hybrid: all types combined
		{
			name:     "hybrid - all variables types",
			input:    "Alert: $alert_name Labels: $labels.severity Annotations: $annotations.desc Service: $service.name Count: $error_count",
			expected: `Alert: {{ .alert_name }} Labels: {{ index .labels "severity" }} Annotations: {{ index .annotations "desc" }} Service: {{ index . "service.name" }} Count: {{ .error_count }}`,
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

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result, err := WrapDollarVariables(tc.input)

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
			result, err := ExtractUsedVariables(tc.input)

			if tc.expectError {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
				require.Equal(t, tc.expected, result)
			}
		})
	}
}

func TestAggregateKV(t *testing.T) {
	extractLabels := func(a *types.Alert) model.LabelSet { return a.Labels }

	testCases := []struct {
		name      string
		alerts    []*types.Alert
		extractFn func(*types.Alert) model.LabelSet
		expected  template.KV
	}{
		{
			name:      "empty alerts slice",
			alerts:    []*types.Alert{},
			extractFn: extractLabels,
			expected:  template.KV{},
		},
		{
			name: "single alert",
			alerts: []*types.Alert{
				{
					Alert: model.Alert{
						Labels: model.LabelSet{
							"env":     "production",
							"service": "backend",
						},
					},
				},
			},
			extractFn: extractLabels,
			expected: template.KV{
				"env":     "production",
				"service": "backend",
			},
		},
		{
			name: "varying values with duplicates deduped",
			alerts: []*types.Alert{
				{Alert: model.Alert{Labels: model.LabelSet{"env": "production", "service": "backend"}}},
				{Alert: model.Alert{Labels: model.LabelSet{"env": "production", "service": "api"}}},
				{Alert: model.Alert{Labels: model.LabelSet{"env": "production", "service": "frontend"}}},
				{Alert: model.Alert{Labels: model.LabelSet{"env": "production", "service": "api"}}},
			},
			extractFn: extractLabels,
			expected: template.KV{
				"env":     "production",
				"service": "backend, api, frontend",
			},
		},
		{
			name: "more than 5 unique values truncates to 5",
			alerts: []*types.Alert{
				{Alert: model.Alert{Labels: model.LabelSet{"service": "svc1"}}},
				{Alert: model.Alert{Labels: model.LabelSet{"service": "svc2"}}},
				{Alert: model.Alert{Labels: model.LabelSet{"service": "svc3"}}},
				{Alert: model.Alert{Labels: model.LabelSet{"service": "svc4"}}},
				{Alert: model.Alert{Labels: model.LabelSet{"service": "svc5"}}},
				{Alert: model.Alert{Labels: model.LabelSet{"service": "svc6"}}},
				{Alert: model.Alert{Labels: model.LabelSet{"service": "svc7"}}},
			},
			extractFn: extractLabels,
			expected: template.KV{
				"service": "svc1, svc2, svc3, svc4, svc5",
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := AggregateKV(tc.alerts, tc.extractFn)
			require.Equal(t, tc.expected, result)
		})
	}
}

func TestExtractCommonKV(t *testing.T) {
	extractLabels := func(a *types.Alert) model.LabelSet { return a.Labels }
	extractAnnotations := func(a *types.Alert) model.LabelSet { return a.Annotations }

	testCases := []struct {
		name      string
		alerts    []*types.Alert
		extractFn func(*types.Alert) model.LabelSet
		expected  template.KV
	}{
		{
			name:      "empty alerts slice",
			alerts:    []*types.Alert{},
			extractFn: extractLabels,
			expected:  template.KV{},
		},
		{
			name: "single alert returns all labels",
			alerts: []*types.Alert{
				{Alert: model.Alert{Labels: model.LabelSet{"env": "prod", "service": "api"}}},
			},
			extractFn: extractLabels,
			expected:  template.KV{"env": "prod", "service": "api"},
		},
		{
			name: "multiple alerts with fully common labels",
			alerts: []*types.Alert{
				{Alert: model.Alert{Labels: model.LabelSet{"env": "prod", "region": "us-east"}}},
				{Alert: model.Alert{Labels: model.LabelSet{"env": "prod", "region": "us-east"}}},
			},
			extractFn: extractLabels,
			expected:  template.KV{"env": "prod", "region": "us-east"},
		},
		{
			name: "multiple alerts with partially common labels",
			alerts: []*types.Alert{
				{Alert: model.Alert{Labels: model.LabelSet{"env": "prod", "service": "api"}}},
				{Alert: model.Alert{Labels: model.LabelSet{"env": "prod", "service": "worker"}}},
			},
			extractFn: extractLabels,
			expected:  template.KV{"env": "prod"},
		},
		{
			name: "multiple alerts with no common labels",
			alerts: []*types.Alert{
				{Alert: model.Alert{Labels: model.LabelSet{"service": "api"}}},
				{Alert: model.Alert{Labels: model.LabelSet{"service": "worker"}}},
			},
			extractFn: extractLabels,
			expected:  template.KV{},
		},
		{
			name: "annotations extract common annotations",
			alerts: []*types.Alert{
				{Alert: model.Alert{Annotations: model.LabelSet{"summary": "high cpu", "runbook": "http://x"}}},
				{Alert: model.Alert{Annotations: model.LabelSet{"summary": "high cpu", "runbook": "http://y"}}},
			},
			extractFn: extractAnnotations,
			expected:  template.KV{"summary": "high cpu"},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := extractCommonKV(tc.alerts, tc.extractFn)
			require.Equal(t, tc.expected, result)
		})
	}
}
