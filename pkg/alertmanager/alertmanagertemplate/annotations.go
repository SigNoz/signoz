package alertmanagertemplate

import (
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/prometheus/alertmanager/types"
)

// ExtractTemplatesFromAnnotations pulls the user-authored title and body
// templates off the well-known annotation keys attached by the rule manager.
// A template is returned only if every alert in the group carries the same
// value under that key; otherwise the empty string is returned for that slot
// (which causes Expand to fall back to the channel default).
func ExtractTemplatesFromAnnotations(alerts []*types.Alert) (titleTemplate, bodyTemplate string) {
	if len(alerts) == 0 {
		return "", ""
	}

	title := string(alerts[0].Annotations[ruletypes.AnnotationTitleTemplate])
	body := string(alerts[0].Annotations[ruletypes.AnnotationBodyTemplate])

	for _, a := range alerts[1:] {
		if title != "" && string(a.Annotations[ruletypes.AnnotationTitleTemplate]) != title {
			title = ""
		}
		if body != "" && string(a.Annotations[ruletypes.AnnotationBodyTemplate]) != body {
			body = ""
		}
		if title == "" && body == "" {
			break
		}
	}
	return title, body
}
