package alertmanagertypes

import (
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/common/model"
)

const (
	AnnotationRelatedLogs   = "related_logs"
	AnnotationRelatedTraces = "related_traces"
)

const (
	relatedLogsLabel   = "View Related Logs"
	relatedTracesLabel = "View Related Traces"
)

type RelatedLink struct {
	Label string
	URL   string
}

// BuildRelatedLinks accepts every annotation shape that reaches it: model.LabelSet on
// raw alerts, template.KV in channel templates and map[string]any after custom
// template preprocessing.
func BuildRelatedLinks(annotations any) []RelatedLink {
	var links []RelatedLink

	if url := lookupAnnotation(annotations, AnnotationRelatedLogs); url != "" {
		links = append(links, RelatedLink{Label: relatedLogsLabel, URL: url})
	}
	if url := lookupAnnotation(annotations, AnnotationRelatedTraces); url != "" {
		links = append(links, RelatedLink{Label: relatedTracesLabel, URL: url})
	}

	return links
}

func lookupAnnotation(annotations any, key string) string {
	switch m := annotations.(type) {
	case model.LabelSet:
		return string(m[model.LabelName(key)])
	case template.KV:
		return m[key]
	case map[string]string:
		return m[key]
	case map[string]any:
		value, _ := m[key].(string)
		return value
	}

	return ""
}
