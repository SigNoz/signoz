package dashboardtypes

import (
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
//   - perses_v1_to_v2_helpers.go   generic map/slice accessors

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

func (storable StorableDashboard) ConvertV1ToV2() (*DashboardV2, error) {
	if storable.IsV2() {
		return nil, errors.Newf(errors.TypeInvalidInput, ErrCodeDashboardInvalidData, "dashboard %s is already in %s schema", storable.ID, SchemaVersion)
	}

	image, _ := storable.Data["image"].(string)
	title, _ := storable.Data["title"].(string)
	description, _ := storable.Data["description"].(string)

	spec := DashboardSpec{
		Display:   Display{Name: title, Description: description},
		Variables: convertV1Variables(storable.Data["variables"]),
		Panels:    convertV1Panels(storable.Data["widgets"]),
		Layouts:   convertV1Layouts(storable.Data),
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
		Name: storable.Name,
		Tags: convertV1TagsForOrg(storable.OrgID, storable.Data["tags"]),
		Spec: spec,
	}, nil
}
