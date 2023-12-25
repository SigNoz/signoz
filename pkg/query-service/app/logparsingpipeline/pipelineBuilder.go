package logparsingpipeline

import (
	"fmt"
	"slices"
	"strings"

	"github.com/antonmedv/expr"
	"github.com/antonmedv/expr/ast"
	"github.com/antonmedv/expr/parser"
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

func PreparePipelineProcessor(pipelines []Pipeline) (map[string]interface{}, []string, error) {
	processors := map[string]interface{}{}
	names := []string{}
	for _, v := range pipelines {
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
						"couldn't generate nil check for %s.parseFrom: %w", operator.Name, err,
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

			} else if operator.Type == "json_parser" {
				parseFromNotNilCheck, err := fieldNotNilCheck(operator.ParseFrom)
				if err != nil {
					return nil, fmt.Errorf(
						"couldn't generate nil check for %s.parseFrom: %w", operator.Name, err,
					)
				}
				operator.If = fmt.Sprintf(
					`%s && %s matches "^\\s*{.*}\\s*$"`, parseFromNotNilCheck, operator.ParseFrom,
				)

			} else if operator.Type == "add" {
				if strings.HasPrefix(operator.Value, "EXPR(") && strings.HasSuffix(operator.Value, ")") {
					expression := strings.TrimSuffix(strings.TrimPrefix(operator.Value, "EXPR("), ")")
					referencedFieldsNotNilCheck, err := fieldsReferencedInExprNotNilCheck(expression)
					if err != nil {
						return nil, fmt.Errorf(
							"could not generate nil check for operator %s (add) value: %w",
							operator.Name, err,
						)
					}
					if referencedFieldsNotNilCheck != "" {
						operator.If = referencedFieldsNotNilCheck
					}
				}

			} else if operator.Type == "move" || operator.Type == "copy" {
				fromNotNilCheck, err := fieldNotNilCheck(operator.From)
				if err != nil {
					return nil, fmt.Errorf(
						"couldn't generate nil check for %s.From: %w", operator.Name, err,
					)
				}
				operator.If = fromNotNilCheck

			} else if operator.Type == "remove" {
				fieldNotNilCheck, err := fieldNotNilCheck(operator.Field)
				if err != nil {
					return nil, fmt.Errorf(
						"couldn't generate nil check for %s.Field: %w", operator.Name, err,
					)
				}
				operator.If = fieldNotNilCheck

			} else if operator.Type == "trace_parser" {
				cleanTraceParser(&operator)

			} else if operator.Type == "time_parser" {
				parseFromNotNilCheck, err := fieldNotNilCheck(operator.ParseFrom)
				if err != nil {
					return nil, fmt.Errorf(
						"couldn't generate nil check for %s.parseFrom: %w", operator.Name, err,
					)
				}
				operator.If = parseFromNotNilCheck

				if operator.LayoutType == "strptime" {
					regex, err := RegexForStrptimeLayout(operator.Layout)
					if err != nil {
						return nil, fmt.Errorf("could not generate time_parser processor: %w", err)
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
						"couldn't generate nil check for %s.parseFrom: %w", operator.Name, err,
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

	// Optional chaining before membership ops (attributes.test?.['member.field'].value) is not valid syntax.
	// Work around that by checking that the target of membership op is not nil first.
	// Eg: attributes?.test != nil && attributes.test['member.field']?.value != nil

	// Split once from the right before a membership op.
	// The example above would result in ["attributes.test", "['member.field'].value"]
	parts := rSplitAfterN(fieldPath, "[", 2)
	if len(parts) < 2 {
		// there is no [] access in fieldPath
		return fmt.Sprintf(
			"%s != nil", optionalChainedPath(fieldPath),
		), nil
	}

	// recursively generate nil check for the prefix (attributes.test)
	prefixCheck, err := fieldNotNilCheck(parts[0])
	if err != nil {
		return "", err
	}

	// generate nil check for suffix (attributes.test['member.field']?.value != nil)
	suffixParts := strings.SplitAfter(parts[1], "]") // "['member.field]", ".value"
	suffixPath := suffixParts[0]
	if len(suffixParts) > 1 {
		// "['member.field']?.value"
		suffixPath = fmt.Sprintf(
			"%s%s", suffixParts[0], optionalChainedPath(suffixParts[1]),
		)
	}
	// attributes.test['member.field']?.value != nil
	suffixCheck := fmt.Sprintf("%s%s != nil", parts[0], suffixPath)

	// If the membership op is for array/slice indexing, add check ensuring array is long enough
	// attributes.test[3] -> len(attributes.test) > 3 && attributes.test[3] != nil
	if !(strings.Contains(suffixParts[0], "'") || strings.Contains(suffixParts[0], `"`)) {
		suffixCheck = fmt.Sprintf(
			"len(%s) > %s && %s",
			parts[0], suffixParts[0][1:len(suffixParts[0])-1], suffixCheck,
		)
	}

	// If prefix is `attributes` or `resource` there is no need to add a nil check for
	// the prefix since all log records have non nil `attributes` and `resource` fields.
	if slices.Contains([]string{"attributes", "resource"}, parts[0]) {
		return suffixCheck, nil
	}

	return fmt.Sprintf("%s && %s", prefixCheck, suffixCheck), nil
}

// Split `str` after `sep` `N` times from the right.
// rSplitAfterN("a.b.c.d", ".", 2) -> ["a.b", "c", "d"]
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

func reverseString(s string) (result string) {
	result = ""
	for _, v := range s {
		result = string(v) + result
	}
	return
}

// Generate expression for checking that all fields referenced in `expr`
// have a non nil value in log record.
func fieldsReferencedInExprNotNilCheck(expr string) (string, error) {
	// parse ast for expr
	exprAst, err := parser.Parse(expr)
	if err != nil {
		return "", fmt.Errorf("could not parse expr: %w", err)
	}

	// walk ast for expr to collect all member references.
	v := &exprFieldVisitor{}
	ast.Walk(&exprAst.Node, v)

	// Generating nil check for longest depth fields takes care of their prefixes too.
	// Eg: `attributes.test.value + len(attributes.test)` needs a nil check only for `attributes.test.value`
	longestDepthFields := []string{}
	for _, field := range v.members {
		if !slices.ContainsFunc(v.members, func(e string) bool {
			return len(e) > len(field) && strings.HasPrefix(e, field)
		}) {
			if strings.HasPrefix(field, "attributes") || strings.HasPrefix(field, "resource") {
				longestDepthFields = append(longestDepthFields, field)
			}
		}
	}

	fieldExprChecks := []string{}
	for _, field := range longestDepthFields {
		checkExpr, err := fieldNotNilCheck(field)
		if err != nil {
			return "", fmt.Errorf("could not create nil check for %s: %w", field, err)
		}
		fieldExprChecks = append(fieldExprChecks, fmt.Sprintf("(%s)", checkExpr))
	}

	return strings.Join(fieldExprChecks, " && "), nil
}

type exprFieldVisitor struct {
	members []string
}

func (v *exprFieldVisitor) Visit(node *ast.Node) {
	if n, ok := (*node).(*ast.MemberNode); ok {
		v.members = append(v.members, n.String())
	}
}
