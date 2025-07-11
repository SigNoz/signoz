package emailtypes

import (
	"bytes"
	"context"
	"html/template"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	// Templates is a list of all the templates that are supported by the emailing service.
	// This list should be updated whenever a new template is added.
	Templates = []TemplateName{TemplateNameInvitationEmail, TemplateNameUpdateRole}
)

var (
	TemplateNameInvitationEmail = TemplateName{valuer.NewString("invitation_email")}
	TemplateNameUpdateRole      = TemplateName{valuer.NewString("update_role")}
)

type TemplateName struct{ valuer.String }

func NewTemplateName(name string) (TemplateName, error) {
	switch name {
	case TemplateNameInvitationEmail.StringValue():
		return TemplateNameInvitationEmail, nil
	case TemplateNameUpdateRole.StringValue():
		return TemplateNameUpdateRole, nil
	default:
		return TemplateName{}, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid template name: %s", name)
	}
}

func NewContent(template *template.Template, data map[string]any) ([]byte, error) {
	buf := bytes.NewBuffer(nil)
	err := template.Execute(buf, data)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to execute template")
	}

	return buf.Bytes(), nil
}

type TemplateStore interface {
	Get(context.Context, TemplateName) (*template.Template, error)
}
