package alertmanagertypes

import (
	"bytes"

	"github.com/SigNoz/signoz/pkg/errors"
	alertmanagertemplate "github.com/prometheus/alertmanager/template"
)

// FromGlobs overrides the default alertmanager template to add a ruleIdPath template.
// This is used to generate a link to the rule in the alertmanager.
//
// It explicitly checks for a ruleId that is a number and then generates a path to the rule.
func FromGlobs(paths []string) (*alertmanagertemplate.Template, error) {
	t, err := alertmanagertemplate.FromGlobs(paths)
	if err != nil {
		return nil, err
	}

	if err := t.Parse(bytes.NewReader([]byte(`
	{{ define "__ruleIdValue" }}{{- range .CommonLabels.SortedPairs -}}{{- if eq .Name "ruleId" -}}{{ .Value }}{{- end -}}{{- end -}}{{- end }}
	{{ define "__isTestAlert" }}{{- range .CommonLabels.SortedPairs -}}{{- if eq .Name "testAlert" -}}{{- if eq .Value "true" -}}true{{- end -}}{{- end -}}{{- end -}}{{- end }}
	{{ define "__ruleIdPath" }}{{- $ruleId := "" -}}{{- $isTestAlert := "" -}}{{- range .CommonLabels.SortedPairs -}}{{- if eq .Name "ruleId" -}}{{- $ruleId = .Value -}}{{- end -}}{{- if eq .Name "testAlert" -}}{{- if eq .Value "true" -}}{{- $isTestAlert = "true" -}}{{- end -}}{{- end -}}{{- end -}}{{- if $ruleId -}}/edit?ruleId={{ $ruleId | urlquery }}{{- if $isTestAlert -}}&testAlert=true{{- end -}}{{- else if $isTestAlert -}}?testAlert=true{{- end -}}{{- end }}
	{{ define "__alertmanagerURL" }}{{ .ExternalURL }}/alerts{{ template "__ruleIdPath" . }}{{ end }}
	{{ define "msteamsv2.default.titleLink" }}{{ template "__alertmanagerURL" . }}{{ end }}
	`))); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error parsing alertmanager templates")
	}

	return t, nil
}
