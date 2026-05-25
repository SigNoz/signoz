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
	Templates = []TemplateName{TemplateNameInvitationEmail, TemplateNameResetPassword}

	// AlertmanagerTemplates is a list of all the templates that are supported by the alertmanager.
	// This list should be updated whenever a new alertmanager template is added.
	AlertmanagerTemplates = []TemplateName{TemplateNameAlertEmailNotification}
)

var (
	TemplateNameInvitationEmail        = TemplateName{valuer.NewString("invitation")}
	TemplateNameResetPassword          = TemplateName{valuer.NewString("reset_password")}
	TemplateNameAPIKeyEvent            = TemplateName{valuer.NewString("api_key_event")}
	TemplateNameAlertEmailNotification = TemplateName{valuer.NewString("alert_email_notification")}
)

type TemplateName struct{ valuer.String }

func NewTemplateName(name string) (TemplateName, error) {
	switch name {
	case TemplateNameInvitationEmail.StringValue():
		return TemplateNameInvitationEmail, nil
	case TemplateNameResetPassword.StringValue():
		return TemplateNameResetPassword, nil
	case TemplateNameAPIKeyEvent.StringValue():
		return TemplateNameAPIKeyEvent, nil
	case TemplateNameAlertEmailNotification.StringValue():
		return TemplateNameAlertEmailNotification, nil
	default:
		return TemplateName{}, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid template name: %s", name)
	}
}

func NewContent(template *template.Template, data map[string]any) ([]byte, error) {
	buf := bytes.NewBuffer(nil)
	err := template.Execute(buf, data)
	if err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

type TemplateStore interface {
	Get(context.Context, TemplateName) (*template.Template, error)
}
