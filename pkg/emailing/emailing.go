package emailing

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types/emailtypes"
)

type Emailing interface {
	// Sends an HTML email to the given address with the given subject and template name and data.
	SendHTML(context.Context, string, string, emailtypes.TemplateName, map[string]any) error
}
