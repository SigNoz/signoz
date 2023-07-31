package logparsingpipeline

import (
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/antonmedv/expr"

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
func (p *PostablePipeline) IsValid() error {
	if p.OrderId == 0 {
		return fmt.Errorf("orderId with value > 1 is required")
	}
	if p.Name == "" {
		return fmt.Errorf("pipeline name is required")
	}

	if p.Alias == "" {
		return fmt.Errorf("pipeline alias is required")
	}

	if p.Filter == "" {
		return fmt.Errorf("pipeline filter is required")
	}

	// check the expression
	_, err := expr.Compile(p.Filter, expr.AsBool(), expr.AllowUndefinedVariables())
	if err != nil {
		return fmt.Errorf(fmt.Sprintf("filter for pipeline %v is not correct: %v", p.Name, err.Error()))
	}

	idUnique := map[string]struct{}{}
	outputUnique := map[string]struct{}{}

	l := len(p.Config)
	for i, op := range p.Config {
		if op.OrderId == 0 {
			return fmt.Errorf("orderId with value > 1 is required in operator")
		}
		if op.ID == "" {
			return fmt.Errorf("id of an operator cannot be empty")
		}
		if op.Type == "" {
			return fmt.Errorf("type of an operator cannot be empty")
		}
		if i != (l-1) && op.Output == "" {
			return fmt.Errorf(fmt.Sprintf("Output of operator %s cannot be nil", op.ID))
		}
		if i == (l-1) && op.Output != "" {
			return fmt.Errorf(fmt.Sprintf("Output of operator %s should be empty", op.ID))
		}

		if _, ok := idUnique[op.ID]; ok {
			return fmt.Errorf("duplicate id cannot be present")
		}
		if _, ok := outputUnique[op.Output]; ok {
			return fmt.Errorf("duplicate output cannot be present")
		}

		if op.ID == op.Output {
			return fmt.Errorf("id and output cannot be same")
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

func isValidOperator(op model.PipelineOperator) error {
	if op.ID == "" {
		return errors.New("PipelineOperator.ID is required.")
	}

	switch op.Type {
	case "json_parser":
		if op.ParseFrom == "" && op.ParseTo == "" {
			return fmt.Errorf(fmt.Sprintf("parse from and parse to of %s json operator cannot be empty", op.ID))
		}
	case "grok_parser":
		if op.Pattern == "" {
			return fmt.Errorf(fmt.Sprintf("pattern of %s grok operator cannot be empty", op.ID))
		}
	case "regex_parser":
		if op.Regex == "" {
			return fmt.Errorf(fmt.Sprintf("regex of %s regex operator cannot be empty", op.ID))
		}
		r, err := regexp.Compile(op.Regex)
		if err != nil {
			return fmt.Errorf(fmt.Sprintf("error compiling regex expression of %s regex operator", op.ID))
		}
		namedCaptureGroups := 0
		for _, groupName := range r.SubexpNames() {
			if groupName != "" {
				namedCaptureGroups++
			}
		}
		if namedCaptureGroups == 0 {
			return fmt.Errorf(fmt.Sprintf("no capture groups in regex expression of %s regex operator", op.ID))
		}
	case "copy":
		if op.From == "" || op.To == "" {
			return fmt.Errorf(fmt.Sprintf("from or to of %s copy operator cannot be empty", op.ID))
		}
	case "move":
		if op.From == "" || op.To == "" {
			return fmt.Errorf(fmt.Sprintf("from or to of %s move operator cannot be empty", op.ID))
		}
	case "add":
		if op.Field == "" || op.Value == "" {
			return fmt.Errorf(fmt.Sprintf("field or value of %s add operator cannot be empty", op.ID))
		}
	case "remove":
		if op.Field == "" {
			return fmt.Errorf(fmt.Sprintf("field of %s remove operator cannot be empty", op.ID))
		}
	case "traceParser":
		if op.TraceParser == nil {
			return fmt.Errorf(fmt.Sprintf("field of %s remove operator cannot be empty", op.ID))
		}

		if op.TraceParser.SpanId.ParseFrom == "" && op.TraceParser.TraceId.ParseFrom == "" && op.TraceParser.TraceFlags.ParseFrom == "" {
			return fmt.Errorf(fmt.Sprintf("one of trace_id,span_id,parse_from of %s traceParser operator must be present", op.ID))
		}
	case "retain":
		if len(op.Fields) == 0 {
			return fmt.Errorf(fmt.Sprintf("fields of %s retain operator cannot be empty", op.ID))
		}
	default:
		return fmt.Errorf(fmt.Sprintf("operator type %s not supported for %s, use one of (grok_parser, regex_parser, copy, move, add, remove, traceParser, retain)", op.Type, op.ID))
	}

	if !isValidOtelValue(op.ParseFrom) ||
		!isValidOtelValue(op.ParseTo) ||
		!isValidOtelValue(op.From) ||
		!isValidOtelValue(op.To) ||
		!isValidOtelValue(op.Field) {
		valueErrStr := "value should have prefix of body, attributes, resource"
		return fmt.Errorf(fmt.Sprintf("%s for operator Id %s", valueErrStr, op.ID))
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
