package alertmanagertemplate

import (
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/prometheus/alertmanager/template"
	"github.com/stretchr/testify/require"
)

func TestExtractFieldMappings(t *testing.T) {
	// Flat struct: mapstructure-tagged leaves only. Slices and interfaces are
	// dropped; maps (labels/annotations analogues) are kept as top-level leaves.
	type Flat struct {
		Name       string            `mapstructure:"name"`
		Status     string            `mapstructure:"status"`
		UserCount  int               `mapstructure:"user_count"`
		IsActive   bool              `mapstructure:"is_active"`
		CreatedAt  time.Time         `mapstructure:"created_at"`
		Extra      map[string]string `mapstructure:"extra"`
		Items      []string          `mapstructure:"items"` // slice skipped
		unexported string            //nolint:unused // unexported skipped
		NoTag      string            // no mapstructure tag skipped
		SkippedTag string            `mapstructure:"-"` // explicit skip
	}

	// Nested struct: sub-struct paths are flattened into dotted mappings; the
	// parent path itself is also emitted so templates can bind `$alert := .alert`.
	type Inner struct {
		Value string `mapstructure:"value"`
		Op    string `mapstructure:"op"`
	}
	type Outer struct {
		Alert struct {
			Status   string `mapstructure:"status"`
			IsFiring bool   `mapstructure:"is_firing"`
		} `mapstructure:"alert"`
		Rule struct {
			Name      string `mapstructure:"name"`
			Threshold Inner  `mapstructure:"threshold"`
		} `mapstructure:"rule"`
	}

	testCases := []struct {
		name     string
		data     any
		expected []fieldPath
	}{
		{
			name: "flat struct surfaces only mapstructure-tagged scalars",
			data: Flat{},
			expected: []fieldPath{
				"name", "status", "user_count", "is_active", "created_at", "extra",
			},
		},
		{
			name: "nested struct emits parent and dotted leaf paths",
			data: Outer{},
			expected: []fieldPath{
				"alert",
				"alert.status",
				"alert.is_firing",
				"rule",
				"rule.name",
				"rule.threshold",
				"rule.threshold.value",
				"rule.threshold.op",
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
	testCases := []struct {
		name          string
		tmpl          string
		data          any
		expectedVars  []string // substrings that must appear in result
		forbiddenVars []string // substrings that must NOT appear (dotted identifiers)
		expectError   bool
	}{
		{
			name: "empty template still emits struct bindings for title data",
			tmpl: "",
			data: &alertmanagertypes.NotificationTemplateData{Alert: alertmanagertypes.NotificationAlert{Receiver: "slack"}},
			expectedVars: []string{
				"{{ $alert := .alert }}",
				"{{ $rule := .rule }}",
			},
			// Dotted leaves are NOT emitted as preamble bindings — they're
			// reached via {{ index . "alert" "status" }} at expansion time.
			forbiddenVars: []string{
				"$alert.status",
				"$rule.threshold.value",
			},
		},
		{
			name: "mix of known and unknown vars in alert body",
			tmpl: "$rule.name fired: $custom_label",
			data: &alertmanagertypes.AlertData{Rule: alertmanagertypes.RuleInfo{Name: "test"}, Alert: alertmanagertypes.AlertInfo{Status: "firing"}},
			expectedVars: []string{
				"{{ $alert := .alert }}",
				"{{ $rule := .rule }}",
				`{{ $custom_label := "<no value>" }}`,
			},
		},
		{
			name: "known dotted variables do not get flagged as unknown",
			tmpl: "$alert.is_firing and $rule.threshold.value",
			data: &alertmanagertypes.AlertData{},
			// $alert and $rule (first segments) are in mappings, so no unknown
			// stubs; the dotted leaves are resolved by WrapDollarVariables.
			expectedVars: []string{
				"{{ $alert := .alert }}",
				"{{ $rule := .rule }}",
			},
			forbiddenVars: []string{
				`"<no value>"`,
			},
		},
		{
			// Label-derived $-refs aren't stubbed as unknown; their first
			// segment is marked known so {{ $severity := ... }} stubs don't
			// appear in the preamble. Resolution happens at expansion via the
			// root-level flattening performed in buildDataMap.
			name: "label first-segments suppress unknown-var stubs",
			tmpl: "$severity for $service $cloud.region.instance",
			data: &alertmanagertypes.NotificationTemplateData{Labels: template.KV{
				"severity":              "critical",
				"service":               "test",
				"cloud.region.instance": "ap-south-1",
			}},
			forbiddenVars: []string{
				`{{ $severity := "<no value>" }}`,
				`{{ $service := "<no value>" }}`,
				`{{ $cloud := "<no value>" }}`,
			},
		},
		{
			name: "same rule holds for AlertData labels",
			tmpl: "$severity $service",
			data: &alertmanagertypes.AlertData{Labels: template.KV{
				"severity": "critical",
				"service":  "test",
			}},
			forbiddenVars: []string{
				`{{ $severity := "<no value>" }}`,
				`{{ $service := "<no value>" }}`,
			},
		},
		{
			name:        "invalid template syntax returns error",
			tmpl:        "{{invalid",
			data:        &alertmanagertypes.NotificationTemplateData{},
			expectError: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result, _, err := buildPreamble(tc.tmpl, tc.data)
			if tc.expectError {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			for _, expected := range tc.expectedVars {
				require.Contains(t, result, expected, "expected preamble substring missing")
			}
			for _, forbidden := range tc.forbiddenVars {
				require.NotContains(t, result, forbidden, "unexpected preamble substring present")
			}
		})
	}
}

func TestPreProcessTemplateAndData(t *testing.T) {
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
			name: "title template: struct-root walks and flat dotted label keys",
			tmpl: "[$alert.status] $rule.name (ID: $rule.id) firing=$alert.total_firing severity=$severity method=$http.request.method",
			data: &alertmanagertypes.NotificationTemplateData{
				Alert: alertmanagertypes.NotificationAlert{
					Receiver:    "pagerduty",
					Status:      "firing",
					TotalFiring: 3,
				},
				Rule: alertmanagertypes.RuleInfo{
					Name: "HighMemory",
					ID:   "rule-123",
				},
				Labels: template.KV{
					"severity":            "critical",
					"http.request.method": "GET",
				},
			},
			expectedTemplateContains: []string{
				"{{$alert := .alert}}",
				"{{$rule := .rule}}",
				`[{{ index . "alert" "status" }}] {{ index . "rule" "name" }} (ID: {{ index . "rule" "id" }})`,
				`firing={{ index . "alert" "total_firing" }} severity={{ .severity }}`,
				`method={{ index . "http.request.method" }}`,
			},
			expectedData: map[string]any{
				"alert": map[string]any{
					"receiver":       "pagerduty",
					"status":         "firing",
					"total_firing":   3,
					"total_resolved": 0,
				},
				"severity":            "critical",
				"http.request.method": "GET",
			},
			expectedUnknownVars: map[string]bool{},
		},
		{
			name: "body template with nested threshold access and per-alert annotation",
			tmpl: "$rule.name: value $alert.value $rule.threshold.op $rule.threshold.value ($alert.status) desc=$description",
			data: &alertmanagertypes.AlertData{
				Alert: alertmanagertypes.AlertInfo{
					Status:   "firing",
					Value:    "85%",
					IsFiring: true,
				},
				Rule: alertmanagertypes.RuleInfo{
					Name:      "DiskFull",
					ID:        "disk-001",
					Severity:  "warning",
					Threshold: alertmanagertypes.Threshold{Value: "80%", Op: ">"},
				},
				Annotations: template.KV{
					"description": "Disk full and cannot be written to",
				},
			},
			expectedTemplateContains: []string{
				"{{$alert := .alert}}",
				"{{$rule := .rule}}",
				// "description" is an annotation flattened to root; the preamble
				// now binds it off the root rather than via .annotations lookup.
				"{{$description := .description}}",
				`{{ index . "rule" "name" }}: value {{ index . "alert" "value" }} {{ index . "rule" "threshold" "op" }} {{ index . "rule" "threshold" "value" }}`,
			},
			expectedData: map[string]any{
				"description": "Disk full and cannot be written to",
			},
			expectedUnknownVars: map[string]bool{},
		},
		{
			// Struct roots reserve their first-segment namespace: a label
			// whose key starts with "alert." is shadowed by the Alert sub-map,
			// and must be accessed via the explicit $labels.* prefix.
			name: "label colliding with struct root is accessed via $labels.*",
			tmpl: "$alert.status via $labels.alert.custom",
			data: &alertmanagertypes.NotificationTemplateData{
				Alert:  alertmanagertypes.NotificationAlert{Status: "firing"},
				Labels: template.KV{"alert.custom": "x"},
			},
			expectedTemplateContains: []string{
				`{{ index . "alert" "status" }}`,
				`{{ index .labels "alert.custom" }}`,
			},
		},
		{
			// Same shadowing rule applies symmetrically to annotations.
			name: "annotation colliding with struct root is accessed via $annotations.*",
			tmpl: "$alert.status via $annotations.alert.meta",
			data: &alertmanagertypes.NotificationTemplateData{
				Alert:       alertmanagertypes.NotificationAlert{Status: "firing"},
				Annotations: template.KV{"alert.meta": "x"},
			},
			expectedTemplateContains: []string{
				`{{ index . "alert" "status" }}`,
				`{{ index .annotations "alert.meta" }}`,
			},
		},
		{
			// When a label and an annotation share a key, the label wins at the
			// root flattening layer. Users who want the annotation must address
			// it explicitly via $annotations.<key>.
			name: "label takes precedence over same-named annotation at root",
			tmpl: "flat=$env labels_only=$labels.env annotations_only=$annotations.env",
			data: &alertmanagertypes.NotificationTemplateData{
				Labels:      template.KV{"env": "prod"},
				Annotations: template.KV{"env": "staging"},
			},
			expectedTemplateContains: []string{
				`flat={{ .env }}`,
				`labels_only={{ index .labels "env" }}`,
				`annotations_only={{ index .annotations "env" }}`,
			},
			expectedData: map[string]any{
				"env": "prod",
			},
		},
		{
			name: "empty template returns flattened data",
			tmpl: "",
			data: &alertmanagertypes.NotificationTemplateData{Alert: alertmanagertypes.NotificationAlert{Receiver: "slack"}},
		},
		{
			name:        "invalid template syntax",
			tmpl:        "{{invalid",
			data:        &alertmanagertypes.NotificationTemplateData{},
			expectError: true,
		},
		{
			name: "unknown dollar var in text renders empty",
			tmpl: "alert $custom_note fired",
			data: &alertmanagertypes.NotificationTemplateData{Rule: alertmanagertypes.RuleInfo{Name: "HighCPU"}},
			expectedTemplateContains: []string{
				`{{$custom_note := "<no value>"}}`,
				"alert {{ .custom_note }} fired",
			},
			expectedUnknownVars: map[string]bool{"custom_note": true},
		},
		{
			name: "unknown dollar var in action block renders empty",
			tmpl: "alert {{ $custom_note }} fired",
			data: &alertmanagertypes.NotificationTemplateData{Rule: alertmanagertypes.RuleInfo{Name: "HighCPU"}},
			expectedTemplateContains: []string{
				`{{$custom_note := "<no value>"}}`,
				`alert {{$custom_note}} fired`,
			},
			expectedUnknownVars: map[string]bool{"custom_note": true},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result, err := preProcessTemplateAndData(tc.tmpl, tc.data)

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
				require.Equal(t, v, result.Data[k], "data[%q] mismatch", k)
			}
			if tc.expectedUnknownVars != nil {
				require.Equal(t, tc.expectedUnknownVars, result.UnknownVars)
			}
		})
	}
}
