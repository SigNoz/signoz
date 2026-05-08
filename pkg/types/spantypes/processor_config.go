package spantypes

type SpanMappingProcessorConfig struct {
	Groups []SpanMappingGroup `yaml:"groups" json:"groups"`
}

type SpanMappingGroup struct {
	ID         string                 `yaml:"id" json:"id"`
	ExistsAny  SpanMappingExistsAny   `yaml:"exists_any" json:"exists_any"`
	Attributes []SpanMappingAttribute `yaml:"attributes" json:"attributes"`
}

type SpanMappingExistsAny struct {
	Attributes []string `yaml:"attributes,omitempty" json:"attributes,omitempty"`
	Resource   []string `yaml:"resource,omitempty" json:"resource,omitempty"`
}

type SpanMappingAttribute struct {
	Target  string   `yaml:"target" json:"target"`
	Context string   `yaml:"context,omitempty" json:"context,omitempty"`
	Action  string   `yaml:"action,omitempty" json:"action,omitempty"`
	Sources []string `yaml:"sources" json:"sources"`
}
