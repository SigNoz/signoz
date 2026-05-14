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
)

const (
	SchemaVersion       = "v6"
	MaxTagsPerDashboard = 5
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

	OrgID  valuer.UUID     `json:"orgId"`
	Locked bool            `json:"locked"`
	Data   DashboardV2Data `json:"data"`
}

type DashboardV2Data struct {
	Metadata DashboardV2Metadata `json:"metadata"`
	Spec     DashboardSpec       `json:"spec"`
}

type DashboardV2Metadata struct {
	DashboardV2MetadataBase
	Tags []*tagtypes.Tag `json:"tags"`
}

type DashboardV2MetadataBase struct {
	SchemaVersion string `json:"schemaVersion"`
	Image         string `json:"image,omitempty"`
}

// ════════════════════════════════════════════════════════════════════════
// Postable
// ════════════════════════════════════════════════════════════════════════

type PostableDashboardV2 struct {
	Metadata PostableDashboardV2Metadata `json:"metadata"`
	Spec     DashboardSpec               `json:"spec"`
}

func (postable PostableDashboardV2) NewDashboardV2WithoutTags(orgID valuer.UUID, createdBy string) *DashboardV2 {
	now := time.Now()

	return &DashboardV2{
		Identifiable:  types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{CreatedAt: now, UpdatedAt: now},
		UserAuditable: types.UserAuditable{CreatedBy: createdBy, UpdatedBy: createdBy},
		OrgID:         orgID,
		Locked:        false,
		Data: DashboardV2Data{
			Metadata: postable.Metadata.toDashboardV2Metadata(orgID),
			Spec:     postable.Spec,
		},
	}
}

type PostableDashboardV2Metadata struct {
	DashboardV2MetadataBase
	Tags []tagtypes.PostableTag `json:"tags"`
}

func (m PostableDashboardV2Metadata) toDashboardV2Metadata(orgID valuer.UUID) DashboardV2Metadata {
	return DashboardV2Metadata{
		DashboardV2MetadataBase: m.DashboardV2MetadataBase,
		Tags:                    tagtypes.NewTagsFromPostableTags(orgID, coretypes.KindDashboard, m.Tags),
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
	return p.Validate()
}

func (p *PostableDashboardV2) Validate() error {
	if p.Metadata.SchemaVersion != SchemaVersion {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "metadata.schemaVersion must be %q, got %q", SchemaVersion, p.Metadata.SchemaVersion)
	}
	if p.Spec.Display == nil || p.Spec.Display.Name == "" {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "spec.display.name is required")
	}
	if err := p.validateTags(); err != nil {
		return err
	}
	return p.Spec.Validate()
}

func (p *PostableDashboardV2) validateTags() error {
	if len(p.Metadata.Tags) > MaxTagsPerDashboard {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "a dashboard can have at most %d tags", MaxTagsPerDashboard)
	}
	for _, tag := range p.Metadata.Tags {
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

	OrgID  valuer.UUID             `json:"orgId"`
	Locked bool                    `json:"locked"`
	Data   GettableDashboardV2Data `json:"data"`
}

type GettableDashboardV2Data struct {
	Metadata GettableDashboardV2Metadata `json:"metadata"`
	Spec     DashboardSpec               `json:"spec"`
}

type GettableDashboardV2Metadata struct {
	DashboardV2MetadataBase
	Tags []*tagtypes.GettableTag `json:"tags"`
}

func (d DashboardV2) ToGettableDashboardV2() GettableDashboardV2 {
	return GettableDashboardV2{
		Identifiable:  d.Identifiable,
		TimeAuditable: d.TimeAuditable,
		UserAuditable: d.UserAuditable,
		OrgID:         d.OrgID,
		Locked:        d.Locked,
		Data:          d.Data.toGettableDashboardData(),
	}
}

func (d DashboardV2Data) toGettableDashboardData() GettableDashboardV2Data {
	return GettableDashboardV2Data{
		Metadata: GettableDashboardV2Metadata{
			DashboardV2MetadataBase: d.Metadata.DashboardV2MetadataBase,
			Tags:                    tagtypes.NewGettableTagsFromTags(d.Metadata.Tags),
		},
		Spec: d.Spec,
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
			SchemaVersion: d.Data.Metadata.SchemaVersion,
			Image:         d.Data.Metadata.Image,
		},
		Spec: d.Data.Spec,
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
		Data:          data,
	}, nil
}
