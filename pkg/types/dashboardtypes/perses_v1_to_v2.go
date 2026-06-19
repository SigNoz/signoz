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

func (storable StorableDashboard) ConvertV1ToV2() (result *DashboardV2, err error) {
	// Legacy v1 data can be arbitrarily malformed. The accessors degrade
	// gracefully, but recover from any unforeseen panic so one bad dashboard
	// surfaces as an error (to be logged and skipped) rather than crashing the run.
	defer func() {
		if r := recover(); r != nil {
			result, err = nil, errors.Newf(errors.TypeInternal, ErrCodeDashboardInvalidData, "panic converting dashboard %s: %v", storable.ID, r)
		}
	}()

	if storable.IsV2() {
		return nil, errors.Newf(errors.TypeInvalidInput, ErrCodeDashboardInvalidData, "dashboard %s is already in %s schema", storable.ID, SchemaVersion)
	}

	// Each converter errors only if its field is present with the wrong type (a
	// corrupt dashboard); absent/empty fields convert to nothing. Panels runs
	// before Layouts so a malformed `widgets` is caught before Layouts reads it.
	variables, err := convertV1Variables(storable.Data["variables"])
	if err != nil {
		return nil, err
	}
	panels, err := convertV1Panels(storable.Data["widgets"])
	if err != nil {
		return nil, err
	}
	layouts, err := convertV1Layouts(storable.Data)
	if err != nil {
		return nil, err
	}
	tags, err := convertV1TagsForOrg(storable.OrgID, storable.Data["tags"])
	if err != nil {
		return nil, err
	}

	image, _ := storable.Data["image"].(string)
	title, _ := storable.Data["title"].(string)
	description, _ := storable.Data["description"].(string)

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
		Spec: DashboardSpec{
			Display:   Display{Name: title, Description: description},
			Variables: variables,
			Panels:    panels,
			Layouts:   layouts,
		},
	}, nil
}

// malformedV1FieldErr reports a v1 field present with the wrong type (a corrupt
// dashboard), as distinct from an absent field, which converts to nothing.
func malformedV1FieldErr(field string, raw any) error {
	return errors.Newf(errors.TypeInvalidInput, ErrCodeDashboardInvalidData, "v1 dashboard field %q has unexpected type %T", field, raw)
}
