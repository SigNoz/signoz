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
				operator.If = fmt.Sprintf(
					`%s && %s matches "%s"`,
					exprCheckingFieldIsNotNil(operator.ParseFrom),
					operator.ParseFrom,
					strings.ReplaceAll(
						strings.ReplaceAll(operator.Regex, `\`, `\\`),
						`"`, `\"`,
					),
				)

			} else if operator.Type == "json_parser" {
				operator.If = fmt.Sprintf(
					`%s && %s matches "^\\s*{.*}\\s*$"`,
					exprCheckingFieldIsNotNil(operator.ParseFrom),
					operator.ParseFrom,
				)

			} else if operator.Type == "add" {
				if strings.HasPrefix(operator.Value, "EXPR(") && strings.HasSuffix(operator.Value, ")") {
					// TODO(Raj): Make this more comprehensive
					expression := strings.TrimSuffix(strings.TrimPrefix(operator.Value, "EXPR("), ")")
					ifExpr, err := exprCheckingReferencedLogFieldsAreNotNil(expression)
					if err != nil {
						return nil, fmt.Errorf(
							"could not generate nil check for operator %s (add) value: %w",
							operator.Name, err,
						)
					}
					if ifExpr != "" {
						operator.If = ifExpr
					}
				}

			} else if operator.Type == "move" || operator.Type == "copy" {
				operator.If = exprCheckingFieldIsNotNil(operator.From)

			} else if operator.Type == "remove" {
				operator.If = exprCheckingFieldIsNotNil(operator.Field)

			} else if operator.Type == "trace_parser" {
				cleanTraceParser(&operator)

			} else if operator.Type == "time_parser" {
				operator.If = exprCheckingFieldIsNotNil(operator.ParseFrom)

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
				operator.If = fmt.Sprintf(
					`%s && ( type(%s) == "string" || ( type(%s) in ["int", "float"] && %s == float(int(%s)) ) )`,
					exprCheckingFieldIsNotNil(operator.ParseFrom),
					operator.ParseFrom, operator.ParseFrom,
					operator.ParseFrom, operator.ParseFrom,
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

// Generates an expression that can be used to validate
// that a log record contains `fieldPath`
func exprCheckingFieldIsNotNil(fieldPath string) string {
	check, err := fieldNotNilCheck(fieldPath)
	if err != nil {
		panic(err)
	}
	return check
}

func fieldNotNilCheck(fieldPath string) (string, error) {
	_, err := expr.Compile(fieldPath)
	if err != nil {
		return "", err
	}

	// a.b?.c.d -> a?.b?.c?.d
	optionalChainedPath := func(path string) string {
		return strings.ReplaceAll(
			strings.ReplaceAll(path, "?.", "."), ".", "?.",
		)
	}

	parts := rSplitAfterN(fieldPath, "[", 2)
	if len(parts) < 2 {
		// there is no [] access in fieldPath
		return fmt.Sprintf(
			"%s != nil", optionalChainedPath(fieldPath),
		), nil
	}

	suffixParts := strings.SplitAfter(parts[1], "]")
	suffixPath := suffixParts[0]
	if len(suffixParts) > 1 {
		suffixPath = fmt.Sprintf(
			"%s%s", suffixParts[0], optionalChainedPath(suffixParts[1]),
		)
	}
	suffixCheck := fmt.Sprintf("%s%s != nil", parts[0], suffixPath)
	if !(strings.Contains(suffixParts[0], "'") || strings.Contains(suffixParts[0], `"`)) {
		// This is a slice indexing op
		suffixCheck = fmt.Sprintf(
			"len(%s) > %s && %s",
			parts[0], suffixParts[0][1:len(suffixParts[0])-1], suffixCheck,
		)
	}

	if slices.Contains([]string{"attributes", "resource"}, parts[0]) {
		return suffixCheck, nil
	}

	prefixCheck, err := fieldNotNilCheck(parts[0])
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%s && %s", prefixCheck, suffixCheck), nil
}

// Split `str` after `sep` `N` times from the right.
// rSplitAfterN("a.b.c.d", ".", 2) -> ["a.b", "c", "d"]
func rSplitAfterN(str string, sep string, n int) []string {
	reversedStr := reverse(str)
	parts := strings.SplitAfterN(reversedStr, sep, n)
	slices.Reverse(parts)
	result := []string{}
	for _, p := range parts {
		result = append(result, reverse(p))
	}
	return result
}

func reverse(s string) (result string) {
	for _, v := range s {
		result = string(v) + result
	}
	return
}

type visitor struct {
	members []string
}

func (v *visitor) Visit(node *ast.Node) {
	if n, ok := (*node).(*ast.MemberNode); ok {
		v.members = append(v.members, n.String())
	}
}

func exprCheckingReferencedLogFieldsAreNotNil(expr string) (string, error) {
	exprAst, err := parser.Parse(expr)
	if err != nil {
		return "", err
	}

	v := &visitor{}
	ast.Walk(&exprAst.Node, v)

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
