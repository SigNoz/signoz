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
	"github.com/swaggest/jsonschema-go"
	jsonpatch "gopkg.in/evanphx/json-patch.v4"
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
	Source Source          `json:"source"`
	Data   DashboardV2Data `json:"data"`
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

func (d *DashboardV2) Update(updateable UpdateableDashboardV2, updatedBy string, resolvedTags []*tagtypes.Tag) error {
	if err := d.CanUpdate(); err != nil {
		return err
	}
	d.Data.Metadata = updateable.Metadata.toDashboardV2Metadata(d.OrgID)
	d.Data.Spec = updateable.Spec
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

func (postable PostableDashboardV2) NewDashboardV2WithoutTags(orgID valuer.UUID, createdBy string, source Source) *DashboardV2 {
	now := time.Now()

	return &DashboardV2{
		Identifiable:  types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{CreatedAt: now, UpdatedAt: now},
		UserAuditable: types.UserAuditable{CreatedBy: createdBy, UpdatedBy: createdBy},
		OrgID:         orgID,
		Locked:        source == SourceIntegration,
		Source:        source,
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

func (m DashboardV2Metadata) toPostableDashboardV2Metadata() PostableDashboardV2Metadata {
	return PostableDashboardV2Metadata{
		DashboardV2MetadataBase: m.DashboardV2MetadataBase,
		Tags:                    tagtypes.NewPostableTagsFromTags(m.Tags),
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
	Source Source                  `json:"source"`
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

func (m DashboardV2Metadata) toGettableDashboardV2Metadata() GettableDashboardV2Metadata {
	return GettableDashboardV2Metadata{
		DashboardV2MetadataBase: m.DashboardV2MetadataBase,
		Tags:                    tagtypes.NewGettableTagsFromTags(m.Tags),
	}
}

func (d DashboardV2) ToGettableDashboardV2() GettableDashboardV2 {
	return GettableDashboardV2{
		Identifiable:  d.Identifiable,
		TimeAuditable: d.TimeAuditable,
		UserAuditable: d.UserAuditable,
		OrgID:         d.OrgID,
		Locked:        d.Locked,
		Source:        d.Source,
		Data:          d.Data.toGettableDashboardData(),
	}
}

func (d DashboardV2Data) toGettableDashboardData() GettableDashboardV2Data {
	return GettableDashboardV2Data{
		Metadata: d.Metadata.toGettableDashboardV2Metadata(),
		Spec:     d.Spec,
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

func (stored StorableDashboardV2Data) toDashboardV2Data(tags []*tagtypes.Tag) DashboardV2Data {
	return DashboardV2Data{
		Metadata: DashboardV2Metadata{
			DashboardV2MetadataBase: stored.Metadata,
			Tags:                    tags,
		},
		Spec: stored.Spec,
	}
}

// ════════════════════════════════════════════════════════════════════════
// Updateable
// ════════════════════════════════════════════════════════════════════════

type UpdateableDashboardV2 = PostableDashboardV2

func (d DashboardV2) toUpdateableDashboardV2() UpdateableDashboardV2 {
	return PostableDashboardV2{
		Metadata: d.Data.Metadata.toPostableDashboardV2Metadata(),
		Spec:     d.Data.Spec,
	}
}

// ════════════════════════════════════════════════════════════════════════
// Patchable
// ════════════════════════════════════════════════════════════════════════

// PatchableDashboardV2 is an RFC 6902 JSON Patch document applied against a
// PostableDashboardV2-shaped view of an existing dashboard. Patch ops can
// target any field — including individual entries inside `data.panels`,
// `data.panels.<id>.spec.queries`, or `tags` — without re-sending the rest of
// the dashboard.
type PatchableDashboardV2 struct {
	patch jsonpatch.Patch
}

// JSONPatchDocument is the OpenAPI-facing schema for an RFC 6902 patch body.
// PatchableDashboardV2 has only an internal `jsonpatch.Patch` field, so the
// reflector would emit an empty schema; the handler def points at this type
// instead so consumers see the array-of-ops shape.
type JSONPatchDocument []JSONPatchOperation

// JSONPatchOperation is one RFC 6902 op. Not every field is valid on every
// op kind (e.g. `value` is required for add/replace/test, ignored for remove;
// `from` is required for move/copy) — the JSON Patch RFC governs that.
type JSONPatchOperation struct {
	Op    string `json:"op" required:"true"`
	Path  string `json:"path" required:"true" description:"JSON Pointer (RFC 6901) into the dashboard's postable shape — e.g. /data/display/name, /data/panels/<id>, /data/panels/<id>/spec/queries/0, /tags/-."`
	Value any    `json:"value,omitempty" description:"Value to add/replace/test against. The expected type depends on the path. Common shapes (see referenced schemas for the exact field set): /data/panels/<id> takes a DashboardtypesPanel; /data/panels/<id>/spec/queries/N (or /-) takes a DashboardtypesQuery; /data/variables/N takes a DashboardtypesVariable; /data/layouts/N takes a DashboardtypesLayout; /tags/N (or /-) takes a TagtypesPostableTag; /data/display/name and other leaf string fields take a string. Required for add/replace/test; ignored for remove/move/copy."`
	From  string `json:"from,omitempty" description:"Source JSON Pointer for move/copy ops; ignored for other ops."`
}

// PrepareJSONSchema constrains the `op` field to the six RFC 6902 verbs.
func (JSONPatchOperation) PrepareJSONSchema(s *jsonschema.Schema) error {
	op, ok := s.Properties["op"]
	if !ok || op.TypeObject == nil {
		return errors.NewInternalf(errors.CodeInternal, "JSONPatchOperation schema missing `op` property")
	}
	op.TypeObject.WithEnum("add", "remove", "replace", "move", "copy", "test")
	s.Properties["op"] = op
	return nil
}

func (p *PatchableDashboardV2) UnmarshalJSON(data []byte) error {
	patch, err := jsonpatch.DecodePatch(data)
	if err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "%s", err.Error())
	}
	p.patch = patch
	return nil
}

func (p PatchableDashboardV2) Apply(existing *DashboardV2) (*UpdateableDashboardV2, error) {
	existingAsUpdateable := existing.toUpdateableDashboardV2()
	raw, err := json.Marshal(existingAsUpdateable)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "marshal existing dashboard for patch")
	}
	patched, err := p.patch.Apply(raw)
	if err != nil {
		return nil, errors.WrapInvalidInputf(err, ErrCodeDashboardInvalidInput, "%s", err.Error())
	}
	out := &UpdateableDashboardV2{}
	if err := json.Unmarshal(patched, out); err != nil {
		return nil, err
	}
	return out, nil
}

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
		Identifiable:  storable.Identifiable,
		TimeAuditable: storable.TimeAuditable,
		UserAuditable: storable.UserAuditable,
		OrgID:         storable.OrgID,
		Locked:        storable.Locked,
		Source:        storable.Source,
		Data:          stored.toDashboardV2Data(tags),
	}, nil
}
