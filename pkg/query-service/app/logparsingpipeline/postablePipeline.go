package logparsingpipeline

import (
	"fmt"
	"strings"

	"go.signoz.io/signoz/pkg/query-service/model"
)

// PostablePipelines are a list of user defined pielines
type PostablePipelines struct {
	Pipelines []PostablePipeline `json:"pipelines"`
}

// PostablePipeline captures user inputs in setting the pipeline

type PostablePipeline struct {
	Id          string                   `json:"id"`
	OrderId     int                      `json:"orderId"`
	Name        string                   `json:"name"`
	Alias       string                   `json:"alias"`
	Description string                   `json:"description"`
	Enabled     bool                     `json:"enabled"`
	Filter      string                   `json:"filter"`
	Config      []model.PipelineOperator `json:"config"`
}

// IsValid checks if postable pipeline has all the required params
func (p *PostablePipeline) IsValid() *model.ApiError {
	if p.OrderId == 0 {
		return model.BadRequestStr("orderId with value > 1 is required")
	}
	if p.Name == "" {
		return model.BadRequestStr("pipeline name is required")
	}

	if p.Alias == "" {
		return model.BadRequestStr("pipeline alias is required")
	}

	if p.Filter == "" {
		return model.BadRequestStr("pipeline filter is required")
	}

	idUnique := map[string]struct{}{}
	outputUnique := map[string]struct{}{}

	l := len(p.Config)
	for i, op := range p.Config {
		if op.OrderId == 0 {
			return model.BadRequestStr("orderId with value > 1 is required in operator")
		}
		if op.ID == "" {
			return model.BadRequestStr("id of an operator cannot be empty")
		}
		if op.Type == "" {
			return model.BadRequestStr("type of an operator cannot be empty")
		}
		if i != (l-1) && op.Output == "" {
			return model.BadRequestStr(fmt.Sprintf("Output of operator %s cannot be nil", op.ID))
		}
		if i == (l-1) && op.Output != "" {
			return model.BadRequestStr(fmt.Sprintf("Output of operator %s should be empty", op.ID))
		}

		if _, ok := idUnique[op.ID]; ok {
			return model.BadRequestStr("duplicate id cannot be present")
		}
		if _, ok := outputUnique[op.Output]; ok {
			return model.BadRequestStr("duplicate output cannot be present")
		}

		if op.ID == op.Output {
			return model.BadRequestStr("id and output cannot be same")
		}

		err := isValidOperator(op)
		if err != nil {
			return err
		}

		idUnique[op.ID] = struct{}{}
		outputUnique[op.Output] = struct{}{}
	}
	return nil
}

func isValidOperator(op model.PipelineOperator) *model.ApiError {
	valueErrStr := "value should have prefix of body, attributes, resource"
	switch op.Type {
	case "json_parser":
		if op.ParseFrom == "" && op.ParseTo == "" {
			return model.BadRequestStr(fmt.Sprintf("parse from and parse to of %s json operator cannot be empty", op.ID))
		}
		if !isValidOtelValue(op.ParseFrom) || !isValidOtelValue(op.ParseTo) {
			return model.BadRequestStr(fmt.Sprintf("%s  for operator Id %s", valueErrStr, op.ID))
		}
	case "grok_parser":
		if op.Pattern == "" {
			return model.BadRequestStr(fmt.Sprintf("pattern of %s grok operator cannot be empty", op.ID))
		}
		if !isValidOtelValue(op.ParseFrom) || !isValidOtelValue(op.ParseTo) {
			return model.BadRequestStr(fmt.Sprintf("%s  for operator Id %s", valueErrStr, op.ID))
		}
	case "regex":
		if op.Pattern == "" {
			return model.BadRequestStr(fmt.Sprintf("pattern of %s regex operator cannot be empty", op.ID))
		}
		if !isValidOtelValue(op.ParseFrom) || !isValidOtelValue(op.ParseTo) {
			return model.BadRequestStr(fmt.Sprintf("%s  for operator Id %s", valueErrStr, op.ID))
		}
	case "copy":
		if op.From == "" || op.To == "" {
			return model.BadRequestStr(fmt.Sprintf("from or to of %s copy operator cannot be empty", op.ID))
		}
		if !isValidOtelValue(op.From) || !isValidOtelValue(op.To) {
			return model.BadRequestStr(fmt.Sprintf("%s  for operator Id %s", valueErrStr, op.ID))
		}
	case "move":
		if op.From == "" || op.To == "" {
			return model.BadRequestStr(fmt.Sprintf("from or to of %s move operator cannot be empty", op.ID))
		}
		if !isValidOtelValue(op.From) || !isValidOtelValue(op.To) {
			return model.BadRequestStr(fmt.Sprintf("%s  for operator Id %s", valueErrStr, op.ID))
		}
	case "add":
		if op.Field == "" || op.Value == "" {
			return model.BadRequestStr(fmt.Sprintf("field or value of %s add operator cannot be empty", op.ID))
		}
		if !isValidOtelValue(op.Field) {
			return model.BadRequestStr(fmt.Sprintf("%s  for operator Id %s", valueErrStr, op.ID))
		}
	case "remove":
		if op.Field == "" {
			return model.BadRequestStr(fmt.Sprintf("field of %s remove operator cannot be empty", op.ID))
		}
		if !isValidOtelValue(op.From) || !isValidOtelValue(op.To) {
			return model.BadRequestStr(fmt.Sprintf("%s  for operator Id %s", valueErrStr, op.ID))
		}
	case "traceParser":
		if op.TraceParser == nil {
			return model.BadRequestStr(fmt.Sprintf("field of %s remove operator cannot be empty", op.ID))
		}

		if op.TraceParser.SpanId.ParseFrom == "" && op.TraceParser.TraceId.ParseFrom == "" && op.TraceParser.TraceFlags.ParseFrom == "" {
			return model.BadRequestStr(fmt.Sprintf("one of trace_id,span_id,parse_from of %s traceParser operator must be present", op.ID))
		}
	case "retain":
		if len(op.Fields) == 0 {
			return model.BadRequestStr(fmt.Sprintf("fields of %s retain operator cannot be empty", op.ID))
		}
	default:
		return model.BadRequestStr(fmt.Sprintf("operator type %s not supported for %s, use one of (grok_parser, regex_parser, copy, move, add, remove, traceParser, retain)", op.Type, op.ID))
	}
	return nil
}

func isValidOtelValue(val string) bool {
	if val == "" {
		return true
	}
	if !strings.HasPrefix(val, "body") &&
		!strings.HasPrefix(val, "attributes") &&
		!strings.HasPrefix(val, "resource") {
		return false
	}
	return true
}
