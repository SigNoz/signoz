package alertmanagertypes

import (
	"bytes"
	"fmt"

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
	{{ define "__ruleIdPath" }}{{ range .CommonLabels.SortedPairs }}{{ if eq .Name "ruleId" }}{{ if match "^[0-9]+$" .Value }}/edit?ruleId={{ .Value | urlquery }}{{ end }}{{ end }}{{ end }}{{ end }}
	{{ define "__alertmanagerURL" }}{{ .ExternalURL }}/alerts{{ template "__ruleIdPath" . }}{{ end }}
	`))); err != nil {
		return nil, fmt.Errorf("error parsing alertmanager templates: %w", err)
	}

	return t, nil
}
