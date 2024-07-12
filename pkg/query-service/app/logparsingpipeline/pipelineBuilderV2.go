// Generate collector config for log pipelines
// using ottl targeting signoztransform processor.

package logparsingpipeline

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/google/uuid"
	"go.signoz.io/signoz/pkg/query-service/queryBuilderToExpr"
)

func PreparePipelineProcessor(pipelines []Pipeline) (map[string]interface{}, []string, error) {
	processors := map[string]interface{}{}
	names := []string{}

	ottlStatements := []string{}

	for _, pipeline := range pipelines {
		if pipeline.Enabled {
			pipelineOttlStatements, err := ottlStatementsForPipeline(pipeline)
			if err != nil {
				return nil, nil, fmt.Errorf("couldn't generate ottl statements for pipeline %s: %w", pipeline.Alias, err)
			}

			ottlStatements = append(ottlStatements, pipelineOttlStatements...)
		}
	}

	// TODO(Raj): Maybe validate ottl statements
	if len(ottlStatements) > 0 {
		pipelinesProcessorName := "signoztransform/logs-pipelines"
		names = append(names, pipelinesProcessorName)
		processors[pipelinesProcessorName] = map[string]interface{}{
			"error_mode": "ignore",
			"log_statements": []map[string]interface{}{
				{
					"context":    "log",
					"statements": ottlStatements,
				},
			},
		}
	}
	return processors, names, nil
}

// representation for ottl statements used for putting
// together ottl statements for pipelines
type ottlStatement struct {
	// All ottl statements have exactly 1 "editor" for transforming log
	editor string
	// editor only gets applied if a log matches the condition
	conditions []string
}

func (s *ottlStatement) toString() string {
	if len(s.conditions) < 1 {
		return s.editor
	}

	conditions := []string{}
	for _, c := range s.conditions {
		if len(c) > 0 {
			conditions = append(conditions, c)
		}
	}

	return fmt.Sprintf(
		"%s where %s",
		s.editor,
		strings.Join(conditions, " and "),
	)
}

func ottlStatementsForPipeline(pipeline Pipeline) ([]string, error) {

	ottlStatements := []string{}

	enabledOperators := []PipelineOperator{}
	for _, op := range pipeline.Config {
		if op.Enabled {
			enabledOperators = append(enabledOperators, op)
		}
	}
	if len(enabledOperators) < 1 {
		return ottlStatements, nil
	}

	filterExpr, err := queryBuilderToExpr.Parse(pipeline.Filter)
	if err != nil {
		return nil, fmt.Errorf("failed to parse pipeline filter: %w", err)
	}

	// We are generating one or more ottl statements per pipeline operator.
	// ottl statements have individual where conditions per statement
	// The simplest path is to add where clause for pipeline filter to each statement.
	// However, this breaks if an early operator statement in the pipeline ends up
	// modifying the fields referenced in the pipeline filter.
	// To work around this, we add statements before and after the actual pipeline
	// operator statements, that add and remove a pipeline specific marker, ensuring
	// all operators in a pipeline get to act on the log even if an op changes the filter referenced fields.
	pipelineMarker := fmt.Sprintf("%s-%s", pipeline.Alias, pipeline.Id) // pipeline.Id is guranteed to be unique by DB.
	addMarkerStatement := fmt.Sprintf(`set(attributes["__matched-log-pipeline__"], "%s")`, pipelineMarker)
	if len(filterExpr) > 0 {
		addMarkerStatement += fmt.Sprintf(" where %s", exprForOttl(filterExpr))
	}
	ottlStatements = append(ottlStatements, addMarkerStatement)
	pipelineMarkerWhereClause := fmt.Sprintf(
		`attributes["__matched-log-pipeline__"] == "%s"`, pipelineMarker,
	)

	// to be called at the end
	removePipelineMarker := func() {
		ottlStatements = append(ottlStatements, fmt.Sprintf(
			`delete_key(attributes, "__matched-log-pipeline__") where %s`, pipelineMarkerWhereClause,
		))
	}

	pipelineStmt := func(editor string, conditions []string) ottlStatement {
		stmt := ottlStatement{
			editor:     editor,
			conditions: []string{pipelineMarkerWhereClause},
		}

		if len(conditions) > 0 {
			stmt.conditions = append(stmt.conditions, conditions...)
		}

		return stmt
	}

	appendStatement := func(statement string, additionalFilter string) {
		conditions := []string{}
		if len(additionalFilter) > 0 {
			conditions = append(conditions, additionalFilter)
		}
		stmt := pipelineStmt(statement, conditions)

		ottlStatements = append(ottlStatements, stmt.toString())
	}

	appendDeleteStatement := func(path string) {
		fieldPath := logTransformPathToOttlPath(path)
		fieldPathParts := rSplitAfterN(fieldPath, "[", 2)
		target := fieldPathParts[0]
		key := fieldPathParts[1][1 : len(fieldPathParts[1])-1]

		pathNotNilCheck, err := fieldNotNilCheck(path)
		if err != nil {
			panic(err)
		}

		appendStatement(
			fmt.Sprintf(`delete_key(%s, %s)`, target, key),
			exprForOttl(pathNotNilCheck),
		)
	}

	appendMapExtractStatements := func(
		filterClause string,
		mapGenerator string,
		target string,
	) {
		cacheKey := uuid.NewString()
		// Extract parsed map to cache.
		appendStatement(fmt.Sprintf(
			`set(cache["%s"], %s)`, cacheKey, mapGenerator,
		), filterClause)

		// Set target to a map if not already one.
		appendStatement(fmt.Sprintf(
			`set(%s, ParseJSON("{}"))`, logTransformPathToOttlPath(target),
		), strings.Join([]string{
			fmt.Sprintf(`cache["%s"] != nil`, cacheKey),
			fmt.Sprintf("not IsMap(%s)", logTransformPathToOttlPath(target)),
		}, " and "))

		appendStatement(
			fmt.Sprintf(
				`merge_maps(%s, cache["%s"], "upsert")`,
				logTransformPathToOttlPath(target), cacheKey,
			),
			fmt.Sprintf(`cache["%s"] != nil`, cacheKey),
		)
	}

	for _, operator := range pipeline.Config {
		if operator.Enabled {

			if operator.Type == "add" {
				value := fmt.Sprintf(`"%s"`, operator.Value)
				condition := ""
				if strings.HasPrefix(operator.Value, "EXPR(") {
					expression := strings.TrimSuffix(strings.TrimPrefix(operator.Value, "EXPR("), ")")
					value = exprForOttl(expression)
					fieldsNotNilCheck, err := fieldsReferencedInExprNotNilCheck(expression)
					if err != nil {
						return nil, fmt.Errorf(
							"could'nt generate nil check for fields referenced in value expr of add operator %s: %w",
							operator.Name, err,
						)
					}
					if fieldsNotNilCheck != "" {
						condition = exprForOttl(fieldsNotNilCheck)
					}
				}
				appendStatement(
					fmt.Sprintf(`set(%s, %s)`, logTransformPathToOttlPath(operator.Field), value),
					condition,
				)

			} else if operator.Type == "remove" {
				appendDeleteStatement(operator.Field)

			} else if operator.Type == "copy" {
				appendStatement(fmt.Sprintf(`set(%s, %s)`, logTransformPathToOttlPath(operator.To), logTransformPathToOttlPath(operator.From)), "")

			} else if operator.Type == "move" {
				appendStatement(fmt.Sprintf(`set(%s, %s)`, logTransformPathToOttlPath(operator.To), logTransformPathToOttlPath(operator.From)), "")
				appendDeleteStatement(operator.From)

			} else if operator.Type == "regex_parser" {
				parseFromNotNilCheck, err := fieldNotNilCheck(operator.ParseFrom)
				if err != nil {
					return nil, fmt.Errorf(
						"couldn't generate nil check for parseFrom of regex op %s: %w", operator.Name, err,
					)
				}
				appendStatement(
					fmt.Sprintf(
						`merge_maps(%s, ExtractPatterns(%s, "%s"), "upsert")`,
						logTransformPathToOttlPath(operator.ParseTo),
						logTransformPathToOttlPath(operator.ParseFrom),
						escapeDoubleQuotesForOttl(operator.Regex),
					),
					exprForOttl(parseFromNotNilCheck),
				)

			} else if operator.Type == "grok_parser" {
				parseFromNotNilCheck, err := fieldNotNilCheck(operator.ParseFrom)
				if err != nil {
					return nil, fmt.Errorf(
						"couldn't generate nil check for parseFrom of grok op %s: %w", operator.Name, err,
					)
				}
				appendStatement(
					fmt.Sprintf(
						`merge_maps(%s, GrokParse(%s, "%s"), "upsert")`,
						logTransformPathToOttlPath(operator.ParseTo),
						logTransformPathToOttlPath(operator.ParseFrom),
						escapeDoubleQuotesForOttl(operator.Pattern),
					),
					exprForOttl(parseFromNotNilCheck),
				)

			} else if operator.Type == "json_parser" {
				parseFromNotNilCheck, err := fieldNotNilCheck(operator.ParseFrom)
				if err != nil {
					return nil, fmt.Errorf(
						"couldn't generate nil check for parseFrom of json parser op %s: %w", operator.Name, err,
					)
				}
				whereClause := strings.Join([]string{
					exprForOttl(parseFromNotNilCheck),
					fmt.Sprintf(`IsMatch(%s, "^\\s*{.*}\\s*$")`, logTransformPathToOttlPath(operator.ParseFrom)),
				}, " and ")

				appendMapExtractStatements(
					whereClause,
					fmt.Sprintf("ParseJSON(%s)", logTransformPathToOttlPath(operator.ParseFrom)),
					logTransformPathToOttlPath(operator.ParseTo),
				)

			} else if operator.Type == "time_parser" {
				parseFromNotNilCheck, err := fieldNotNilCheck(operator.ParseFrom)
				if err != nil {
					return nil, fmt.Errorf(
						"couldn't generate nil check for parseFrom of json parser op %s: %w", operator.Name, err,
					)
				}

				whereClauseParts := []string{exprForOttl(parseFromNotNilCheck)}

				if operator.LayoutType == "strptime" {
					regex, err := RegexForStrptimeLayout(operator.Layout)
					if err != nil {
						return nil, fmt.Errorf(
							"couldn't generate layout regex for time_parser %s: %w", operator.Name, err,
						)
					}
					whereClauseParts = append(whereClauseParts,
						fmt.Sprintf(`IsMatch(%s, "%s")`, logTransformPathToOttlPath(operator.ParseFrom), regex),
					)

					appendStatement(
						fmt.Sprintf(
							`set(time, Time(%s, "%s"))`,
							logTransformPathToOttlPath(operator.ParseFrom),
							operator.Layout,
						),
						strings.Join(whereClauseParts, " and "),
					)

				} else if operator.LayoutType == "epoch" {
					valueRegex := `^\\s*[0-9]+\\s*$`
					if strings.Contains(operator.Layout, ".") {
						valueRegex = `^\\s*[0-9]+\\.[0-9]+\\s*$`
					}

					whereClauseParts = append(whereClauseParts,
						exprForOttl(fmt.Sprintf(
							`string(%s) matches "%s"`, operator.ParseFrom, valueRegex,
						)),
					)

					timeValue := fmt.Sprintf("Double(%s)", logTransformPathToOttlPath(operator.ParseFrom))
					if strings.HasPrefix(operator.Layout, "seconds") {
						timeValue = fmt.Sprintf("%s * 1000000000", timeValue)
					} else if operator.Layout == "milliseconds" {
						timeValue = fmt.Sprintf("%s * 1000000", timeValue)
					} else if operator.Layout == "microseconds" {
						timeValue = fmt.Sprintf("%s * 1000", timeValue)
					}
					appendStatement(
						fmt.Sprintf(`set(time_unix_nano, %s)`, timeValue),
						strings.Join(whereClauseParts, " and "),
					)
				} else {
					return nil, fmt.Errorf("unsupported time layout %s", operator.LayoutType)
				}

			} else if operator.Type == "severity_parser" {
				parseFromNotNilCheck, err := fieldNotNilCheck(operator.ParseFrom)
				if err != nil {
					return nil, fmt.Errorf(
						"couldn't generate nil check for parseFrom of severity parser %s: %w", operator.Name, err,
					)
				}

				for severity, valuesToMap := range operator.SeverityMapping {
					for _, value := range valuesToMap {
						// Special case for 2xx 3xx 4xx and 5xx
						isSpecialValue, err := regexp.MatchString(`^\s*[2|3|4|5]xx\s*$`, strings.ToLower(value))
						if err != nil {
							return nil, fmt.Errorf("couldn't regex match for wildcard severity values: %w", err)
						}
						if isSpecialValue {
							whereClause := strings.Join([]string{
								exprForOttl(parseFromNotNilCheck),
								exprForOttl(fmt.Sprintf(`type(%s) in ["int", "float"] && %s == float(int(%s))`, operator.ParseFrom, operator.ParseFrom, operator.ParseFrom)),
								exprForOttl(fmt.Sprintf(`string(int(%s)) matches "^%s$"`, operator.ParseFrom, fmt.Sprintf("%s[0-9]{2}", value[0:1]))),
							}, " and ")
							appendStatement(fmt.Sprintf("set(severity_number, SEVERITY_NUMBER_%s)", strings.ToUpper(severity)), whereClause)
							appendStatement(fmt.Sprintf(`set(severity_text, "%s")`, strings.ToUpper(severity)), whereClause)
						} else {
							whereClause := strings.Join([]string{
								exprForOttl(parseFromNotNilCheck),
								fmt.Sprintf(
									`IsString(%s)`,
									logTransformPathToOttlPath(operator.ParseFrom),
								),
								fmt.Sprintf(
									`IsMatch(%s, "^\\s*%s\\s*$")`,
									logTransformPathToOttlPath(operator.ParseFrom), value,
								),
							}, " and ")
							appendStatement(fmt.Sprintf("set(severity_number, SEVERITY_NUMBER_%s)", strings.ToUpper(severity)), whereClause)
							appendStatement(fmt.Sprintf(`set(severity_text, "%s")`, strings.ToUpper(severity)), whereClause)
						}
					}
				}
			} else if operator.Type == "trace_parser" {
				// panic("TODO(Raj): Implement trace parser translation")
				if operator.TraceId != nil && len(operator.TraceId.ParseFrom) > 0 {
					parseFromNotNilCheck, err := fieldNotNilCheck(operator.TraceId.ParseFrom)
					if err != nil {
						return nil, fmt.Errorf(
							"couldn't generate nil check for TraceId.parseFrom %s: %w", operator.Name, err,
						)
					}
					// TODO(Raj): Also check for trace id regex pattern
					appendStatement(
						fmt.Sprintf(`set(trace_id.string, %s)`, logTransformPathToOttlPath(operator.TraceId.ParseFrom)),
						exprForOttl(parseFromNotNilCheck),
					)
				}

				if operator.SpanId != nil && len(operator.SpanId.ParseFrom) > 0 {
					parseFromNotNilCheck, err := fieldNotNilCheck(operator.SpanId.ParseFrom)
					if err != nil {
						return nil, fmt.Errorf(
							"couldn't generate nil check for TraceId.parseFrom %s: %w", operator.Name, err,
						)
					}
					// TODO(Raj): Also check for span id regex pattern
					appendStatement(
						fmt.Sprintf("set(span_id.string, %s)", logTransformPathToOttlPath(operator.SpanId.ParseFrom)),
						exprForOttl(parseFromNotNilCheck),
					)

				}

				if operator.TraceFlags != nil && len(operator.TraceFlags.ParseFrom) > 0 {

					parseFromNotNilCheck, err := fieldNotNilCheck(operator.TraceFlags.ParseFrom)
					if err != nil {
						return nil, fmt.Errorf(
							"couldn't generate nil check for TraceId.parseFrom %s: %w", operator.Name, err,
						)
					}
					// TODO(Raj): Also check for trace flags hex regex pattern
					appendStatement(
						fmt.Sprintf(`set(flags, HexToInt(%s))`, logTransformPathToOttlPath(operator.TraceFlags.ParseFrom)),
						exprForOttl(parseFromNotNilCheck),
					)
				}

			} else {
				return nil, fmt.Errorf("unsupported pipeline operator type: %s", operator.Type)
			}

		}
	}

	removePipelineMarker()

	return ottlStatements, nil
}

// a.b?.c -> ["a", "b", "c"]
// a.b["c.d"].e -> ["a", "b", "c.d", "e"]
func pathParts(path string) []string {
	path = strings.ReplaceAll(path, "?.", ".")

	// Split once from the right to include the rightmost membership op and everything after it.
	// Eg: `attributes.test["a.b"].value["c.d"].e` would result in `attributes.test["a.b"].value` and `["c.d"].e`
	memberOpParts := rSplitAfterN(path, "[", 2)

	if len(memberOpParts) < 2 {
		// there is no [] access in fieldPath
		return strings.Split(path, ".")
	}

	// recursively get parts for path prefix before rightmost membership op (`attributes.test["a.b"].value`)
	parts := pathParts(memberOpParts[0])

	suffixParts := strings.SplitAfter(memberOpParts[1], "]") // ["c.d"].e -> `["c.d"]`, `.e`

	// add key used in membership op ("c.d")
	parts = append(parts, suffixParts[0][2:len(suffixParts[0])-2])

	// add parts for path after the membership op ("e")
	if len(suffixParts[1]) > 0 {
		parts = append(parts, strings.Split(suffixParts[1][1:], ".")...)
	}

	return parts
}

// converts a logtransform path to an equivalent ottl path
// For details, see https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/pkg/ottl/contexts/ottllog#paths
func logTransformPathToOttlPath(path string) string {
	if !(strings.HasPrefix(path, "attributes") || strings.HasPrefix(path, "resource")) {
		return path
	}

	parts := pathParts(path)

	ottlPathParts := []string{parts[0]}

	if ottlPathParts[0] == "resource" {
		ottlPathParts[0] = "resource.attributes"
	}

	for _, p := range parts[1:] {
		ottlPathParts = append(ottlPathParts, fmt.Sprintf(`["%s"]`, p))
	}

	return strings.Join(ottlPathParts, "")
}

func escapeDoubleQuotesForOttl(str string) string {
	return strings.ReplaceAll(
		strings.ReplaceAll(str, `\`, `\\`), `"`, `\"`,
	)
}

func exprForOttl(expr string) string {
	return fmt.Sprintf(`EXPR("%s")`, escapeDoubleQuotesForOttl(expr))
}
