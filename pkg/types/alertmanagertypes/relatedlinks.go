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

// resolveRelatedLinksForTemplate backs the relatedLinks template func: channel templates pass template.Alert, rule templates pass the preprocessed map.
func resolveRelatedLinksForTemplate(alert any) []RelatedLink {
	switch a := alert.(type) {
	case template.Alert:
		return newRelatedLinks(a.Annotations[AnnotationRelatedLogs], a.Annotations[AnnotationRelatedTraces])
	case *template.Alert:
		if a == nil {
			return nil
		}
		return newRelatedLinks(a.Annotations[AnnotationRelatedLogs], a.Annotations[AnnotationRelatedTraces])
	case map[string]any:
		return newRelatedLinks(lookupTemplateDataAnnotation(a, AnnotationRelatedLogs), lookupTemplateDataAnnotation(a, AnnotationRelatedTraces))
	}

	return nil
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

func lookupTemplateDataAnnotation(data map[string]any, key string) string {
	switch annotations := data["annotations"].(type) {
	case template.KV:
		if value := annotations[key]; value != "" {
			return value
		}
	case map[string]string:
		if value := annotations[key]; value != "" {
			return value
		}
	case map[string]any:
		if value, _ := annotations[key].(string); value != "" {
			return value
		}
	}

	value, _ := data[key].(string)
	return value
}
