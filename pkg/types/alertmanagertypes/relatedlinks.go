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
	case map[string]any:
		annotations, _ := a["annotations"].(template.KV)
		return newRelatedLinks(annotations[AnnotationRelatedLogs], annotations[AnnotationRelatedTraces])
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
