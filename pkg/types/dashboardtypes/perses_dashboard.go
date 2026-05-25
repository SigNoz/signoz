package dashboardtypes

import (
	"bytes"
	"encoding/json"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/tagtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/perses/perses/pkg/model/api/v1/common"
	"k8s.io/apimachinery/pkg/util/validation"
)

const (
	SchemaVersion       = "v6"
	MaxTagsPerDashboard = 10
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

type DashboardV2MetadataBase struct {
	SchemaVersion string `json:"schemaVersion" required:"true"`
	Image         string `json:"image,omitempty"`
}

// ════════════════════════════════════════════════════════════════════════
// Postable
// ════════════════════════════════════════════════════════════════════════

type PostableDashboardV2 struct {
	DashboardV2MetadataBase
	Name string                 `json:"name" required:"true"`
	Tags []tagtypes.PostableTag `json:"tags"`
	Spec DashboardSpec          `json:"spec" required:"true"`
}

func (postable PostableDashboardV2) NewDashboardV2WithoutTags(orgID valuer.UUID, createdBy string, source Source) *DashboardV2 {
	now := time.Now()

	return &DashboardV2{
		Identifiable:            types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable:           types.TimeAuditable{CreatedAt: now, UpdatedAt: now},
		UserAuditable:           types.UserAuditable{CreatedBy: createdBy, UpdatedBy: createdBy},
		OrgID:                   orgID,
		Locked:                  source == SourceIntegration,
		Source:                  source,
		DashboardV2MetadataBase: postable.DashboardV2MetadataBase,
		Name:                    postable.Name,
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
	if p.Spec.Display.Name == "" {
		p.Spec.Display.Name = p.Name
	}
	return p.Validate()
}

func (p *PostableDashboardV2) Validate() error {
	if p.SchemaVersion != SchemaVersion {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "schemaVersion must be %q, got %q", SchemaVersion, p.SchemaVersion)
	}
	if err := validateDashboardName(p.Name); err != nil {
		return err
	}
	if err := p.validateTags(); err != nil {
		return err
	}
	return p.Spec.Validate()
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

func (p *PostableDashboardV2) validateTags() error {
	if len(p.Tags) > MaxTagsPerDashboard {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "a dashboard can have at most %d tags", MaxTagsPerDashboard)
	}
	for _, tag := range p.Tags {
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
