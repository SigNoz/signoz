package logparsingpipeline

import (
	"encoding/json"
	"time"

	"github.com/pkg/errors"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

// Pipeline is stored and also deployed finally to collector config
type Pipeline struct {
	Id          string        `json:"id,omitempty" db:"id"`
	OrderId     int           `json:"orderId" db:"order_id"`
	Name        string        `json:"name,omitempty" db:"name"`
	Alias       string        `json:"alias" db:"alias"`
	Description *string       `json:"description" db:"description"`
	Enabled     bool          `json:"enabled" db:"enabled"`
	Filter      *v3.FilterSet `json:"filter" db:"filter"`

	// configuration for pipeline
	RawConfig string `db:"config_json" json:"-"`

	Config []PipelineOperator `json:"config"`

	// Updater not required as any change will result in new version
	Creator
}

type Creator struct {
	CreatedBy string    `json:"createdBy" db:"created_by"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
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

func (i *Pipeline) ParseRawConfig() error {
	c := []PipelineOperator{}
	err := json.Unmarshal([]byte(i.RawConfig), &c)
	if err != nil {
		return errors.Wrap(err, "failed to parse ingestion rule config")
	}
	i.Config = c
	return nil
}
