package dashboardtypes

import (
	"bytes"
	"crypto/rand"
	"encoding/json"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/tagtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/perses/spec/go/common"
	"k8s.io/apimachinery/pkg/util/validation"
)

const (
	SchemaVersion          = "v6"
	MaxTagsPerDashboard    = 10
	dashboardNameSuffixLen = 8
)

type DSLKey string

const (
	DSLKeyName        DSLKey = "name"
	DSLKeyDescription DSLKey = "description"
	DSLKeyCreatedAt   DSLKey = "created_at"
	DSLKeyUpdatedAt   DSLKey = "updated_at"
	DSLKeyCreatedBy   DSLKey = "created_by"
	DSLKeyLocked      DSLKey = "locked"
	DSLKeyPublic      DSLKey = "public"
)

// reservedDSLKeys are dashboard column-level filter names in the list-query DSL.
// A tag whose key collides with one of these would make the DSL ambiguous, so
// they're rejected (case-insensitively) at write time.
var reservedDSLKeys = map[DSLKey]struct{}{
	DSLKeyName:        {},
	DSLKeyDescription: {},
	DSLKeyCreatedAt:   {},
	DSLKeyUpdatedAt:   {},
	DSLKeyCreatedBy:   {},
	DSLKeyLocked:      {},
	DSLKeyPublic:      {},
}

type DashboardV2 struct {
	types.Identifiable
	types.TimeAuditable
	types.UserAuditable

	OrgID  valuer.UUID `json:"orgId" required:"true"`
	Locked bool        `json:"locked" required:"true"`
	Source Source      `json:"source" required:"true"`

	DashboardV2MetadataBase
	Name string          `json:"name" required:"true"`
	Tags []*tagtypes.Tag `json:"tags" required:"true"`
	Spec DashboardSpec   `json:"spec" required:"true"`
}

func (d *DashboardV2) CanUpdate() error {
	if d.Source == SourceIntegration {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeDashboardImmutable, "integration dashboards cannot be modified")
	}
	if d.Locked {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "cannot update a locked dashboard, please unlock the dashboard to update")
	}
	return nil
}

func (d *DashboardV2) Update(updatable UpdatableDashboardV2, updatedBy string, resolvedTags []*tagtypes.Tag) error {
	if err := d.CanUpdate(); err != nil {
		return err
	}
	if updatable.Name != d.Name {
		return errors.NewInvalidInputf(ErrCodeDashboardImmutable, "name is immutable; cannot change from %q to %q", d.Name, updatable.Name)
	}
	d.DashboardV2MetadataBase = updatable.DashboardV2MetadataBase
	d.Tags = resolvedTags
	d.Spec = updatable.Spec
	d.UpdatedBy = updatedBy
	d.UpdatedAt = time.Now()
	return nil
}

func (d *DashboardV2) CanLockUnlock(isAdmin bool, updatedBy string) error {
	if d.Source == SourceIntegration {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeDashboardImmutable, "integration dashboards cannot be locked or unlocked")
	}
	if d.Source == SourceSystem {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeDashboardImmutable, "system dashboards cannot be locked or unlocked")
	}
	if d.CreatedBy != updatedBy && !isAdmin {
		return errors.Newf(errors.TypeForbidden, errors.CodeForbidden, "you are not authorized to lock/unlock this dashboard")
	}
	return nil
}

func (d *DashboardV2) LockUnlock(lock bool, isAdmin bool, updatedBy string) error {
	if err := d.CanLockUnlock(isAdmin, updatedBy); err != nil {
		return err
	}
	d.Locked = lock
	d.UpdatedBy = updatedBy
	d.UpdatedAt = time.Now()
	return nil
}

type DashboardV2MetadataBase struct {
	SchemaVersion string `json:"schemaVersion" required:"true"`
	Image         string `json:"image,omitempty"`
}

// ════════════════════════════════════════════════════════════════════════
// Postable
// ════════════════════════════════════════════════════════════════════════

type PostableDashboardV2 struct {
	DashboardV2MetadataBase
	Name         string                 `json:"name,omitempty"`
	GenerateName bool                   `json:"generateName,omitempty"`
	Tags         []tagtypes.PostableTag `json:"tags" required:"true"`
	Spec         DashboardSpec          `json:"spec" required:"true"`
}

func (postable PostableDashboardV2) NewDashboardV2(orgID valuer.UUID, createdBy string, source Source) *DashboardV2 {
	now := time.Now()

	name := postable.Name
	if postable.GenerateName {
		name = generateDashboardName(postable.Spec.Display.Name)
	}

	return &DashboardV2{
		Identifiable:            types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable:           types.TimeAuditable{CreatedAt: now, UpdatedAt: now},
		UserAuditable:           types.UserAuditable{CreatedBy: createdBy, UpdatedBy: createdBy},
		OrgID:                   orgID,
		Locked:                  source == SourceIntegration,
		Source:                  source,
		DashboardV2MetadataBase: postable.DashboardV2MetadataBase,
		Name:                    name,
		Tags:                    tagtypes.NewTagsFromPostableTags(orgID, coretypes.KindDashboard, postable.Tags),
		Spec:                    postable.Spec,
	}
}

func (p *PostableDashboardV2) UnmarshalJSON(data []byte) error {
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.DisallowUnknownFields()
	type alias PostableDashboardV2
	var tmp alias
	if err := dec.Decode(&tmp); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "%s", err.Error())
	}
	*p = PostableDashboardV2(tmp)
	if p.Spec.Display == nil {
		p.Spec.Display = &common.Display{}
	}
	if !p.GenerateName && p.Spec.Display.Name == "" {
		p.Spec.Display.Name = p.Name
	}
	return p.Validate()
}

func (p *PostableDashboardV2) Validate() error {
	if p.SchemaVersion != SchemaVersion {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "schemaVersion must be %q, got %q", SchemaVersion, p.SchemaVersion)
	}
	if err := p.validateName(); err != nil {
		return err
	}
	if err := validateDashboardTags(p.Tags); err != nil {
		return err
	}
	return p.Spec.Validate()
}

func (p *PostableDashboardV2) validateName() error {
	if !p.GenerateName {
		return validateDashboardName(p.Name)
	}
	if p.Name != "" {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "name must be empty when generateName is true, got %q", p.Name)
	}
	if p.Spec.Display == nil || p.Spec.Display.Name == "" {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "spec.display.name is required when generateName is true")
	}
	return nil
}

// Matches https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#dns-label-names.
func validateDashboardName(name string) error {
	if name == "" {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "name is required")
	}
	if errs := validation.IsDNS1123Label(name); len(errs) > 0 {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "name %q is invalid: %s", name, strings.Join(errs, "; "))
	}
	return nil
}

func generateDashboardName(displayName string) string {
	const dns1123LabelMaxLen = 63
	suffixAlphabet := []byte("abcdefghijklmnopqrstuvwxyz0123456789")

	var b strings.Builder
	b.Grow(len(displayName))
	prevHyphen := false
	for _, r := range strings.ToLower(displayName) {
		switch {
		case (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9'):
			b.WriteRune(r)
			prevHyphen = false
		case b.Len() > 0 && !prevHyphen:
			b.WriteByte('-')
			prevHyphen = true
		}
	}
	prefix := strings.TrimRight(b.String(), "-")

	suffix := make([]byte, dashboardNameSuffixLen)
	if _, err := rand.Read(suffix); err != nil {
		panic(errors.WrapInternalf(err, errors.CodeInternal, "read random for dashboard name suffix"))
	}
	for i := range suffix {
		suffix[i] = suffixAlphabet[int(suffix[i])%len(suffixAlphabet)]
	}

	maxPrefix := dns1123LabelMaxLen - 1 - dashboardNameSuffixLen
	if len(prefix) > maxPrefix {
		prefix = strings.TrimRight(prefix[:maxPrefix], "-")
	}
	if prefix == "" {
		return string(suffix)
	}
	return prefix + "-" + string(suffix)
}

func validateDashboardTags(tags []tagtypes.PostableTag) error {
	if len(tags) > MaxTagsPerDashboard {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "a dashboard can have at most %d tags", MaxTagsPerDashboard)
	}
	for _, tag := range tags {
		if _, reserved := reservedDSLKeys[DSLKey(strings.ToLower(strings.TrimSpace(tag.Key)))]; reserved {
			return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "tag key %q is reserved", tag.Key)
		}
	}
	return nil
}

// ════════════════════════════════════════════════════════════════════════
// Gettable
// ════════════════════════════════════════════════════════════════════════

type GettableDashboardV2 struct {
	types.Identifiable
	types.TimeAuditable
	types.UserAuditable

	OrgID  valuer.UUID `json:"orgId" required:"true"`
	Locked bool        `json:"locked" required:"true"`
	Source Source      `json:"source" required:"true"`

	DashboardV2MetadataBase
	Name string                  `json:"name" required:"true"`
	Tags []*tagtypes.GettableTag `json:"tags" required:"true"`
	Spec DashboardSpec           `json:"spec" required:"true"`
}

func (d DashboardV2) ToGettableDashboardV2() GettableDashboardV2 {
	return GettableDashboardV2{
		Identifiable:            d.Identifiable,
		TimeAuditable:           d.TimeAuditable,
		UserAuditable:           d.UserAuditable,
		OrgID:                   d.OrgID,
		Locked:                  d.Locked,
		Source:                  d.Source,
		DashboardV2MetadataBase: d.DashboardV2MetadataBase,
		Name:                    d.Name,
		Tags:                    tagtypes.NewGettableTagsFromTags(d.Tags),
		Spec:                    d.Spec,
	}
}

// ════════════════════════════════════════════════════════════════════════
// Storable
// ════════════════════════════════════════════════════════════════════════

// StorableDashboardV2Data is exactly what serializes into the dashboard.data column.
type StorableDashboardV2Data struct {
	Metadata StorableDashboardV2Metadata `json:"metadata"`
	Spec     DashboardSpec               `json:"spec"`
}

func (s StorableDashboardV2Data) toStorableDashboardData() (StorableDashboardData, error) {
	raw, err := json.Marshal(s)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "marshal v2 dashboard data")
	}
	out := StorableDashboardData{}
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "unmarshal v2 dashboard data")
	}
	return out, nil
}

type StorableDashboardV2Metadata = DashboardV2MetadataBase

// ════════════════════════════════════════════════════════════════════════
// Updatable
// ════════════════════════════════════════════════════════════════════════

type UpdatableDashboardV2 struct {
	DashboardV2MetadataBase
	Name string                 `json:"name" required:"true"`
	Tags []tagtypes.PostableTag `json:"tags" required:"true"`
	Spec DashboardSpec          `json:"spec" required:"true"`
}

func (u *UpdatableDashboardV2) UnmarshalJSON(data []byte) error {
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.DisallowUnknownFields()
	type alias UpdatableDashboardV2
	var tmp alias
	if err := dec.Decode(&tmp); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "%s", err.Error())
	}
	*u = UpdatableDashboardV2(tmp)
	if u.Spec.Display == nil {
		u.Spec.Display = &common.Display{}
	}
	if u.Spec.Display.Name == "" {
		u.Spec.Display.Name = u.Name
	}
	return u.Validate()
}

func (u *UpdatableDashboardV2) Validate() error {
	if u.SchemaVersion != SchemaVersion {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "schemaVersion must be %q, got %q", SchemaVersion, u.SchemaVersion)
	}
	if err := validateDashboardName(u.Name); err != nil {
		return err
	}
	if err := validateDashboardTags(u.Tags); err != nil {
		return err
	}
	return u.Spec.Validate()
}

func (d DashboardV2) toUpdatableDashboardV2() UpdatableDashboardV2 {
	return UpdatableDashboardV2{
		DashboardV2MetadataBase: d.DashboardV2MetadataBase,
		Name:                    d.Name,
		Tags:                    tagtypes.NewPostableTagsFromTags(d.Tags),
		Spec:                    d.Spec,
	}
}

// ════════════════════════════════════════════════════════════════════════
// Convertors
// ════════════════════════════════════════════════════════════════════════

func (d *DashboardV2) ToStorableDashboard() (*StorableDashboard, error) {
	storableDashboardV2Data := StorableDashboardV2Data{
		Metadata: StorableDashboardV2Metadata{
			SchemaVersion: d.SchemaVersion,
			Image:         d.Image,
		},
		Spec: d.Spec,
	}

	data, err := storableDashboardV2Data.toStorableDashboardData()
	if err != nil {
		return nil, err
	}
	return &StorableDashboard{
		Identifiable:  types.Identifiable{ID: d.ID},
		TimeAuditable: d.TimeAuditable,
		UserAuditable: d.UserAuditable,
		OrgID:         d.OrgID,
		Locked:        d.Locked,
		Name:          d.Name,
		Data:          data,
		Source:        d.Source,
	}, nil
}

func (storable StorableDashboard) ToDashboardV2(tags []*tagtypes.Tag) (*DashboardV2, error) {
	metadata, _ := storable.Data["metadata"].(map[string]any)
	if metadata == nil || metadata["schemaVersion"] != SchemaVersion {
		return nil, errors.Newf(errors.TypeUnsupported, ErrCodeDashboardInvalidData, "dashboard %s is not in %s schema", storable.ID, SchemaVersion)
	}
	raw, err := json.Marshal(storable.Data)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "marshal stored v2 dashboard data")
	}
	var stored StorableDashboardV2Data
	if err := json.Unmarshal(raw, &stored); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "unmarshal stored v2 dashboard data")
	}
	return &DashboardV2{
		Identifiable:            storable.Identifiable,
		TimeAuditable:           storable.TimeAuditable,
		UserAuditable:           storable.UserAuditable,
		OrgID:                   storable.OrgID,
		Locked:                  storable.Locked,
		Source:                  storable.Source,
		DashboardV2MetadataBase: stored.Metadata,
		Name:                    storable.Name,
		Tags:                    tags,
		Spec:                    stored.Spec,
	}, nil
}
