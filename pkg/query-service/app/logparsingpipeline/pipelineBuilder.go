package logparsingpipeline

import (
	"fmt"
	"regexp"
	"slices"
	"strings"

	"github.com/antonmedv/expr"
	"github.com/antonmedv/expr/ast"
	"github.com/antonmedv/expr/parser"
	"github.com/google/uuid"
	"github.com/pkg/errors"
	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/queryBuilderToExpr"
)

const (
	NOOP = "noop"
)

func CollectorConfProcessorName(p Pipeline) string {
	return constants.LogsPPLPfx + p.Alias
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

func PreparePipelineProcessor(pipelines []Pipeline) (map[string]interface{}, []string, error) {
	processors := map[string]interface{}{}
	names := []string{}

	ottlStatements := []string{}

	for _, pipeline := range pipelines {
		if pipeline.Enabled {

			enabledOperators := []PipelineOperator{}
			for _, op := range pipeline.Config {
				if op.Enabled {
					enabledOperators = append(enabledOperators, op)
				}
			}
			if len(enabledOperators) < 1 {
				continue
			}

			filterExpr, err := queryBuilderToExpr.Parse(pipeline.Filter)
			if err != nil {
				return nil, nil, fmt.Errorf("failed to parse pipeline filter: %w", err)
			}

			escapeDoubleQuotes := func(str string) string {
				return strings.ReplaceAll(
					strings.ReplaceAll(str, `\`, `\\`), `"`, `\"`,
				)
			}

			toOttlExpr := func(expr string) string {
				return fmt.Sprintf(`EXPR("%s")`, escapeDoubleQuotes(expr))
			}

			// We are generating one or more ottl statements per pipeline operator.
			// ottl statements have individual where conditions per statement
			// The simplest path is to add where clause for pipeline filter to each statement.
			// However, this breaks if an early operator statement in the pipeline ends up
			// modifying the fields referenced in the pipeline filter.
			// To work around this, we add statements before and after the actual pipeline
			// operator statements, that add and remove a pipeline specific marker, ensuring
			// all operators in a pipeline get to act on the log even if an op changes the filter referenced fields.
			pipelineMarker := uuid.NewString()
			addMarkerStatement := fmt.Sprintf(`set(attributes["__signoz_pipeline_marker__"], "%s")`, pipelineMarker)
			if len(filterExpr) > 0 {
				addMarkerStatement += fmt.Sprintf(" where %s", toOttlExpr(filterExpr))
			}
			ottlStatements = append(ottlStatements, addMarkerStatement)
			pipelineMarkerWhereClause := fmt.Sprintf(
				`attributes["__signoz_pipeline_marker__"] == "%s"`, pipelineMarker,
			)

			// to be called at the end
			removePipelineMarker := func() {
				ottlStatements = append(ottlStatements, fmt.Sprintf(
					`delete_key(attributes, "__signoz_pipeline_marker__") where %s`, pipelineMarkerWhereClause,
				))
			}

			appendStatement := func(statement string, additionalFilter string) {
				whereConditions := []string{pipelineMarkerWhereClause}
				// if len(filterExpr) > 0 {
				// 	whereConditions = append(
				// 		whereConditions,
				// 		toOttlExpr(filterExpr),
				// 	)
				// }
				if len(additionalFilter) > 0 {
					whereConditions = append(whereConditions, additionalFilter)
				}

				// if len(whereConditions) > 0 {
				statement = fmt.Sprintf(
					`%s where %s`, statement, strings.Join(whereConditions, " and "),
				)
				// }

				ottlStatements = append(ottlStatements, statement)
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
					toOttlExpr(pathNotNilCheck),
				)
			}

			// ensureIntermediateMaps := func(path string, additionalFilter string) {
			// parts := pathParts(path)
			//
			// }

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
							value = toOttlExpr(expression)
							fieldsNotNilCheck, err := fieldsReferencedInExprNotNilCheck(expression)
							if err != nil {
								panic(err)
								// return nil, fmt.Errorf(
								// "could'nt generate nil check for fields referenced in value expr of add operator %s: %w",
								// operator.Name, err,
								// )
							}
							if fieldsNotNilCheck != "" {
								condition = toOttlExpr(fieldsNotNilCheck)
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
							return nil, nil, fmt.Errorf(
								"couldn't generate nil check for parseFrom of regex op %s: %w", operator.Name, err,
							)
						}
						appendStatement(
							fmt.Sprintf(
								`merge_maps(%s, ExtractPatterns(%s, "%s"), "upsert")`,
								logTransformPathToOttlPath(operator.ParseTo),
								logTransformPathToOttlPath(operator.ParseFrom),
								escapeDoubleQuotes(operator.Regex),
							),
							toOttlExpr(parseFromNotNilCheck),
						)

					} else if operator.Type == "grok_parser" {
						parseFromNotNilCheck, err := fieldNotNilCheck(operator.ParseFrom)
						if err != nil {
							return nil, nil, fmt.Errorf(
								"couldn't generate nil check for parseFrom of grok op %s: %w", operator.Name, err,
							)
						}
						appendStatement(
							fmt.Sprintf(
								`merge_maps(%s, GrokParse(%s, "%s"), "upsert")`,
								logTransformPathToOttlPath(operator.ParseTo),
								logTransformPathToOttlPath(operator.ParseFrom),
								escapeDoubleQuotes(operator.Pattern),
							),
							toOttlExpr(parseFromNotNilCheck),
						)

					} else if operator.Type == "json_parser" {
						parseFromNotNilCheck, err := fieldNotNilCheck(operator.ParseFrom)
						if err != nil {
							return nil, nil, fmt.Errorf(
								"couldn't generate nil check for parseFrom of json parser op %s: %w", operator.Name, err,
							)
						}
						whereClause := strings.Join([]string{
							toOttlExpr(parseFromNotNilCheck),
							fmt.Sprintf(`IsMatch(%s, "^\\s*{.*}\\s*$")`, logTransformPathToOttlPath(operator.ParseFrom)),
						}, " and ")

						// appendStatement(
						// 	fmt.Sprintf(
						// 		`merge_maps(%s, ParseJSON(%s), "upsert")`,
						// 		logTransformPathToOttlPath(operator.ParseTo),
						// 		logTransformPathToOttlPath(operator.ParseFrom),
						// 	),
						// 	whereClause,
						// )
						appendMapExtractStatements(
							whereClause,
							fmt.Sprintf("ParseJSON(%s)", logTransformPathToOttlPath(operator.ParseFrom)),
							logTransformPathToOttlPath(operator.ParseTo),
						)

					} else if operator.Type == "time_parser" {
						parseFromNotNilCheck, err := fieldNotNilCheck(operator.ParseFrom)
						if err != nil {
							return nil, nil, fmt.Errorf(
								"couldn't generate nil check for parseFrom of json parser op %s: %w", operator.Name, err,
							)
						}

						whereClauseParts := []string{toOttlExpr(parseFromNotNilCheck)}

						if operator.LayoutType == "strptime" {
							regex, err := RegexForStrptimeLayout(operator.Layout)
							if err != nil {
								return nil, nil, fmt.Errorf(
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
								toOttlExpr(fmt.Sprintf(
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
							return nil, nil, fmt.Errorf("unsupported time layout %s", operator.LayoutType)
						}

					} else if operator.Type == "severity_parser" {
						parseFromNotNilCheck, err := fieldNotNilCheck(operator.ParseFrom)
						if err != nil {
							return nil, nil, fmt.Errorf(
								"couldn't generate nil check for parseFrom of severity parser %s: %w", operator.Name, err,
							)
						}

						for severity, valuesToMap := range operator.SeverityMapping {
							for _, value := range valuesToMap {
								// Special case for 2xx 3xx 4xx and 5xx
								isSpecialValue, err := regexp.MatchString(`^\s*[2|3|4|5]xx\s*$`, strings.ToLower(value))
								if err != nil {
									return nil, nil, fmt.Errorf("couldn't regex match for wildcard severity values: %w", err)
								}
								if isSpecialValue {
									whereClause := strings.Join([]string{
										toOttlExpr(parseFromNotNilCheck),
										toOttlExpr(fmt.Sprintf(`type(%s) in ["int", "float"] && %s == float(int(%s))`, operator.ParseFrom, operator.ParseFrom, operator.ParseFrom)),
										toOttlExpr(fmt.Sprintf(`string(int(%s)) matches "^%s$"`, operator.ParseFrom, fmt.Sprintf("%s[0-9]{2}", value[0:1]))),
									}, " and ")
									appendStatement(fmt.Sprintf("set(severity_number, SEVERITY_NUMBER_%s)", strings.ToUpper(severity)), whereClause)
									appendStatement(fmt.Sprintf(`set(severity_text, "%s")`, strings.ToUpper(severity)), whereClause)
								} else {
									whereClause := strings.Join([]string{
										toOttlExpr(parseFromNotNilCheck),
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
								return nil, nil, fmt.Errorf(
									"couldn't generate nil check for TraceId.parseFrom %s: %w", operator.Name, err,
								)
							}
							// TODO(Raj): Also check for trace id regex pattern
							appendStatement(
								fmt.Sprintf(`set(trace_id.string, %s)`, logTransformPathToOttlPath(operator.TraceId.ParseFrom)),
								toOttlExpr(parseFromNotNilCheck),
							)
						}

						if operator.SpanId != nil && len(operator.SpanId.ParseFrom) > 0 {
							parseFromNotNilCheck, err := fieldNotNilCheck(operator.SpanId.ParseFrom)
							if err != nil {
								return nil, nil, fmt.Errorf(
									"couldn't generate nil check for TraceId.parseFrom %s: %w", operator.Name, err,
								)
							}
							// TODO(Raj): Also check for span id regex pattern
							appendStatement(
								fmt.Sprintf("set(span_id.string, %s)", logTransformPathToOttlPath(operator.SpanId.ParseFrom)),
								toOttlExpr(parseFromNotNilCheck),
							)

						}

						if operator.TraceFlags != nil && len(operator.TraceFlags.ParseFrom) > 0 {

							parseFromNotNilCheck, err := fieldNotNilCheck(operator.TraceFlags.ParseFrom)
							if err != nil {
								return nil, nil, fmt.Errorf(
									"couldn't generate nil check for TraceId.parseFrom %s: %w", operator.Name, err,
								)
							}
							// TODO(Raj): Also check for trace flags hex regex pattern
							appendStatement(
								fmt.Sprintf(`set(flags, HexToInt(%s))`, logTransformPathToOttlPath(operator.TraceFlags.ParseFrom)),
								toOttlExpr(parseFromNotNilCheck),
							)
						}

					} else {
						return nil, nil, fmt.Errorf("unsupported pipeline operator type: %s", operator.Type)
					}

				}
			}

			removePipelineMarker()
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

func PreparePipelineProcessorOld(pipelines []Pipeline) (map[string]interface{}, []string, error) {
	processors := map[string]interface{}{}
	names := []string{}
	for pipelineIdx, v := range pipelines {
		if !v.Enabled {
			continue
		}

		operators, err := getOperators(v.Config)
		if err != nil {
			return nil, nil, errors.Wrap(err, "failed to prepare operators")
		}

		if len(operators) == 0 {
			continue
		}

		filterExpr, err := queryBuilderToExpr.Parse(v.Filter)
		if err != nil {
			return nil, nil, errors.Wrap(err, "failed to parse pipeline filter")
		}

		router := []PipelineOperator{
			{
				ID:   "router_signoz",
				Type: "router",
				Routes: &[]Route{
					{
						Output: v.Config[0].ID,
						Expr:   filterExpr,
					},
				},
				Default: NOOP,
			},
		}

		v.Config = append(router, operators...)

		// noop operator is needed as the default operator so that logs are not dropped
		noop := PipelineOperator{
			ID:   NOOP,
			Type: NOOP,
		}
		v.Config = append(v.Config, noop)

		processor := Processor{
			Operators: v.Config,
		}
		name := CollectorConfProcessorName(v)

		// Ensure name is unique
		if _, nameExists := processors[name]; nameExists {
			name = fmt.Sprintf("%s-%d", name, pipelineIdx)
		}

		processors[name] = processor
		names = append(names, name)
	}
	return processors, names, nil
}

func getOperators(ops []PipelineOperator) ([]PipelineOperator, error) {
	filteredOp := []PipelineOperator{}
	for i, operator := range ops {
		if operator.Enabled {
			if len(filteredOp) > 0 {
				filteredOp[len(filteredOp)-1].Output = operator.ID
			}

			if operator.Type == "regex_parser" {
				parseFromNotNilCheck, err := fieldNotNilCheck(operator.ParseFrom)
				if err != nil {
					return nil, fmt.Errorf(
						"couldn't generate nil check for parseFrom of regex op %s: %w", operator.Name, err,
					)
				}
				operator.If = fmt.Sprintf(
					`%s && %s matches "%s"`,
					parseFromNotNilCheck,
					operator.ParseFrom,
					strings.ReplaceAll(
						strings.ReplaceAll(operator.Regex, `\`, `\\`),
						`"`, `\"`,
					),
				)

			} else if operator.Type == "grok_parser" {
				parseFromNotNilCheck, err := fieldNotNilCheck(operator.ParseFrom)
				if err != nil {
					return nil, fmt.Errorf(
						"couldn't generate nil check for parseFrom of grok op %s: %w", operator.Name, err,
					)
				}
				operator.If = parseFromNotNilCheck

			} else if operator.Type == "json_parser" {
				parseFromNotNilCheck, err := fieldNotNilCheck(operator.ParseFrom)
				if err != nil {
					return nil, fmt.Errorf(
						"couldn't generate nil check for parseFrom of json parser op %s: %w", operator.Name, err,
					)
				}
				operator.If = fmt.Sprintf(
					`%s && %s matches "^\\s*{.*}\\s*$"`, parseFromNotNilCheck, operator.ParseFrom,
				)

			} else if operator.Type == "add" {
				if strings.HasPrefix(operator.Value, "EXPR(") && strings.HasSuffix(operator.Value, ")") {
					expression := strings.TrimSuffix(strings.TrimPrefix(operator.Value, "EXPR("), ")")
					fieldsNotNilCheck, err := fieldsReferencedInExprNotNilCheck(expression)
					if err != nil {
						return nil, fmt.Errorf(
							"could'nt generate nil check for fields referenced in value expr of add operator %s: %w",
							operator.Name, err,
						)
					}
					if fieldsNotNilCheck != "" {
						operator.If = fieldsNotNilCheck
					}
				}

			} else if operator.Type == "move" || operator.Type == "copy" {
				fromNotNilCheck, err := fieldNotNilCheck(operator.From)
				if err != nil {
					return nil, fmt.Errorf(
						"couldn't generate nil check for From field of %s op %s: %w", operator.Type, operator.Name, err,
					)
				}
				operator.If = fromNotNilCheck

			} else if operator.Type == "remove" {
				fieldNotNilCheck, err := fieldNotNilCheck(operator.Field)
				if err != nil {
					return nil, fmt.Errorf(
						"couldn't generate nil check for field to be removed by op %s: %w", operator.Name, err,
					)
				}
				operator.If = fieldNotNilCheck

			} else if operator.Type == "trace_parser" {
				cleanTraceParser(&operator)

			} else if operator.Type == "time_parser" {
				parseFromNotNilCheck, err := fieldNotNilCheck(operator.ParseFrom)
				if err != nil {
					return nil, fmt.Errorf(
						"couldn't generate nil check for parseFrom of time parser op %s: %w", operator.Name, err,
					)
				}
				operator.If = parseFromNotNilCheck

				if operator.LayoutType == "strptime" {
					regex, err := RegexForStrptimeLayout(operator.Layout)
					if err != nil {
						return nil, fmt.Errorf(
							"couldn't generate layout regex for time_parser %s: %w", operator.Name, err,
						)
					}

					operator.If = fmt.Sprintf(
						`%s && %s matches "%s"`, operator.If, operator.ParseFrom, regex,
					)
				} else if operator.LayoutType == "epoch" {
					valueRegex := `^\\s*[0-9]+\\s*$`
					if strings.Contains(operator.Layout, ".") {
						valueRegex = `^\\s*[0-9]+\\.[0-9]+\\s*$`
					}

					operator.If = fmt.Sprintf(
						`%s && string(%s) matches "%s"`, operator.If, operator.ParseFrom, valueRegex,
					)

				}
				// TODO(Raj): Maybe add support for gotime too eventually

			} else if operator.Type == "severity_parser" {
				parseFromNotNilCheck, err := fieldNotNilCheck(operator.ParseFrom)
				if err != nil {
					return nil, fmt.Errorf(
						"couldn't generate nil check for parseFrom of severity parser %s: %w", operator.Name, err,
					)
				}
				operator.If = fmt.Sprintf(
					`%s && ( type(%s) == "string" || ( type(%s) in ["int", "float"] && %s == float(int(%s)) ) )`,
					parseFromNotNilCheck, operator.ParseFrom, operator.ParseFrom, operator.ParseFrom, operator.ParseFrom,
				)

			}

			filteredOp = append(filteredOp, operator)
		} else if i == len(ops)-1 && len(filteredOp) != 0 {
			filteredOp[len(filteredOp)-1].Output = ""
		}
	}
	return filteredOp, nil
}

func cleanTraceParser(operator *PipelineOperator) {
	if operator.TraceId != nil && len(operator.TraceId.ParseFrom) < 1 {
		operator.TraceId = nil
	}
	if operator.SpanId != nil && len(operator.SpanId.ParseFrom) < 1 {
		operator.SpanId = nil
	}
	if operator.TraceFlags != nil && len(operator.TraceFlags.ParseFrom) < 1 {
		operator.TraceFlags = nil
	}
}

// Generates an expression checking that `fieldPath` has a non-nil value in a log record.
func fieldNotNilCheck(fieldPath string) (string, error) {
	_, err := expr.Compile(fieldPath)
	if err != nil {
		return "", fmt.Errorf("invalid fieldPath %s: %w", fieldPath, err)
	}

	// helper for turning `.` into `?.` in field paths.
	// Eg: a.b?.c.d -> a?.b?.c?.d
	optionalChainedPath := func(path string) string {
		return strings.ReplaceAll(
			strings.ReplaceAll(path, "?.", "."), ".", "?.",
		)
	}

	// Optional chaining before membership ops is not supported by expr.
	// Eg: The field `attributes.test["a.b"].value["c.d"].e` can't be checked using
	// the nil check `attributes.test?.["a.b"]?.value?.["c.d"]?.e != nil`
	// This needs to be worked around by checking that the target of membership op is not nil first.
	// Eg: attributes.test != nil && attributes.test["a.b"]?.value != nil && attributes.test["a.b"].value["c.d"]?.e != nil

	// Split once from the right to include the rightmost membership op and everything after it.
	// Eg: `attributes.test["a.b"].value["c.d"].e` would result in `attributes.test["a.b"].value` and `["c.d"].e`
	parts := rSplitAfterN(fieldPath, "[", 2)
	if len(parts) < 2 {
		// there is no [] access in fieldPath
		return fmt.Sprintf("%s != nil", optionalChainedPath(fieldPath)), nil
	}

	// recursively generate nil check for target of the rightmost membership op (attributes.test["a.b"].value)
	// should come out to be (attributes.test != nil && attributes.test["a.b"]?.value != nil)
	collectionNotNilCheck, err := fieldNotNilCheck(parts[0])
	if err != nil {
		return "", fmt.Errorf("couldn't generate nil check for %s: %w", parts[0], err)
	}

	// generate nil check for entire path.
	suffixParts := strings.SplitAfter(parts[1], "]") // ["c.d"], ".e"
	fullPath := parts[0] + suffixParts[0]
	if len(suffixParts) > 1 {
		// attributes.test["a.b"].value["c.d"]?.e
		fullPath += optionalChainedPath(suffixParts[1])
	}
	fullPathCheck := fmt.Sprintf("%s != nil", fullPath)

	// If the membership op is for array/slice indexing, add check ensuring array is long enough
	// attributes.test[3] -> len(attributes.test) > 3 && attributes.test[3] != nil
	if !(strings.Contains(suffixParts[0], "'") || strings.Contains(suffixParts[0], `"`)) {
		fullPathCheck = fmt.Sprintf(
			"len(%s) > %s && %s",
			parts[0], suffixParts[0][1:len(suffixParts[0])-1], fullPathCheck,
		)
	}

	// If prefix is `attributes` or `resource` there is no need to add a nil check for
	// the prefix since all log records have non nil `attributes` and `resource` fields.
	if slices.Contains([]string{"attributes", "resource"}, parts[0]) {
		return fullPathCheck, nil
	}

	return fmt.Sprintf("%s && %s", collectionNotNilCheck, fullPathCheck), nil
}

// Split `str` after `sep` from the right to create up to `n` parts.
// rSplitAfterN("a.b.c.d", ".", 3) -> ["a.b", ".c", ".d"]
func rSplitAfterN(str string, sep string, n int) []string {
	reversedStr := reverseString(str)
	parts := strings.SplitAfterN(reversedStr, sep, n)
	slices.Reverse(parts)
	result := []string{}
	for _, p := range parts {
		result = append(result, reverseString(p))
	}
	return result
}

func reverseString(s string) string {
	r := []rune(s)
	for i := 0; i < len(r)/2; i++ {
		j := len(s) - 1 - i
		r[i], r[j] = r[j], r[i]
	}
	return string(r)
}

// Generate expression for checking that all fields referenced in `expr` have a non nil value in log record.
// Eg: `attributes.x + len(resource.y)` will return the expression `attributes.x != nil && resource.y != nil`
func fieldsReferencedInExprNotNilCheck(expr string) (string, error) {
	referencedFields, err := logFieldsReferencedInExpr(expr)
	if err != nil {
		return "", fmt.Errorf("couldn't extract log fields referenced in expr %s: %w", expr, err)
	}

	// Generating nil check for deepest fields takes care of their prefixes too.
	// Eg: `attributes.test.value + len(attributes.test)` needs a nil check only for `attributes.test.value`
	deepestFieldRefs := []string{}
	for _, field := range referencedFields {
		isPrefixOfAnotherReferencedField := slices.ContainsFunc(
			referencedFields, func(e string) bool {
				return len(e) > len(field) && strings.HasPrefix(e, field)
			},
		)
		if !isPrefixOfAnotherReferencedField {
			deepestFieldRefs = append(deepestFieldRefs, field)
		}
	}

	fieldExprChecks := []string{}
	for _, field := range deepestFieldRefs {
		checkExpr, err := fieldNotNilCheck(field)
		if err != nil {
			return "", fmt.Errorf("could not create nil check for %s: %w", field, err)
		}
		fieldExprChecks = append(fieldExprChecks, fmt.Sprintf("(%s)", checkExpr))
	}

	return strings.Join(fieldExprChecks, " && "), nil
}

// Expr AST visitor for extracting referenced log fields
// See more at https://github.com/expr-lang/expr/blob/master/ast/visitor.go
type logFieldsInExprExtractor struct {
	referencedFields []string
}

func (v *logFieldsInExprExtractor) Visit(node *ast.Node) {
	if n, ok := (*node).(*ast.MemberNode); ok {
		memberRef := n.String()

		// coalesce ops end up as MemberNode right now for some reason.
		// ignore such member nodes.
		if strings.Contains(memberRef, "??") {
			return
		}

		if strings.HasPrefix(memberRef, "attributes") || strings.HasPrefix(memberRef, "resource") {
			v.referencedFields = append(v.referencedFields, memberRef)
		}
	}
}

func logFieldsReferencedInExpr(expr string) ([]string, error) {
	// parse abstract syntax tree for expr
	exprAst, err := parser.Parse(expr)
	if err != nil {
		return nil, fmt.Errorf("could not parse expr: %w", err)
	}

	// walk ast for expr to collect all member references.
	v := &logFieldsInExprExtractor{}
	ast.Walk(&exprAst.Node, v)

	return v.referencedFields, nil
}
