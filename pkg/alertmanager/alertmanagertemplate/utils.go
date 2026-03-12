package alertmanagertemplate

import (
	"fmt"
	"reflect"
	"regexp"
	"strings"
	"text/template/parse"

	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
)

// bareVariableRegex matches bare $variable references including dotted paths like $service.name.
var bareVariableRegex = regexp.MustCompile(`\$(\w+(?:\.\w+)*)`)

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

			// Simple variables: use dollar syntax
			return []byte(fmt.Sprintf("{{ $%s }}", varName))
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
