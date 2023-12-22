package logparsingpipeline

import (
	"fmt"
	"strings"

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
	pathParts := strings.Split(fieldPath, ".")
	path := strings.Join(pathParts, "?.")
	return fmt.Sprintf("%s != nil", path)
}
