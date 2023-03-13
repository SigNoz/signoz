package logparsingpipeline

import (
	"fmt"

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

// // IsValid checks if postable pipeline has all the required params
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

		err := isValidOperator(op)
		if err != nil {
			return err
		}

	}
	return nil
}

func isValidOperator(op model.PipelineOperator) *model.ApiError {
	switch op.Type {
	case "grok_parser":
		if op.Pattern == "" {
			return model.BadRequestStr(fmt.Sprintf("pattern of %s grok operator cannot be empty", op.ID))
		}
	case "regex":
		if op.Pattern == "" {
			return model.BadRequestStr(fmt.Sprintf("pattern of %s regex operator cannot be empty", op.ID))
		}
	case "copy":
		if op.From == "" || op.To == "" {
			return model.BadRequestStr(fmt.Sprintf("from or to of %s copy operator cannot be empty", op.ID))
		}
	case "move":
		if op.From == "" || op.To == "" {
			return model.BadRequestStr(fmt.Sprintf("from or to of %s move operator cannot be empty", op.ID))
		}
	case "add":
		if op.Field == "" || op.Value == "" {
			return model.BadRequestStr(fmt.Sprintf("field or value of %s add operator cannot be empty", op.ID))
		}
	case "remove":
		if op.Field == "" {
			return model.BadRequestStr(fmt.Sprintf("field of %s remove operator cannot be empty", op.ID))
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
