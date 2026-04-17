package alertmanagertemplate

import (
	"fmt"
	"reflect"
	"regexp"
	"strings"
	"text/template/parse"

	"github.com/SigNoz/signoz/pkg/errors"
)

// bareVariableRegex matches $-references including dotted paths (e.g. $alert.is_firing).
var bareVariableRegex = regexp.MustCompile(`\$(\w+(?:\.\w+)*)`)

// bareVariableFirstSegRegex captures only the first segment of a $-reference.
// $labels.severity yields "$labels"; $alert.is_firing yields "$alert".
var bareVariableFirstSegRegex = regexp.MustCompile(`\$\w+`)

// wrapDollarVariables rewrites bare $-references in a template's plain-text
// regions into Go text/template syntax. References inside `{{ ... }}` action
// blocks are left untouched — they're already template syntax. structRoots
// is the set of top-level mapstructure names whose values are nested structs
// (e.g. "alert", "rule"): $-refs whose first segment is in this set are
// walked segment-by-segment; everything else dotted is treated as a flat key
// on the root map so flattened OTel-style label keys resolve naturally.
//
// Examples (structRoots = {alert, rule}):
//
//	"$name is $status"       -> "{{ .name }} is {{ .status }}"
//	"$labels.severity"       -> `{{ index .labels "severity" }}`
//	"$labels.http.method"    -> `{{ index .labels "http.method" }}`
//	"$annotations.summary"   -> `{{ index .annotations "summary" }}`
//	"$alert.is_firing"       -> `{{ index . "alert" "is_firing" }}`
//	"$rule.threshold.value"  -> `{{ index . "rule" "threshold" "value" }}`
//	"$service.name"          -> `{{ index . "service.name" }}`
//	"$name is {{ .Status }}" -> "{{ .name }} is {{ .Status }}"
func wrapDollarVariables(src string, structRoots map[string]bool) (string, error) {
	if src == "" {
		return src, nil
	}

	tree := parse.New("template")
	tree.Mode = parse.SkipFuncCheck

	if _, err := tree.Parse(src, "{{", "}}", make(map[string]*parse.Tree), nil); err != nil {
		return "", err
	}

	walkAndWrapTextNodes(tree.Root, structRoots)
	return tree.Root.String(), nil
}

// walkAndWrapTextNodes descends the parse tree and rewrites $-references
// found in TextNodes. If/Range bodies are recursed into. ActionNodes and
// other `{{...}}` constructs are left alone because they're already template
// syntax. WithNode is not yet supported — add when the editor grows a "with"
// block.
func walkAndWrapTextNodes(node parse.Node, structRoots map[string]bool) {
	if reflect.ValueOf(node).IsNil() {
		return
	}

	switch n := node.(type) {
	case *parse.ListNode:
		if n.Nodes != nil {
			for _, child := range n.Nodes {
				walkAndWrapTextNodes(child, structRoots)
			}
		}

	case *parse.TextNode:
		n.Text = bareVariableRegex.ReplaceAllFunc(n.Text, func(match []byte) []byte {
			return rewriteDollarRef(match, structRoots)
		})

	case *parse.IfNode:
		walkAndWrapTextNodes(n.List, structRoots)
		walkAndWrapTextNodes(n.ElseList, structRoots)

	case *parse.RangeNode:
		walkAndWrapTextNodes(n.List, structRoots)
		walkAndWrapTextNodes(n.ElseList, structRoots)
	}
}

// rewriteDollarRef converts one $-reference (with the leading $) into the
// corresponding Go template expression.
//
//   - labels./annotations. prefixes: treat the remainder as a single map key
//     (OTel-style keys like "http.request.method" are flat keys, not paths).
//   - Dotted path with a struct-root first segment: walk via chained index
//     arguments. `index x a b c` is equivalent to x[a][b][c].
//   - Other dotted path: treat as a single flat key on the root map, so a
//     flattened OTel-style label key like "service.name" resolves.
//   - Simple names: plain dot access on the root map.
func rewriteDollarRef(match []byte, structRoots map[string]bool) []byte {
	name := string(match[1:])

	if !strings.Contains(name, ".") {
		return fmt.Appendf(nil, `{{ .%s }}`, name)
	}

	if key, ok := strings.CutPrefix(name, "labels."); ok {
		return fmt.Appendf(nil, `{{ index .labels %q }}`, key)
	}
	if key, ok := strings.CutPrefix(name, "annotations."); ok {
		return fmt.Appendf(nil, `{{ index .annotations %q }}`, key)
	}

	// If the first segment is a known struct root, walk segments.
	if dot := strings.IndexByte(name, '.'); dot >= 0 && structRoots[name[:dot]] {
		parts := strings.Split(name, ".")
		args := make([]string, len(parts))
		for i, p := range parts {
			args[i] = fmt.Sprintf("%q", p)
		}
		return fmt.Appendf(nil, `{{ index . %s }}`, strings.Join(args, " "))
	}

	// Otherwise treat the full dotted path as a single flat root key.
	return fmt.Appendf(nil, `{{ index . %q }}`, name)
}

// extractUsedVariables returns the set of every base $-name referenced in the
// template — text nodes, action blocks, branch conditions, loop declarations.
// Names are first-segment only: $labels.severity contributes "labels".
//
// The template is validated during extraction (a synthesised preamble
// pre-declares each name so the parser doesn't trip on "undefined variable"
// for names that genuinely exist in the data), so a parse error here
// indicates a genuine syntax problem rather than a missing binding.
func extractUsedVariables(src string) (map[string]bool, error) {
	if src == "" {
		return map[string]bool{}, nil
	}

	used := make(map[string]bool)
	for _, m := range bareVariableFirstSegRegex.FindAll([]byte(src), -1) {
		used[string(m[1:])] = true
	}

	var preamble strings.Builder
	for name := range used {
		fmt.Fprintf(&preamble, `{{$%s := ""}}`, name)
	}

	tree := parse.New("template")
	tree.Mode = parse.SkipFuncCheck
	if _, err := tree.Parse(preamble.String()+src, "{{", "}}", make(map[string]*parse.Tree), nil); err != nil {
		return nil, errors.WrapInvalidInputf(err, errors.CodeInternal, "failed to extract used variables")
	}

	return used, nil
}
