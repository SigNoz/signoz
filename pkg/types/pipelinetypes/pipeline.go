package pipelinetypes

import (
	"encoding/json"
	"fmt"
	"regexp"
	"slices"
	"strings"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/query-service/queryBuilderToExpr"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/pkg/errors"
	"github.com/uptrace/bun"
)

type StoreablePipeline struct {
	bun.BaseModel `bun:"table:pipelines,alias:p"`

	types.UserAuditable
	types.TimeAuditable
	types.Identifiable
	OrgID        string `json:"-" bun:"org_id,notnull"`
	OrderID      int    `json:"orderId" bun:"order_id"`
	Enabled      bool   `json:"enabled" bun:"enabled"`
	Name         string `json:"name" bun:"name,type:varchar(400),notnull"`
	Alias        string `json:"alias" bun:"alias,type:varchar(20),notnull"`
	Description  string `json:"description" bun:"description,type:text"`
	FilterString string `json:"-" bun:"filter,type:text,notnull"`
	ConfigJSON   string `json:"-" bun:"config_json,type:text"`
}

type GettablePipeline struct {
	StoreablePipeline
	Filter *v3.FilterSet      `json:"filter"`
	Config []PipelineOperator `json:"config"`
}

func (i *GettablePipeline) ParseRawConfig() error {
	c := []PipelineOperator{}
	err := json.Unmarshal([]byte(i.ConfigJSON), &c)
	if err != nil {
		return errors.Wrap(err, "failed to parse ingestion rule config")
	}
	i.Config = c
	return nil
}

func (i *GettablePipeline) ParseFilter() error {
	f := v3.FilterSet{}
	err := json.Unmarshal([]byte(i.FilterString), &f)
	if err != nil {
		return errors.Wrap(err, "failed to parse filter")
	}
	i.Filter = &f
	return nil
}

type Processor struct {
	Operators []PipelineOperator `json:"operators" yaml:"operators"`
}

type PipelineOperator struct {
	Type    string `json:"type" yaml:"type"`
	ID      string `json:"id,omitempty" yaml:"id,omitempty"`
	Output  string `json:"output,omitempty" yaml:"output,omitempty"`
	OnError string `json:"on_error,omitempty" yaml:"on_error,omitempty"`
	If      string `json:"if,omitempty" yaml:"if,omitempty"`

	// don't need the following in the final config
	OrderId int    `json:"orderId" yaml:"-"`
	Enabled bool   `json:"enabled" yaml:"-"`
	Name    string `json:"name,omitempty" yaml:"-"`

	// optional keys depending on the type
	ParseTo      string `json:"parse_to,omitempty" yaml:"parse_to,omitempty"`
	Pattern      string `json:"pattern,omitempty" yaml:"pattern,omitempty"`
	Regex        string `json:"regex,omitempty" yaml:"regex,omitempty"`
	ParseFrom    string `json:"parse_from,omitempty" yaml:"parse_from,omitempty"`
	*TraceParser `yaml:",inline,omitempty"`
	Field        string   `json:"field,omitempty" yaml:"field,omitempty"`
	Value        string   `json:"value,omitempty" yaml:"value,omitempty"`
	From         string   `json:"from,omitempty" yaml:"from,omitempty"`
	To           string   `json:"to,omitempty"  yaml:"to,omitempty"`
	Expr         string   `json:"expr,omitempty" yaml:"expr,omitempty"`
	Routes       *[]Route `json:"routes,omitempty" yaml:"routes,omitempty"`
	Fields       []string `json:"fields,omitempty" yaml:"fields,omitempty"`
	Default      string   `json:"default,omitempty" yaml:"default,omitempty"`

	// time_parser fields.
	Layout     string `json:"layout,omitempty" yaml:"layout,omitempty"`
	LayoutType string `json:"layout_type,omitempty" yaml:"layout_type,omitempty"`

	// severity parser fields
	SeverityMapping       map[string][]string `json:"mapping,omitempty" yaml:"mapping,omitempty"`
	OverwriteSeverityText bool                `json:"overwrite_text,omitempty" yaml:"overwrite_text,omitempty"`
}

type TimestampParser struct {
	Layout     string `json:"layout" yaml:"layout"`
	LayoutType string `json:"layout_type" yaml:"layout_type"`
	ParseFrom  string `json:"parse_from" yaml:"parse_from"`
}

type TraceParser struct {
	TraceId    *ParseFrom `json:"trace_id,omitempty" yaml:"trace_id,omitempty"`
	SpanId     *ParseFrom `json:"span_id,omitempty" yaml:"span_id,omitempty"`
	TraceFlags *ParseFrom `json:"trace_flags,omitempty" yaml:"trace_flags,omitempty"`
}

type ParseFrom struct {
	ParseFrom string `json:"parse_from" yaml:"parse_from"`
}

type Route struct {
	Output string `json:"output" yaml:"output"`
	Expr   string `json:"expr" yaml:"expr"`
}

type PostablePipelines struct {
	Pipelines []PostablePipeline `json:"pipelines"`
}

// PostablePipeline captures user inputs in setting the pipeline

type PostablePipeline struct {
	ID          string             `json:"id"`
	OrderID     int                `json:"orderId"`
	Name        string             `json:"name"`
	Alias       string             `json:"alias"`
	Description string             `json:"description"`
	Enabled     bool               `json:"enabled"`
	Filter      *v3.FilterSet      `json:"filter"`
	Config      []PipelineOperator `json:"config"`
}

// IsValid checks if postable pipeline has all the required params
func (p *PostablePipeline) IsValid() error {
	if p.OrderID == 0 {
		return fmt.Errorf("orderId with value > 1 is required")
	}
	if p.Name == "" {
		return fmt.Errorf("pipeline name is required")
	}

	if p.Alias == "" {
		return fmt.Errorf("pipeline alias is required")
	}

	// check the filter
	_, err := queryBuilderToExpr.Parse(p.Filter)
	if err != nil {
		return fmt.Errorf("filter for pipeline %v is not correct: %v", p.Name, err.Error())
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
			return fmt.Errorf("output of operator %s cannot be nil", op.ID)
		}
		if i == (l-1) && op.Output != "" {
			return fmt.Errorf("output of operator %s should be empty", op.ID)
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

func isValidOperator(op PipelineOperator) error {
	if op.ID == "" {
		return errors.New("PipelineOperator.ID is required")
	}

	switch op.Type {
	case "json_parser":
		if op.ParseFrom == "" && op.ParseTo == "" {
			return fmt.Errorf("parse from and parse to of %s json operator cannot be empty", op.ID)
		}
	case "grok_parser":
		if op.Pattern == "" {
			return fmt.Errorf("pattern of %s grok operator cannot be empty", op.ID)
		}
	case "regex_parser":
		if op.Regex == "" {
			return fmt.Errorf("regex of %s regex operator cannot be empty", op.ID)
		}
		r, err := regexp.Compile(op.Regex)
		if err != nil {
			return fmt.Errorf("error compiling regex expression of %s regex operator", op.ID)
		}
		namedCaptureGroups := 0
		for _, groupName := range r.SubexpNames() {
			if groupName != "" {
				namedCaptureGroups++
			}
		}
		if namedCaptureGroups == 0 {
			return fmt.Errorf("no capture groups in regex expression of %s regex operator", op.ID)
		}
	case "copy":
		if op.From == "" || op.To == "" {
			return fmt.Errorf("from or to of %s copy operator cannot be empty", op.ID)
		}
	case "move":
		if op.From == "" || op.To == "" {
			return fmt.Errorf("from or to of %s move operator cannot be empty", op.ID)
		}
	case "add":
		if op.Field == "" || op.Value == "" {
			return fmt.Errorf("field or value of %s add operator cannot be empty", op.ID)
		}
	case "remove":
		if op.Field == "" {
			return fmt.Errorf("field of %s remove operator cannot be empty", op.ID)
		}
	case "trace_parser":
		if op.TraceParser == nil {
			return fmt.Errorf("field of %s remove operator cannot be empty", op.ID)
		}

		hasTraceIdParseFrom := (op.TraceParser.TraceId != nil && op.TraceParser.TraceId.ParseFrom != "")
		hasSpanIdParseFrom := (op.TraceParser.SpanId != nil && op.TraceParser.SpanId.ParseFrom != "")
		hasTraceFlagsParseFrom := (op.TraceParser.TraceFlags != nil && op.TraceParser.TraceFlags.ParseFrom != "")

		if !(hasTraceIdParseFrom || hasSpanIdParseFrom || hasTraceFlagsParseFrom) {
			return fmt.Errorf("one of trace_id, span_id, trace_flags of %s trace_parser operator must be present", op.ID)
		}

		if hasTraceIdParseFrom && !isValidOtelValue(op.TraceParser.TraceId.ParseFrom) {
			return fmt.Errorf("trace id can't be parsed from %s", op.TraceParser.TraceId.ParseFrom)
		}
		if hasSpanIdParseFrom && !isValidOtelValue(op.TraceParser.SpanId.ParseFrom) {
			return fmt.Errorf("span id can't be parsed from %s", op.TraceParser.SpanId.ParseFrom)
		}
		if hasTraceFlagsParseFrom && !isValidOtelValue(op.TraceParser.TraceFlags.ParseFrom) {
			return fmt.Errorf("trace flags can't be parsed from %s", op.TraceParser.TraceFlags.ParseFrom)
		}

	case "retain":
		if len(op.Fields) == 0 {
			return fmt.Errorf("fields of %s retain operator cannot be empty", op.ID)
		}

	case "time_parser":
		if op.ParseFrom == "" {
			return fmt.Errorf("parse from of time parsing processor %s cannot be empty", op.ID)
		}
		if op.LayoutType != "epoch" && op.LayoutType != "strptime" {
			// TODO(Raj): Maybe add support for gotime format
			return fmt.Errorf(
				"invalid format type '%s' of time parsing processor %s", op.LayoutType, op.ID,
			)
		}
		if op.Layout == "" {
			return fmt.Errorf("format can not be empty for time parsing processor %s", op.ID)
		}

		validEpochLayouts := []string{"s", "ms", "us", "ns", "s.ms", "s.us", "s.ns"}
		if op.LayoutType == "epoch" && !slices.Contains(validEpochLayouts, op.Layout) {
			return fmt.Errorf(
				"invalid epoch format '%s' of time parsing processor %s", op.LayoutType, op.ID,
			)
		}

		// TODO(Raj): Add validation for strptime layouts via
		// collector simulator maybe.
		if op.LayoutType == "strptime" {
			_, err := RegexForStrptimeLayout(op.Layout)
			if err != nil {
				return fmt.Errorf("invalid strptime format '%s' of time parsing processor %s: %w", op.LayoutType, op.ID, err)
			}
		}

	case "severity_parser":
		if op.ParseFrom == "" {
			return fmt.Errorf("parse from of severity parsing processor %s cannot be empty", op.ID)
		}

		validMappingLevels := []string{"trace", "debug", "info", "warn", "error", "fatal"}
		for k := range op.SeverityMapping {
			if !slices.Contains(validMappingLevels, strings.ToLower(k)) {
				return fmt.Errorf("%s is not a valid severity in processor %s", k, op.ID)
			}
		}

	default:
		return fmt.Errorf("operator type %s not supported for %s, use one of (grok_parser, regex_parser, copy, move, add, remove, trace_parser, retain)", op.Type, op.ID)
	}

	if !isValidOtelValue(op.ParseFrom) ||
		!isValidOtelValue(op.ParseTo) ||
		!isValidOtelValue(op.From) ||
		!isValidOtelValue(op.To) ||
		!isValidOtelValue(op.Field) {
		valueErrStr := "value should have prefix of body, attributes, resource"
		return fmt.Errorf("%s for operator Id %s", valueErrStr, op.ID)
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
