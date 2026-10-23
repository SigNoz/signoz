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

func BuildRelatedLinks(annotations model.LabelSet) []RelatedLink {
	return newRelatedLinks(string(annotations[AnnotationRelatedLogs]), string(annotations[AnnotationRelatedTraces]))
}

// buildRelatedLinksFromTemplateData backs the relatedLinks template func, where
// .Annotations is template.KV in channel templates and map[string]any after
// custom template preprocessing.
func buildRelatedLinksFromTemplateData(annotations any) []RelatedLink {
	return newRelatedLinks(lookupTemplateAnnotation(annotations, AnnotationRelatedLogs), lookupTemplateAnnotation(annotations, AnnotationRelatedTraces))
}

func newRelatedLinks(logsURL, tracesURL string) []RelatedLink {
	var links []RelatedLink

	if logsURL != "" {
		links = append(links, RelatedLink{Label: relatedLogsLabel, URL: logsURL})
	}
	if tracesURL != "" {
		links = append(links, RelatedLink{Label: relatedTracesLabel, URL: tracesURL})
	}

	return links
}

func lookupTemplateAnnotation(annotations any, key string) string {
	switch m := annotations.(type) {
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
