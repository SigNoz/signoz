package alertmanagertypes

import (
	"bytes"
	"net/url"

	tmplhtml "html/template"
	tmpltext "text/template"

	"github.com/SigNoz/signoz/pkg/errors"
	alertmanagertemplate "github.com/prometheus/alertmanager/template"
)

// customTemplateOption returns an Option that adds custom functions to the template.
func customTemplateOption() alertmanagertemplate.Option {
	return func(text *tmpltext.Template, html *tmplhtml.Template) {
		funcs := tmpltext.FuncMap{
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
// If testAlert=true label is present, it adds isTestAlert=true query parameter to the URL.
func FromGlobs(paths []string) (*alertmanagertemplate.Template, error) {
	t, err := alertmanagertemplate.FromGlobs(paths, customTemplateOption())
	if err != nil {
		return nil, err
	}

	if err := t.Parse(bytes.NewReader([]byte(`
	{{ define "__ruleIdPath" }}{{- $isTestAlert := "" -}}{{- range .CommonLabels.SortedPairs -}}{{- if eq .Name "testalert" -}}{{- if eq .Value "true" -}}{{- $isTestAlert = "true" -}}{{- end -}}{{- end -}}{{- end -}}{{- range .CommonLabels.SortedPairs -}}{{- if eq .Name "ruleId" -}}{{- if ne .Value "" -}}/edit?ruleId={{ .Value | urlescape }}{{- if $isTestAlert -}}&isTestAlert=true{{- end -}}{{- end -}}{{- end -}}{{- end -}}{{- end }}
	{{ define "__alertmanagerURL" }}{{ .ExternalURL }}/alerts{{ template "__ruleIdPath" . }}{{ end }}
	{{ define "msteamsv2.default.titleLink" }}{{ template "__alertmanagerURL" . }}{{ end }}
	`))); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error parsing alertmanager templates")
	}

	return t, nil
}
