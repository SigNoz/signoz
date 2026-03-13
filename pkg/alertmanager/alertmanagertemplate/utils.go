package alertmanagertemplate

import (
	"fmt"
	"reflect"
	"regexp"
	"strings"
	"text/template/parse"

	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/common/model"
)

// maxAggregatedValues is the maximum number of unique values to include
// when aggregating non-common label/annotation values across alerts.
const maxAggregatedValues = 5

// bareVariableRegex matches bare $variable references including dotted paths like $service.name.
var bareVariableRegex = regexp.MustCompile(`\$(\w+(?:\.\w+)*)`)

// bareVariableRegexFirstSeg matches only the base $variable name, stopping before any dotted path.
// e.g. "$labels.severity" matches "$labels", "$name" matches "$name".
var bareVariableRegexFirstSeg = regexp.MustCompile(`\$\w+`)

// WrapDollarVariables wraps bare $variable references in Go template syntax.
// Example transformations:
//   - "$name is $status" -> "{{ $name }} is {{ $status }}"
//   - "$labels.severity" -> "{{ index .labels \"severity\" }}"
//   - "$labels.http.status" -> "{{ index .labels \"http.status\" }}"
//   - "$annotations.summary" -> "{{ index .annotations \"summary\" }}"
//   - "$service.name" -> "{{ index . \"service.name\" }}"
//   - "$name is {{ .Status }}" -> "{{ $name }} is {{ .Status }}"
func WrapDollarVariables(src string) (string, error) {
	if src == "" {
		return src, nil
	}

	funcMap := alertmanagertypes.AdditionalFuncMap()
	// Create a new parse.Tree directly
	tree := parse.New("template")
	tree.Mode = parse.SkipFuncCheck

	// Parse the template
	_, err := tree.Parse(src, "{{", "}}", make(map[string]*parse.Tree), funcMap)
	if err != nil {
		return "", err
	}

	// Walk the AST and transform TextNodes
	walkAndWrapTextNodes(tree.Root)

	// Return the reassembled template
	return tree.Root.String(), nil
}

// walkAndWrapTextNodes recursively walks the parse tree and wraps bare $variable
func walkAndWrapTextNodes(node parse.Node) {
	if reflect.ValueOf(node).IsNil() {
		return
	}

	switch n := node.(type) {
	case *parse.ListNode:
		// Recurse into all child nodes
		if n.Nodes != nil {
			for _, child := range n.Nodes {
				walkAndWrapTextNodes(child)
			}
		}

	case *parse.TextNode:
		// Transform $variable based on its pattern
		n.Text = bareVariableRegex.ReplaceAllFunc(n.Text, func(match []byte) []byte {
			// Extract variable name without the $
			varName := string(match[1:])

			// Check if variable contains dots
			if strings.Contains(varName, ".") {
				// Check for reserved prefixes: labels.* or annotations.*
				if strings.HasPrefix(varName, "labels.") {
					key := strings.TrimPrefix(varName, "labels.")
					return []byte(fmt.Sprintf(`{{ index .labels "%s" }}`, key))
				}
				if strings.HasPrefix(varName, "annotations.") {
					key := strings.TrimPrefix(varName, "annotations.")
					return []byte(fmt.Sprintf(`{{ index .annotations "%s" }}`, key))
				}
				// Other dotted variables: index into root context
				return []byte(fmt.Sprintf(`{{ index . "%s" }}`, varName))
			}

			// Simple variables: use dot notation to directly access the field
			// without raising any error due to missing variables
			return []byte(fmt.Sprintf("{{ .%s }}", varName))
		})

	case *parse.IfNode:
		// Recurse into both branches
		walkAndWrapTextNodes(n.List)
		walkAndWrapTextNodes(n.ElseList)

	case *parse.RangeNode:
		// Recurse into both branches
		walkAndWrapTextNodes(n.List)
		walkAndWrapTextNodes(n.ElseList)

		// All other node types (ActionNode, PipeNode, VariableNode, etc.) are already
		// inside {{ }} action blocks and don't need transformation

		// Support for `with` can be added later when we start supporting it in editor block
	}
}

// ExtractUsedVariables returns the set of all $variable referenced in template
// — text nodes, action blocks, branch conditions, and loop declarations — regardless of scope.
// After finding all variables we find the ones which are not part of our alert data and handle them so
// Go-text-template parser doesn't rejects undefined $variables
func ExtractUsedVariables(src string) (map[string]bool, error) {
	if src == "" {
		return map[string]bool{}, nil
	}

	// Regex-scan raw template string to collect all $var base names.
	// bareVariableRegexFirstSeg stops before dots, so "$labels.severity" yields "$labels".
	used := make(map[string]bool)
	for _, m := range bareVariableRegexFirstSeg.FindAll([]byte(src), -1) {
		used[string(m[1:])] = true // strip leading "$"
	}

	// Build a preamble that pre-declares every found variable.
	// This prevents "undefined variable" parse errors for $vars used in action
	// blocks while still letting genuine syntax errors propagate.
	var preamble strings.Builder
	for name := range used {
		fmt.Fprintf(&preamble, `{{$%s := ""}}`, name)
	}

	// Validate template syntax.
	funcMap := alertmanagertypes.AdditionalFuncMap()
	tree := parse.New("template")
	tree.Mode = parse.SkipFuncCheck
	if _, err := tree.Parse(preamble.String()+src, "{{", "}}", make(map[string]*parse.Tree), funcMap); err != nil {
		return nil, err
	}

	return used, nil
}

// AggregateKV aggregates key-value pairs (labels or annotations) from all alerts into a single template.KV
// the result is used to populate the labels and annotations in the notification template data.
// this is done to avoid blank values in the template when labels and annotations used are not common throughout the alerts
func AggregateKV(alerts []*types.Alert, extractFn func(*types.Alert) model.LabelSet) template.KV {
	// track unique values per key in order of first appearance
	valuesPerKey := make(map[string][]string)
	// track which values have been seen for deduplication
	seenValues := make(map[string]map[string]bool)

	for _, alert := range alerts {
		kvPairs := extractFn(alert)
		for k, v := range kvPairs {
			key := string(k)
			value := string(v)

			if seenValues[key] == nil {
				seenValues[key] = make(map[string]bool)
			}

			// only add if not already seen and under the limit of maxAggregatedValues
			if !seenValues[key][value] && len(valuesPerKey[key]) < maxAggregatedValues {
				seenValues[key][value] = true
				valuesPerKey[key] = append(valuesPerKey[key], value)
			}
		}
	}

	// build the result by joining values
	result := make(template.KV, len(valuesPerKey))
	for key, values := range valuesPerKey {
		result[key] = strings.Join(values, ", ")
	}

	return result
}
