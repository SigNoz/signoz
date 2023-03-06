package model

import (
	"encoding/json"

	"github.com/pkg/errors"
)

// Pipeline is stored and also deployed finally to collector config
type Pipeline struct {
	Id      string `json:"id,omitempty" db:"id"`
	OrderId string `json:"orderId" db:"order_id"`
	Name    string `json:"name,omitempty" db:"name"`
	Alias   string `json:"alias" db:"alias"`
	Enabled bool   `json:"enabled" db:"enabled"`
	Filter  string `json:"filter" db:"filter"`
	// configuration for pipeline
	RawConfig string `db:"config_json"`

	Config []PipelineOperator `json:"config"`

	Creator
	Updater
}

type Processor struct {
	Operators []PipelineOperator `json:"operators" yaml:"operators"`
}

type PipelineOperator struct {
	Type        string           `json:"type" yaml:"type" mapstructure:"type"`
	ParseTo     string           `json:"parse_to,omitempty" yaml:"parse_to,omitempty" mapstructure:"parse_to"`
	Pattern     string           `json:"pattern,omitempty" yaml:"pattern,omitempty" mapstructure:"pattern"`
	Output      string           `json:"output,omitempty" yaml:"output,omitempty" mapstructure:"output"`
	Regex       string           `json:"regex,omitempty" yaml:"regex,omitempty" mapstructure:"regex"`
	ID          string           `json:"id,omitempty" yaml:"id,omitempty" mapstructure:"id"`
	ParseFrom   string           `json:"parse_from,omitempty" yaml:"parse_from,omitempty" mapstructure:"parse_from"`
	Timestamp   *TimestampParser `json:"timestamp,omitempty" yaml:"timestamp,omitempty" mapstructure:"timestamp"`
	TraceParser *TraceParser     `json:"trace_parser,omitempty" yaml:"trace_parser,omitempty" mapstructure:"trace_parser"`
	Field       string           `json:"field,omitempty" yaml:"field,omitempty" mapstructure:"field"`
	Value       string           `json:"value,omitempty" yaml:"value,omitempty" mapstructure:"value"`
	From        string           `json:"from,omitempty" yaml:"from,omitempty" mapstructure:"from"`
	To          string           `json:"to,omitempty"  yaml:"to,omitempty" mapstructure:"to"`
	Expr        string           `json:"expr,omitempty" yaml:"expr,omitempty" mapstructure:"expr"`
	Routes      *[]Route         `json:"routes,omitempty" yaml:"routes,omitempty"`
	Fields      []string         `json:"fields,omitempty" yaml:"fields,omitempty"`
	Default     string           `json:"default,omitempty" yaml:"default,omitempty"`
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

func (i *Pipeline) ParseRawConfig() error {
	c := []PipelineOperator{}
	err := json.Unmarshal([]byte(i.RawConfig), &c)
	if err != nil {
		return errors.Wrap(err, "failed to parse ingestion rule config")
	}
	i.Config = c
	return nil
}
