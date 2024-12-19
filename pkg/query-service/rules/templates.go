package rules

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"math"
	"net/url"
	"regexp"
	"sort"
	"strings"

	html_template "html/template"
	text_template "text/template"

	"golang.org/x/text/cases"

	"go.signoz.io/signoz/pkg/query-service/common"
	"go.signoz.io/signoz/pkg/query-service/utils/times"
)

// this file contains all the methods and structs
// related to go templating in rule labels and annotations

type tmplQueryRecord struct {
	Labels    map[string]string
	Value     float64
	Threshold float64
}
type tmplQueryResults []*tmplQueryRecord

type tmplQueryResultsByLabelSorter struct {
	results tmplQueryResults
	by      string
}

func (q tmplQueryResultsByLabelSorter) Len() int {
	return len(q.results)
}

func (q tmplQueryResultsByLabelSorter) Less(i, j int) bool {
	return q.results[i].Labels[q.by] < q.results[j].Labels[q.by]
}

func (q tmplQueryResultsByLabelSorter) Swap(i, j int) {
	q.results[i], q.results[j] = q.results[j], q.results[i]
}

// Expander executes templates in text or HTML mode with a common set of Prometheus template functions.
type TemplateExpander struct {
	text    string
	name    string
	data    interface{}
	funcMap text_template.FuncMap
}

// NewTemplateExpander returns a template expander ready to use.
func NewTemplateExpander(
	ctx context.Context,
	text string,
	name string,
	data interface{},
	timestamp times.Time,
	externalURL *url.URL,
) *TemplateExpander {
	return &TemplateExpander{
		text: text,
		name: name,
		data: data,
		funcMap: text_template.FuncMap{
			"first": func(v tmplQueryResults) (*tmplQueryRecord, error) {
				if len(v) > 0 {
					return v[0], nil
				}
				return nil, errors.New("first() called on vector with no elements")
			},
			"label": func(label string, s *tmplQueryRecord) string {
				return s.Labels[label]
			},
			"value": func(s *tmplQueryRecord) float64 {
				return s.Value
			},
			"strvalue": func(s *tmplQueryRecord) string {
				return s.Labels["__value__"]
			},
			"args": func(args ...interface{}) map[string]interface{} {
				result := make(map[string]interface{})
				for i, a := range args {
					result[fmt.Sprintf("arg%d", i)] = a
				}
				return result
			},
			"reReplaceAll": func(pattern, repl, text string) string {
				re := regexp.MustCompile(pattern)
				return re.ReplaceAllString(text, repl)
			},
			"safeHtml": func(text string) html_template.HTML {
				return html_template.HTML(text)
			},
			"match":   regexp.MatchString,
			"title":   cases.Title,
			"toUpper": strings.ToUpper,
			"toLower": strings.ToLower,
			"sortByLabel": func(label string, v tmplQueryResults) tmplQueryResults {
				sorter := tmplQueryResultsByLabelSorter{v[:], label}
				sort.Stable(sorter)
				return v
			},
			"humanize": func(v float64) string {
				if v == 0 || math.IsNaN(v) || math.IsInf(v, 0) {
					return fmt.Sprintf("%.4g", v)
				}
				if math.Abs(v) >= 1 {
					prefix := ""
					for _, p := range []string{"k", "M", "G", "T", "P", "E", "Z", "Y"} {
						if math.Abs(v) < 1000 {
							break
						}
						prefix = p
						v /= 1000
					}
					return fmt.Sprintf("%.4g%s", v, prefix)
				}
				prefix := ""
				for _, p := range []string{"m", "u", "n", "p", "f", "a", "z", "y"} {
					if math.Abs(v) >= 1 {
						break
					}
					prefix = p
					v *= 1000
				}
				return fmt.Sprintf("%.4g%s", v, prefix)
			},
			"humanize1024": func(v float64) string {
				if math.Abs(v) <= 1 || math.IsNaN(v) || math.IsInf(v, 0) {
					return fmt.Sprintf("%.4g", v)
				}
				prefix := ""
				for _, p := range []string{"ki", "Mi", "Gi", "Ti", "Pi", "Ei", "Zi", "Yi"} {
					if math.Abs(v) < 1024 {
						break
					}
					prefix = p
					v /= 1024
				}
				return fmt.Sprintf("%.4g%s", v, prefix)
			},
			"humanizeDuration": func(v float64) string {
				if math.IsNaN(v) || math.IsInf(v, 0) {
					return fmt.Sprintf("%.4g", v)
				}
				if v == 0 {
					return fmt.Sprintf("%.4gs", v)
				}
				if math.Abs(v) >= 1 {
					sign := ""
					if v < 0 {
						sign = "-"
						v = -v
					}
					seconds := int64(v) % 60
					minutes := (int64(v) / 60) % 60
					hours := (int64(v) / 60 / 60) % 24
					days := (int64(v) / 60 / 60 / 24)
					// For days to minutes, we display seconds as an integer.
					if days != 0 {
						return fmt.Sprintf("%s%dd %dh %dm %ds", sign, days, hours, minutes, seconds)
					}
					if hours != 0 {
						return fmt.Sprintf("%s%dh %dm %ds", sign, hours, minutes, seconds)
					}
					if minutes != 0 {
						return fmt.Sprintf("%s%dm %ds", sign, minutes, seconds)
					}
					// For seconds, we display 4 significant digts.
					return fmt.Sprintf("%s%.4gs", sign, v)
				}
				prefix := ""
				for _, p := range []string{"m", "u", "n", "p", "f", "a", "z", "y"} {
					if math.Abs(v) >= 1 {
						break
					}
					prefix = p
					v *= 1000
				}
				return fmt.Sprintf("%.4g%ss", v, prefix)
			},
			"humanizeTimestamp": func(v float64) string {
				if math.IsNaN(v) || math.IsInf(v, 0) {
					return fmt.Sprintf("%.4g", v)
				}
				t := times.TimeFromUnixNano(int64(v * 1e9)).Time().UTC()
				return fmt.Sprint(t)
			},
			"pathPrefix": func() string {
				return externalURL.Path
			},
			"externalURL": func() string {
				return externalURL.String()
			},
		},
	}
}

// AlertTemplateData returns the interface to be used in expanding the template.
func AlertTemplateData(labels map[string]string, value string, threshold string) interface{} {
	// This exists here for backwards compatibility.
	// The labels map passed in no longer contains the normalized labels.
	// To continue supporting the old way of referencing labels, we need to
	// add the normalized labels just for the template expander.
	// This is done by creating a new map and adding the normalized labels to it.
	newLabels := make(map[string]string)
	for k, v := range labels {
		newLabels[k] = v
		newLabels[common.NormalizeLabelName(k)] = v
	}

	return struct {
		Labels    map[string]string
		Value     string
		Threshold string
	}{
		Labels:    newLabels,
		Value:     value,
		Threshold: threshold,
	}
}

// preprocessTemplate preprocesses the template to replace our custom $variable syntax with the correct Go template syntax.
// example, $service.name in the template is replaced with {{index $labels "service.name"}}
// While we could use go template functions to do this, we need to keep the syntax
// consistent across the platform.
// If there is a go template block, it won't be replaced.
// The example for existing go template block is: {{$threshold}} or {{$value}} or any other valid go template syntax.
// See templates_test.go for examples.
func (te *TemplateExpander) preprocessTemplate() {
	// Handle the $variable syntax
	reDollar := regexp.MustCompile(`({{.*?}})|(\$(\w+(?:\.\w+)*))`)
	te.text = reDollar.ReplaceAllStringFunc(te.text, func(match string) string {
		if strings.HasPrefix(match, "{{") {
			// If it's a Go template block, leave it unchanged
			return match
		}
		path := match[1:] // Remove the '$'
		return fmt.Sprintf(`{{index $labels "%s"}}`, path)
	})

	// Handle the {{.Labels.service.name}} syntax
	reLabels := regexp.MustCompile(`{{\s*\.Labels\.([a-zA-Z0-9_.]+)(.*?)}}`)
	te.text = reLabels.ReplaceAllStringFunc(te.text, func(match string) string {
		submatches := reLabels.FindStringSubmatch(match)
		if len(submatches) < 3 {
			return match // Should not happen
		}
		path := submatches[1]
		rest := submatches[2]
		return fmt.Sprintf(`{{index .Labels "%s"%s}}`, path, rest)
	})

	// Handle the {{$variable}} syntax
	// skip the special case for {{$threshold}} and {{$value}}
	reVariable := regexp.MustCompile(`{{\s*\$\s*([a-zA-Z0-9_.]+)\s*}}`)
	te.text = reVariable.ReplaceAllStringFunc(te.text, func(match string) string {
		if strings.HasPrefix(match, "{{$threshold}}") || strings.HasPrefix(match, "{{$value}}") {
			return match
		}
		// get the variable name from {{$variable}} syntax
		variable := strings.TrimPrefix(match, "{{$")
		variable = strings.TrimSuffix(variable, "}}")
		return fmt.Sprintf(`{{index .Labels "%s"}}`, variable)
	})
}

// Funcs adds the functions in fm to the Expander's function map.
// Existing functions will be overwritten in case of conflict.
func (te TemplateExpander) Funcs(fm text_template.FuncMap) {
	for k, v := range fm {
		te.funcMap[k] = v
	}
}

// Expand expands a template in text (non-HTML) mode.
func (te TemplateExpander) Expand() (result string, resultErr error) {
	// It'd better to have no alert description than to kill the whole process
	// if there's a bug in the template.
	defer func() {
		if r := recover(); r != nil {
			var ok bool
			resultErr, ok = r.(error)
			if !ok {
				resultErr = fmt.Errorf("panic expanding template %v: %v", te.name, r)
			}
		}
	}()

	te.preprocessTemplate()

	tmpl, err := text_template.New(te.name).Funcs(te.funcMap).Option("missingkey=zero").Parse(te.text)
	if err != nil {
		return "", fmt.Errorf("error parsing template %v: %v", te.name, err)
	}
	var buffer bytes.Buffer
	err = tmpl.Execute(&buffer, te.data)
	if err != nil {
		return "", fmt.Errorf("error executing template %v: %v", te.name, err)
	}
	return buffer.String(), nil
}

// ExpandHTML expands a template with HTML escaping, with templates read from the given files.
func (te TemplateExpander) ExpandHTML(templateFiles []string) (result string, resultErr error) {
	defer func() {
		if r := recover(); r != nil {
			var ok bool
			resultErr, ok = r.(error)
			if !ok {
				resultErr = fmt.Errorf("panic expanding template %v: %v", te.name, r)
			}
		}
	}()

	tmpl := html_template.New(te.name).Funcs(html_template.FuncMap(te.funcMap))
	tmpl.Option("missingkey=zero")
	tmpl.Funcs(html_template.FuncMap{
		"tmpl": func(name string, data interface{}) (html_template.HTML, error) {
			var buffer bytes.Buffer
			err := tmpl.ExecuteTemplate(&buffer, name, data)
			return html_template.HTML(buffer.String()), err
		},
	})
	tmpl, err := tmpl.Parse(te.text)
	if err != nil {
		return "", fmt.Errorf("error parsing template %v: %v", te.name, err)
	}
	if len(templateFiles) > 0 {
		_, err = tmpl.ParseFiles(templateFiles...)
		if err != nil {
			return "", fmt.Errorf("error parsing template files for %v: %v", te.name, err)
		}
	}
	var buffer bytes.Buffer
	err = tmpl.Execute(&buffer, te.data)
	if err != nil {
		return "", fmt.Errorf("error executing template %v: %v", te.name, err)
	}
	return buffer.String(), nil
}

// ParseTest parses the templates and returns the error if any.
func (te TemplateExpander) ParseTest() error {
	te.preprocessTemplate()
	_, err := text_template.New(te.name).Funcs(te.funcMap).Option("missingkey=zero").Parse(te.text)
	if err != nil {
		return err
	}
	return nil
}
