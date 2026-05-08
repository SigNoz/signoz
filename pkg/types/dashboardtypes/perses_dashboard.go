package dashboardtypes

import (
	"bytes"
	"encoding/json"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
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

	OrgID        valuer.UUID      `json:"orgId"`
	Locked       bool             `json:"locked"`
	Info         DashboardInfo    `json:"info"`
	PublicConfig *PublicDashboard `json:"publicConfig,omitempty"`
}

// DashboardInfo is the serializable view of a dashboard's contents — what the UI renders as "the dashboard JSON".
type DashboardInfo struct {
	StoredDashboardInfo
	Tags []*tagtypes.Tag `json:"tags,omitempty"`
}

// StoredDashboardInfo is exactly what serializes into the dashboard.data column.
type StoredDashboardInfo struct {
	Metadata DashboardMetadata `json:"metadata"`
	Data     DashboardData     `json:"data"`
}

type DashboardMetadata struct {
	SchemaVersion   string `json:"schemaVersion"`
	Image           string `json:"image,omitempty"`
	UploadedGrafana bool   `json:"uploadedGrafana"`
}

type PostableDashboardV2 struct {
	StoredDashboardInfo
	Tags []tagtypes.PostableTag `json:"tags,omitempty"`
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
	if p.Data.Display == nil || p.Data.Display.Name == "" {
		return errors.NewInvalidInputf(ErrCodeDashboardInvalidInput, "data.display.name is required")
	}
	if err := p.validateTags(); err != nil {
		return err
	}
	return p.Data.Validate()
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

type GettableDashboardV2 struct {
	types.Identifiable
	types.TimeAuditable
	types.UserAuditable

	OrgID        valuer.UUID               `json:"orgId"`
	Locked       bool                      `json:"locked"`
	Info         GettableDashboardInfo     `json:"info"`
	PublicConfig *GettablePublicDasbhboard `json:"publicConfig,omitempty"`
}

type GettableDashboardInfo struct {
	StoredDashboardInfo
	Tags []*tagtypes.GettableTag `json:"tags,omitempty"`
}

func NewGettableDashboardV2FromDashboardV2(dashboard *DashboardV2) *GettableDashboardV2 {
	gettable := &GettableDashboardV2{
		Identifiable:  dashboard.Identifiable,
		TimeAuditable: dashboard.TimeAuditable,
		UserAuditable: dashboard.UserAuditable,
		OrgID:         dashboard.OrgID,
		Locked:        dashboard.Locked,
		Info: GettableDashboardInfo{
			StoredDashboardInfo: dashboard.Info.StoredDashboardInfo,
			Tags:                tagtypes.NewGettableTagsFromTags(dashboard.Info.Tags),
		},
	}
	if dashboard.PublicConfig != nil {
		gettable.PublicConfig = NewGettablePublicDashboard(dashboard.PublicConfig)
	}
	return gettable
}

func NewDashboardV2(orgID valuer.UUID, createdBy string, postable PostableDashboardV2, resolvedTags []*tagtypes.Tag) *DashboardV2 {
	now := time.Now()

	return &DashboardV2{
		Identifiable:  types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{CreatedAt: now, UpdatedAt: now},
		UserAuditable: types.UserAuditable{CreatedBy: createdBy, UpdatedBy: createdBy},
		OrgID:         orgID,
		Locked:        false,
		Info: DashboardInfo{
			StoredDashboardInfo: StoredDashboardInfo{
				Metadata: postable.Metadata,
				Data:     postable.Data,
			},
			Tags: resolvedTags,
		},
	}
}

func (d *DashboardV2) ToStorableDashboard() (*StorableDashboard, error) {
	data, err := d.Info.toStorableDashboardData()
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

func (s StoredDashboardInfo) toStorableDashboardData() (StorableDashboardData, error) {
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
