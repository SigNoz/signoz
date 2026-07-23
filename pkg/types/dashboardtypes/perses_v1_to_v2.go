package dashboardtypes

import (
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
)

// V1 → V2 migration. The v1 storable shape is the frontend's `DashboardData`
// (see frontend/src/types/api/dashboard/getAll.ts); v2 is DashboardV2 /
// DashboardSpec.
//
// Assumes the v1 widget query data has already been migrated to v5 shape
// (transition.dashboardMigrateV5). Pre-v5 builder queries will produce
// invalid v2 envelopes — run the v4→v5 migration first.
//
// The conversion is split across sibling files by concern:
//   - perses_v1_to_v2_tags.go      tags
//   - perses_v1_to_v2_panels.go    widgets → panels (+ panel field mappers)
//   - perses_v1_to_v2_queries.go   widget queries
//   - perses_v1_to_v2_layouts.go   grid layouts and sections
//   - perses_v1_to_v2_variables.go variables
//   - perses_v1_to_v2_decoder.go   v1Decoder: typed field reads + malformed-field detection

// ══════════════════════════════════════════════
// Entry point
// ══════════════════════════════════════════════

func (storable StorableDashboard) IsV2() bool {
	metadata, _ := storable.Data["metadata"].(map[string]any)
	if metadata == nil {
		return false
	}
	version, _ := metadata["schemaVersion"].(string)
	return version == SchemaVersion
}

func (storable StorableDashboard) ConvertV1ToV2() (result *DashboardV2, err error) {
	// Legacy v1 data can be arbitrarily malformed. The accessors degrade
	// gracefully, but recover from any unforeseen panic so one bad dashboard
	// surfaces as an error (to be logged and skipped) rather than crashing the run.
	defer func() {
		if r := recover(); r != nil {
			result, err = nil, errors.Newf(errors.TypeInternal, ErrCodeDashboardMigrationFailed, "panic converting dashboard %s: %v", storable.ID, r)
		}
	}()

	if storable.IsV2() {
		return nil, errors.Newf(errors.TypeInvalidInput, ErrCodeDashboardMigrationFailed, "dashboard %s is already in %s schema", storable.ID, SchemaVersion)
	}

	d := &v1Decoder{}
	title := d.readString(storable.Data, "title")
	description := d.readString(storable.Data, "description")
	image := d.readString(storable.Data, "image")

	sanitizeWidgetIDs(storable.Data)
	panels := d.convertV1Panels(retainPlacedWidgets(storable.Data))
	spec := DashboardSpec{
		Display:   Display{Name: clipName(title, MaxDisplayNameLen), Description: description},
		Variables: d.convertV1Variables(storable.Data["variables"]),
		Panels:    panels,
		Layouts:   d.convertV1Layouts(storable.Data, panels),
		// v1 has no dashboard links; emit [] (not nil) so the required field round-trips.
		Links: []Link{},
	}

	// marshal and unmarshal cycle to confirm full validation
	raw, marshalErr := json.Marshal(spec)
	if marshalErr != nil {
		return nil, errors.WrapInternalf(marshalErr, errors.CodeInternal, "marshal converted dashboard %s", storable.ID)
	}
	if err := json.Unmarshal(raw, new(DashboardSpec)); err != nil {
		return nil, errors.WrapInvalidInputf(err, ErrCodeDashboardMigrationFailed, "converted dashboard %s is invalid", storable.ID)
	}
	tags := d.convertV1TagsForOrg(storable.OrgID, storable.Data["tags"])

	if err := d.errIfHasMalformedFields(); err != nil {
		return nil, err
	}

	return &DashboardV2{
		Identifiable:  storable.Identifiable,
		TimeAuditable: storable.TimeAuditable,
		UserAuditable: storable.UserAuditable,
		OrgID:         storable.OrgID,
		Locked:        storable.Locked,
		Source:        storable.Source,
		DashboardV2MetadataBase: DashboardV2MetadataBase{
			SchemaVersion: SchemaVersion,
			Image:         image,
		},
		Name: generateDashboardName(title),
		Tags: tags,
		Spec: spec,
	}, nil
}

// ══════════════════════════════════════════════
// In-place migration (temporary)
// ══════════════════════════════════════════════

// V1ToV2MigrationResult is the summary of migrating every dashboard in an org
// from the v1 to the v2 schema in place. Each v1 dashboard's stored data is
// converted and overwritten; dashboards already in v2 are skipped.
type V1ToV2MigrationResult struct {
	Total    int                   `json:"total"`
	Migrated int                   `json:"migrated"`
	Skipped  int                   `json:"skipped"`
	Failed   int                   `json:"failed"`
	Results  []V1ToV2MigrationItem `json:"results"`
}

type V1ToV2MigrationItem struct {
	ID     string `json:"id"`
	Status string `json:"status"` // migrated | skipped | failed
	Error  string `json:"error,omitempty"`
}
