// Package semconvsql expands current semantic-convention attribute names in
// integration-owned SQL into current-first compatibility expressions.
package semconvsql

import (
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/semconv"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

var traceAttributeSelector = telemetrytypes.FieldKeySelector{
	Signal:       telemetrytypes.SignalTraces,
	FieldContext: telemetrytypes.FieldContextAttribute,
}

// ResolveTraceStringAttributes replaces direct map reads and existence checks
// for currentNames. Callers keep only current names in their SQL templates;
// the generated family table supplies every historical spelling.
func ResolveTraceStringAttributes(query string, currentNames ...string) string {
	for _, current := range currentNames {
		selector := traceAttributeSelector
		selector.Name = current
		members := semconv.Members(semconv.KindAttribute, selector)
		if len(members) < 2 {
			continue
		}

		directRead := attributeRead(current)
		reads := make([]string, 0, len(members))
		exists := make([]string, 0, len(members))
		for _, member := range members {
			reads = append(reads, fmt.Sprintf("NULLIF(%s, '')", attributeRead(member)))
			exists = append(exists, fmt.Sprintf("has(attributes_string, '%s')", quoteName(member)))
		}

		query = strings.ReplaceAll(query, directRead, "COALESCE("+strings.Join(reads, ", ")+")")
		query = strings.ReplaceAll(
			query,
			fmt.Sprintf("has(attributes_string, '%s')", quoteName(current)),
			"("+strings.Join(exists, " OR ")+")",
		)
	}
	return query
}

func attributeRead(name string) string {
	return fmt.Sprintf("attributes_string['%s']", quoteName(name))
}

func quoteName(name string) string {
	return strings.ReplaceAll(name, "'", "''")
}
