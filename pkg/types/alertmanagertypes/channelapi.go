package alertmanagertypes

import (
	"bytes"
	"encoding/json"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"k8s.io/apimachinery/pkg/util/validation"
)

// ════════════════════════════════════════════════════════════════════════
// Postable
// ════════════════════════════════════════════════════════════════════════

// Name is the immutable DNS1123 identity references will point at; DisplayName is the
// free-text label.
type PostableNotificationChannel struct {
	Name         string        `json:"name"`
	GenerateName bool          `json:"generateName"`
	DisplayName  string        `json:"displayName"`
	Config       ChannelConfig `json:"config" required:"true"`
}

func (p *PostableNotificationChannel) UnmarshalJSON(data []byte) error {
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.DisallowUnknownFields()

	type alias PostableNotificationChannel
	var tmp alias
	if err := dec.Decode(&tmp); err != nil {
		if errors.Ast(err, errors.TypeInvalidInput) {
			return err
		}
		return errors.WrapInvalidInputf(err, ErrCodeAlertmanagerChannelInvalid, "%s", err.Error())
	}

	*p = PostableNotificationChannel(tmp)

	if !p.GenerateName && p.DisplayName == "" {
		p.DisplayName = p.Name
	}

	if err := p.Validate(); err != nil {
		return err
	}

	if p.GenerateName {
		p.Name = generateChannelName(p.DisplayName)
	}

	return nil
}

func (p *PostableNotificationChannel) Validate() error {
	if err := p.validateName(); err != nil {
		return err
	}

	if p.DisplayName == "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "displayName is required")
	}

	if p.Name == DefaultReceiverName || p.DisplayName == DefaultReceiverName {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "name %q is reserved", DefaultReceiverName)
	}

	return p.Config.Validate()
}

func (p *PostableNotificationChannel) validateName() error {
	if p.GenerateName {
		if p.Name != "" {
			return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "name must be empty when generateName is true, got %q", p.Name)
		}
		if p.DisplayName == "" {
			return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "displayName is required when generateName is true")
		}
		return nil
	}

	if p.Name == "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "name is required")
	}

	if errs := validation.IsDNS1123Label(p.Name); len(errs) > 0 {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "name %q is invalid: %s", p.Name, strings.Join(errs, "; "))
	}

	return nil
}

// ════════════════════════════════════════════════════════════════════════
// Gettable
// ════════════════════════════════════════════════════════════════════════

type GettableNotificationChannel struct {
	Name        string        `json:"name" required:"true"`
	DisplayName string        `json:"displayName" required:"true"`
	Config      ChannelConfig `json:"config" required:"true"`
	ID          valuer.UUID   `json:"id" required:"true"`
	CreatedAt   time.Time     `json:"createdAt" required:"true"`
	UpdatedAt   time.Time     `json:"updatedAt" required:"true"`
}
