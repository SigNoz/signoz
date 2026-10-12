package alertmanagertypes

import (
	"net/url"
	"strings"

	"github.com/prometheus/common/model"
)

const (
	AnnotationRelatedLogs   = "related_logs"
	AnnotationRelatedTraces = "related_traces"

	AIObservabilityPathPrefix = "ai-observability"
)

// RelatedLink is one deep link a notification renders for an alert.
type RelatedLink struct {
	Label string
	URL   string
}

// RelatedLinks returns the deep links the ruler attached to an alert, in the
// order notifiers render them. Labels are decided here so every notifier shows
// the same text for the same link.
func RelatedLinks(annotations model.LabelSet) []RelatedLink {
	links := make([]RelatedLink, 0, 2)
	if link := string(annotations[AnnotationRelatedLogs]); link != "" {
		links = append(links, RelatedLink{Label: "View Related Logs", URL: link})
	}
	if link := string(annotations[AnnotationRelatedTraces]); link != "" {
		label := "View Related Traces"
		if IsAITracesLink(link) {
			label = "View Related AI Traces"
		}
		links = append(links, RelatedLink{Label: label, URL: link})
	}
	return links
}

// IsAITracesLink reports whether a related-traces link opens the AI
// observability section of the UI. Matched on the URL path so installs served
// under a path prefix still count. Channel templates call it as isAITracesLink.
func IsAITracesLink(link string) bool {
	u, err := url.Parse(link)
	return err == nil && strings.Contains(u.Path, "/"+AIObservabilityPathPrefix+"/")
}
