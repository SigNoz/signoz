package querier

import (
	"bytes"
	"fmt"
	"sort"
	"strings"
	"text/template"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

// substituteVariables replaces the caller's variables and the reserved
// time-range variables in query, accepting each as {{name}}, [[name]] or $name.
// formatValue renders the values and is what makes the substitution
// dialect-specific.
//
// Names are substituted longest-first so a name that prefixes another is not
// replaced inside it: with both host and host.name defined, $host.name has to
// resolve to the latter instead of leaving a dangling .name behind.
//
// The literal substitution runs first, then the result is evaluated as a go
// template with the same variables as its data, so a query may also reference
// them as {{.name}}. templateName appears only in parse and execute errors.
func substituteVariables(
	query string,
	vars map[string]qbtypes.VariableItem,
	start, end uint64,
	formatValue func(any) string,
	templateName string,
) (string, error) {
	varsData := map[string]any{}
	for k, v := range vars {
		varsData[k] = formatValue(v.Value)
	}

	querybuilder.AssignReservedVars(varsData, start, end)

	keys := make([]string, 0, len(varsData))
	for k := range varsData {
		keys = append(keys, k)
	}
	sort.Slice(keys, func(i, j int) bool {
		return len(keys[i]) > len(keys[j])
	})

	for _, k := range keys {
		query = strings.ReplaceAll(query, fmt.Sprintf("{{%s}}", k), fmt.Sprint(varsData[k]))
		query = strings.ReplaceAll(query, fmt.Sprintf("[[%s]]", k), fmt.Sprint(varsData[k]))
		query = strings.ReplaceAll(query, fmt.Sprintf("$%s", k), fmt.Sprint(varsData[k]))
	}

	tmpl, err := template.New(templateName).Parse(query)
	if err != nil {
		return "", errors.WrapInternalf(err, errors.CodeInternal, "error while replacing template variables")
	}
	var newQuery bytes.Buffer

	// replace go template variables
	if err := tmpl.Execute(&newQuery, varsData); err != nil {
		return "", errors.WrapInternalf(err, errors.CodeInternal, "error while replacing template variables")
	}
	return newQuery.String(), nil
}
