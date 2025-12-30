package alertmanagertypes

import (
	"bytes"

	"github.com/SigNoz/signoz/pkg/errors"
	alertmanagertemplate "github.com/prometheus/alertmanager/template"
)

// FromGlobs overrides the default alertmanager template to add a ruleIdPath template.
// This is used to generate a link to the rule in the alertmanager.
//
// It checks for a ruleId label and generates a path to the rule.
// If testAlert=true label is present, it routes to /alerts/test instead of /alerts.
func FromGlobs(paths []string) (*alertmanagertemplate.Template, error) {
	t, err := alertmanagertemplate.FromGlobs(paths)
	if err != nil {
		return nil, err
	}

	if err := t.Parse(bytes.NewReader([]byte(`
	{{ define "__ruleIdPath" }}{{- range .CommonLabels.SortedPairs -}}{{- if eq .Name "ruleId" -}}/edit?ruleId={{ .Value | urlquery }}{{- end -}}{{- end -}}{{- end }}
	{{ define "__testRuleIdPath" }}{{- range .CommonLabels.SortedPairs -}}{{- if eq .Name "ruleId" -}}?ruleId={{ .Value | urlquery }}{{- end -}}{{- end -}}{{- end }}
	{{ define "__alertmanagerURL" }}{{- $isTestAlert := "" -}}{{- range .CommonLabels.SortedPairs -}}{{- if eq .Name "testalert" -}}{{- if eq .Value "true" -}}{{- $isTestAlert = "true" -}}{{- end -}}{{- end -}}{{- end -}}{{- if $isTestAlert -}}{{ .ExternalURL }}/alerts/test{{ template "__testRuleIdPath" . }}{{- else -}}{{ .ExternalURL }}/alerts{{ template "__ruleIdPath" . }}{{- end -}}{{ end }}
	{{ define "msteamsv2.default.titleLink" }}{{ template "__alertmanagerURL" . }}{{ end }}
	`))); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error parsing alertmanager templates")
	}

	return t, nil
}
