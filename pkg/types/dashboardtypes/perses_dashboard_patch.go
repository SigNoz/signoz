package dashboardtypes

import (
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	jsonpatch "github.com/evanphx/json-patch/v5"
)

type PatchableDashboardV2 []JSONPatchOperation

type JSONPatchOperation struct {
	Op   PatchOp `json:"op" required:"true"`
	Path string  `json:"path" required:"true" description:"JSON Pointer (RFC 6901) into the dashboard's postable shape — e.g. /spec/display/name, /spec/panels/<id>, /spec/panels/<id>/spec/queries/0, /tags/-."`
	// `value` is required for add/replace/test.
	Value any `json:"value,omitempty" description:"Value to add/replace/test against. The expected type depends on the path. Common shapes (see referenced schemas for the exact field set): /spec/panels/<id> takes a DashboardtypesPanel; /spec/panels/<id>/spec/queries/N (or /-) takes a DashboardtypesQuery; /spec/variables/N takes a DashboardtypesVariable; /spec/layouts/N takes a DashboardtypesLayout; /tags/N (or /-) takes a TagtypesPostableTag; /spec/display/name and other leaf string fields take a string. Required for add/replace/test; ignored for remove/move/copy."`
	// `from` is required for move/copy.
	From string `json:"from,omitempty" description:"Source JSON Pointer for move/copy ops; ignored for other ops."`
}

// PatchOp covers the six RFC 6902 JSON Patch verbs.
type PatchOp struct{ valuer.String }

var (
	PatchOpAdd     = PatchOp{valuer.NewString("add")}
	PatchOpRemove  = PatchOp{valuer.NewString("remove")}
	PatchOpReplace = PatchOp{valuer.NewString("replace")}
	PatchOpMove    = PatchOp{valuer.NewString("move")}
	PatchOpCopy    = PatchOp{valuer.NewString("copy")}
	PatchOpTest    = PatchOp{valuer.NewString("test")}
)

func (PatchOp) Enum() []any {
	return []any{PatchOpAdd, PatchOpRemove, PatchOpReplace, PatchOpMove, PatchOpCopy, PatchOpTest}
}

func (p *PatchableDashboardV2) UnmarshalJSON(data []byte) error {
	// DecodePatch rejects unknown verbs, add/replace ops missing a value, move/copy ops missing a
	// from, and malformed paths — so callers get an InvalidInput error up front rather
	// than deep inside Apply.
	if _, err := jsonpatch.DecodePatch(data); err != nil {
		return errors.Wrap(err, errors.TypeInvalidInput, ErrCodeDashboardInvalidPatch, "request body is not a valid RFC 6902 JSON Patch document").WithAdditional(err.Error())
	}
	type alias PatchableDashboardV2
	var ops alias
	if err := json.Unmarshal(data, &ops); err != nil {
		return errors.Wrap(err, errors.TypeInvalidInput, ErrCodeDashboardInvalidPatch, "request body is not a valid RFC 6902 JSON Patch document")
	}
	*p = PatchableDashboardV2(ops)
	return nil
}

func (p PatchableDashboardV2) Apply(existing *DashboardV2) (*UpdateableDashboardV2, error) {
	existingAsUpdateable := existing.toUpdateableDashboardV2()
	raw, err := json.Marshal(existingAsUpdateable)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "marshal existing dashboard for patch")
	}
	rawPatch, err := json.Marshal(p)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "marshal patch document")
	}
	patch, err := jsonpatch.DecodePatch(rawPatch)
	if err != nil {
		return nil, errors.Wrap(err, errors.TypeInvalidInput, ErrCodeDashboardInvalidPatch, "request body is not a valid RFC 6902 JSON Patch document").WithAdditional(err.Error())
	}
	patched, err := patch.ApplyWithOptions(raw, &jsonpatch.ApplyOptions{AllowMissingPathOnRemove: true, EnsurePathExistsOnAdd: true})
	if err != nil {
		return nil, errors.Wrap(err, errors.TypeInvalidInput, ErrCodeDashboardInvalidPatch, "JSON Patch could not be applied to the target dashboard")
	}
	out := &UpdateableDashboardV2{}
	if err := json.Unmarshal(patched, out); err != nil {
		return nil, err
	}
	return out, nil
}
