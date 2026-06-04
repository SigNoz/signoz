package dashboardtypes

import (
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	jsonpatch "github.com/evanphx/json-patch/v5"
	"github.com/swaggest/jsonschema-go"
)

// PatchableDashboardV2 is an RFC 6902 patch request.
type PatchableDashboardV2 struct {
	// Ops shapes the OpenAPI schema; tagged so swaggest reflects it.
	Ops []JSONPatchOperation `json:"ops"`
	// patch holds the decoded payload, set by UnmarshalJSON.
	patch jsonpatch.Patch
}

// PrepareJSONSchema collapses the struct's object schema into the bare ops array.
func (PatchableDashboardV2) PrepareJSONSchema(s *jsonschema.Schema) error {
	// Called on several passes; only the one with built properties carries `ops`.
	ops, ok := s.Properties["ops"]
	if !ok || ops.TypeObject == nil {
		return nil
	}
	*s = *ops.TypeObject
	return nil
}

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
	patch, err := jsonpatch.DecodePatch(data)
	if err != nil {
		return errors.New(errors.TypeInvalidInput, ErrCodeDashboardInvalidPatch, "request body is not a valid RFC 6902 JSON Patch document").WithAdditional(err.Error())
	}
	if err := json.Unmarshal(data, &p.Ops); err != nil {
		return errors.New(errors.TypeInvalidInput, ErrCodeDashboardInvalidPatch, "request body is not a valid RFC 6902 JSON Patch document").WithAdditional(err.Error())
	}
	p.patch = patch
	return nil
}

func (p PatchableDashboardV2) Apply(existing *DashboardV2) (*UpdatableDashboardV2, error) {
	existingAsUpdatable := existing.toUpdatableDashboardV2()
	raw, err := json.Marshal(existingAsUpdatable)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "marshal existing dashboard for patch")
	}
	patched, err := p.patch.ApplyWithOptions(raw, &jsonpatch.ApplyOptions{AllowMissingPathOnRemove: true, EnsurePathExistsOnAdd: true})
	if err != nil {
		return nil, errors.Wrap(err, errors.TypeInvalidInput, ErrCodeDashboardInvalidPatch, "JSON Patch could not be applied to the target dashboard")
	}
	out := &UpdatableDashboardV2{}
	if err := json.Unmarshal(patched, out); err != nil {
		return nil, err
	}
	return out, nil
}
