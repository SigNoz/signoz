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
	type alias PostableNotificationChannel
	var tmp alias
	if err := decodeStrict(data, &tmp); err != nil {
		return err
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
// Updatable
// ════════════════════════════════════════════════════════════════════════

// Name is immutable, and DisplayName cannot be edited until the routing
// policies and rules referencing it migrate onto Name.
type UpdatableNotificationChannel struct {
	Config ChannelConfig `json:"config" required:"true"`
}

func (u *UpdatableNotificationChannel) UnmarshalJSON(data []byte) error {
	if err := decodeChannelConfigBody(data, &u.Config); err != nil {
		return err
	}

	return u.Validate()
}

func (u *UpdatableNotificationChannel) Validate() error {
	return u.Config.Validate()
}

// ════════════════════════════════════════════════════════════════════════
// Testable
// ════════════════════════════════════════════════════════════════════════

// It carries no name because nothing is persisted: the receiver a test builds
// is thrown away once the notification is delivered.
type TestableNotificationChannel struct {
	Config ChannelConfig `json:"config" required:"true"`
}

func (t *TestableNotificationChannel) UnmarshalJSON(data []byte) error {
	if err := decodeChannelConfigBody(data, &t.Config); err != nil {
		return err
	}

	return t.Validate()
}

func (t *TestableNotificationChannel) Validate() error {
	return t.Config.Validate()
}

func decodeChannelConfigBody(data []byte, config *ChannelConfig) error {
	var body struct {
		Config ChannelConfig `json:"config"`
	}

	if err := decodeStrict(data, &body); err != nil {
		return err
	}

	*config = body.Config

	return nil
}

// decodeStrict rejects unknown fields. A nested UnmarshalJSON (ChannelConfig,
// then the spec) already reports which level failed, so its error is returned
// as it is rather than re-wrapped.
func decodeStrict(data []byte, target any) error {
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.DisallowUnknownFields()

	if err := dec.Decode(target); err != nil {
		if errors.Ast(err, errors.TypeInvalidInput) {
			return err
		}
		return errors.WrapInvalidInputf(err, ErrCodeAlertmanagerChannelInvalid, "%s", err.Error())
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

// ════════════════════════════════════════════════════════════════════════
// Listed
// ════════════════════════════════════════════════════════════════════════

// ListedNotificationChannel carries no configuration. The spec, credentials
// included, is only returned by a fetch by ID.
type ListedNotificationChannel struct {
	ID          valuer.UUID `json:"id" required:"true"`
	Name        string      `json:"name" required:"true"`
	DisplayName string      `json:"displayName" required:"true"`
	Kind        ChannelKind `json:"kind" required:"true"`
	CreatedAt   time.Time   `json:"createdAt" required:"true"`
	UpdatedAt   time.Time   `json:"updatedAt" required:"true"`
}

// ListableNotificationChannel is one page of the channel list. Total counts every
// channel the filter matches, not just the ones on the page.
type ListableNotificationChannel struct {
	Channels []*ListedNotificationChannel `json:"channels" required:"true" nullable:"false"`
	Total    int64                        `json:"total" required:"true"`
}
