package emailing

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types/emailtypes"
)

// Attachment represents a file to attach to an email.
type Attachment struct {
	Filename    string
	ContentType string
	Content     []byte
}

type Emailing interface {
	// Sends an HTML email to the given address with the given subject and template name and data.
	SendHTML(context.Context, string, string, emailtypes.TemplateName, map[string]any) error

	// SendPlainWithAttachments sends a plain-text email with the given subject and body,
	// and attaches the provided files.
	SendPlainWithAttachments(context.Context, string, string, string, []Attachment) error
}
