package profile

// Profile is the user-declared telemetry contract for one service and
// environment. Rules are profile-driven so AI-specific checks are not applied
// to ordinary backend services.
type Profile struct {
	APIVersion string   `yaml:"apiVersion" json:"apiVersion"`
	Kind       string   `yaml:"kind" json:"kind"`
	Metadata   Metadata `yaml:"metadata" json:"metadata"`
	Spec       Spec     `yaml:"spec" json:"spec"`
}

type Metadata struct {
	Name        string `yaml:"name" json:"name"`
	Service     string `yaml:"service" json:"service"`
	Environment string `yaml:"environment" json:"environment"`
}

type Spec struct {
	DataKind   string     `yaml:"data_kind" json:"data_kind"`
	Source     SourceSpec `yaml:"source" json:"source"`
	Signals    Signals    `yaml:"signals" json:"signals"`
	AuditRules []RuleSpec `yaml:"audit_rules" json:"audit_rules"`
}

type SourceSpec struct {
	Adapter  string `yaml:"adapter" json:"adapter"`
	Endpoint string `yaml:"endpoint" json:"endpoint"`
}

type Signals struct {
	Traces  SignalSpec `yaml:"traces" json:"traces"`
	Metrics SignalSpec `yaml:"metrics" json:"metrics"`
	Logs    SignalSpec `yaml:"logs" json:"logs"`
}

type SignalSpec struct {
	RootSpan string      `yaml:"root_span" json:"root_span"`
	Fields   []FieldSpec `yaml:"fields" json:"fields"`
	Spans    []SpanSpec  `yaml:"spans" json:"spans"`
}

type SpanSpec struct {
	Name   string      `yaml:"name" json:"name"`
	Fields []FieldSpec `yaml:"fields" json:"fields"`
}

type FieldSpec struct {
	Path     string `yaml:"path" json:"path"`
	Type     string `yaml:"type" json:"type"`
	Required bool   `yaml:"required" json:"required"`
}

type RuleSpec struct {
	ID                string `yaml:"id" json:"id"`
	Type              string `yaml:"type" json:"type"`
	Signal            string `yaml:"signal" json:"signal"`
	Field             string `yaml:"field" json:"field"`
	AppliesTo         string `yaml:"applies_to" json:"applies_to"`
	SpanName          string `yaml:"span_name" json:"span_name"`
	Severity          string `yaml:"severity" json:"severity"`
	MaxAge            string `yaml:"max_age" json:"max_age"`
	MaxDistinctValues int    `yaml:"max_distinct_values" json:"max_distinct_values"`
	Recommendation    string `yaml:"recommendation" json:"recommendation"`
}

func (p Profile) ServiceKey() string {
	return p.Metadata.Service + "|" + p.Metadata.Environment
}
