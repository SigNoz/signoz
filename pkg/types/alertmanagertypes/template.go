package alertmanagertypes

import (
	"bytes"
	"net/url"

	"html/template"
	tmplhtml "html/template"
	tmpltext "text/template"

	"github.com/SigNoz/signoz/pkg/errors"
	alertmanagertemplate "github.com/prometheus/alertmanager/template"
)

// customTemplateOption returns an Option that adds custom functions to the template.
func customTemplateOption() alertmanagertemplate.Option {
	return func(text *tmpltext.Template, html *tmplhtml.Template) {
		funcs := template.FuncMap{
			"urlescape": func(value string) string {
				return url.PathEscape(value)
			},
		}
		text.Funcs(funcs)
		html.Funcs(funcs)
	}
}

// FromGlobs overrides the default alertmanager template to add a ruleIdPath template.
// This is used to generate a link to the rule in the alertmanager.
//
// It checks for a ruleId label and generates a path to the rule.
// If testAlert=true label is present, it routes to /alerts/test instead of /alerts.
func FromGlobs(paths []string) (*alertmanagertemplate.Template, error) {
	t, err := alertmanagertemplate.FromGlobs(paths, customTemplateOption())
	if err != nil {
		return nil, err
	}

	if err := t.Parse(bytes.NewReader([]byte(`
	{{ define "__ruleIdPath" }}{{- range .CommonLabels.SortedPairs -}}{{- if eq .Name "ruleId" -}}/edit?ruleId={{ .Value | urlescape }}{{- end -}}{{- end -}}{{- end }}
	{{ define "__testRuleIdPath" }}{{- range .CommonLabels.SortedPairs -}}{{- if eq .Name "ruleId" -}}?ruleId={{ .Value | urlescape }}{{- end -}}{{- end -}}{{- end }}
	{{ define "__alertmanagerURL" }}{{- $isTestAlert := "" -}}{{- range .CommonLabels.SortedPairs -}}{{- if eq .Name "testalert" -}}{{- if eq .Value "true" -}}{{- $isTestAlert = "true" -}}{{- end -}}{{- end -}}{{- end -}}{{- if $isTestAlert -}}{{ .ExternalURL }}/alerts/test{{ template "__testRuleIdPath" . }}{{- else -}}{{ .ExternalURL }}/alerts{{ template "__ruleIdPath" . }}{{- end -}}{{ end }}
	{{ define "msteamsv2.default.titleLink" }}{{ template "__alertmanagerURL" . }}{{ end }}
	`))); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error parsing alertmanager templates")
	}

	return t, nil
}
