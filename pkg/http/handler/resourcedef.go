package handler

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/gorilla/mux"
	"github.com/tidwall/gjson"
)

var errCodeInvalidResourceDef = errors.MustNewCode("invalid_resource_def")

// ExtractorContext carries everything an extractor may read. The resource
// middleware fills Request + RequestBody pre-handler; the audit middleware adds
// ResponseBody post-handler. Each extractor is run exactly once, in the phase
// whose data it needs.
type ExtractorContext struct {
	Request      *http.Request
	RequestBody  []byte
	ResponseBody []byte
}

// extractPhase marks whether an extractor reads request-side data (resolved
// pre-handler by the resource middleware) or response-side data (resolved
// post-handler by the audit middleware).
type extractPhase int

const (
	phaseRequest extractPhase = iota
	phaseResponse
)

// ResourceIDExtractor resolves a single resource id. Phase-tagged so the
// resolver runs it exactly once in the right phase. The declaration API exposes
// only the constructors below, so the phase is an internal detail.
type ResourceIDExtractor struct {
	phase extractPhase
	fn    func(ExtractorContext) (string, error)
}

// ResourceIDsExtractor resolves multiple resource ids (fan-out). Always
// request-phase — arrays come from the request body.
type ResourceIDsExtractor struct {
	phase extractPhase
	fn    func(ExtractorContext) ([]string, error)
}

// PathParam reads a gorilla/mux path variable. Request-phase.
func PathParam(name string) ResourceIDExtractor {
	return ResourceIDExtractor{phase: phaseRequest, fn: func(ec ExtractorContext) (string, error) {
		if ec.Request == nil {
			return "", nil
		}
		return mux.Vars(ec.Request)[name], nil
	}}
}

// BodyJSONPath reads a gjson path from the request body. Request-phase.
func BodyJSONPath(path string) ResourceIDExtractor {
	return ResourceIDExtractor{phase: phaseRequest, fn: func(ec ExtractorContext) (string, error) {
		return gjson.GetBytes(ec.RequestBody, path).String(), nil
	}}
}

// BodyJSONArray reads a JSON array of strings from the request body. Request-phase.
func BodyJSONArray(path string) ResourceIDsExtractor {
	return ResourceIDsExtractor{phase: phaseRequest, fn: func(ec ExtractorContext) ([]string, error) {
		result := gjson.GetBytes(ec.RequestBody, path)
		if !result.Exists() {
			return nil, nil
		}

		array := result.Array()
		ids := make([]string, 0, len(array))
		for _, r := range array {
			ids = append(ids, r.String())
		}

		return ids, nil
	}}
}

// ResponseJSONPath reads a gjson path from the response body. Response-phase —
// yields "" pre-handler and the real value post-handler.
func ResponseJSONPath(path string) ResourceIDExtractor {
	return ResourceIDExtractor{phase: phaseResponse, fn: func(ec ExtractorContext) (string, error) {
		return gjson.GetBytes(ec.ResponseBody, path).String(), nil
	}}
}

// SelectorFunc maps a resolved id (+ its resource) to authz FGA selectors. It is
// the sole source of selectors — there is no default fallback to wildcard. Given
// a missing id it decides for itself whether to return a wildcard or an error. It
// never reads the request/body; ctx + claims are only for an optional DB lookup
// (e.g. role UUID -> name).
type SelectorFunc func(ctx context.Context, resource coretypes.Resource, id string, claims authtypes.Claims) ([]coretypes.Selector, error)

// WildcardSelector ignores the id and returns the resource's wildcard selector.
// Use for create / list / collection routes.
var WildcardSelector SelectorFunc = func(_ context.Context, resource coretypes.Resource, _ string, _ authtypes.Claims) ([]coretypes.Selector, error) {
	return []coretypes.Selector{resource.Type().MustSelector(coretypes.WildCardSelectorString)}, nil
}

// IDSelector returns [exact, wildcard] for a present id and errors when the id is
// missing. Use for instance routes whose id is in the path/body.
var IDSelector SelectorFunc = func(_ context.Context, resource coretypes.Resource, id string, _ authtypes.Claims) ([]coretypes.Selector, error) {
	if id == "" {
		return nil, errors.Newf(errors.TypeInvalidInput, errCodeInvalidResourceDef, "resource id is required for %s", resource.Kind().String())
	}

	selector, err := resource.Type().Selector(id)
	if err != nil {
		return nil, err
	}

	return []coretypes.Selector{selector, resource.Type().MustSelector(coretypes.WildCardSelectorString)}, nil
}

// ResourceSpec is the sealed interface implemented by ResourceDef and
// ResourcesDef. Only these two satisfy WithResourceDefs.
type ResourceSpec interface {
	sealResourceSpec()
	validate() error
	resolveRequest(ec ExtractorContext) []ResolvedResource
}

// ResourceDef declares one resource an operation acts on. For attach/detach,
// Related names the counterpart for audit clarity only — it is never authz-checked.
type ResourceDef struct {
	Resource coretypes.Resource
	Verb     coretypes.Verb
	ID       ResourceIDExtractor
	Selector SelectorFunc
	Related  *RelatedResource
}

// ResourcesDef declares many resources of one kind (fan-out). One resolved
// entry is produced per id.
type ResourcesDef struct {
	Resource coretypes.Resource
	Verb     coretypes.Verb
	IDs      ResourceIDsExtractor
	Selector SelectorFunc
	Related  *RelatedResource
}

// RelatedResource is a counterpart named purely for audit clarity. It carries no
// verb and no selector and is not authz-checked.
type RelatedResource struct {
	Resource coretypes.Resource
	ID       ResourceIDExtractor
}

func (ResourceDef) sealResourceSpec()  {}
func (ResourcesDef) sealResourceSpec() {}

func (d ResourceDef) validate() error {
	if err := coretypes.ErrIfVerbNotValidForResource(d.Verb, *coretypes.NewResourceRef(d.Resource)); err != nil {
		return err
	}

	if d.Related != nil && d.Verb != coretypes.VerbAttach && d.Verb != coretypes.VerbDetach {
		return errors.Newf(errors.TypeInvalidInput, errCodeInvalidResourceDef, "Related is only valid with attach/detach, got %s", d.Verb.StringValue())
	}

	return nil
}

func (d ResourcesDef) validate() error {
	if err := coretypes.ErrIfVerbNotValidForResource(d.Verb, *coretypes.NewResourceRef(d.Resource)); err != nil {
		return err
	}

	if d.Related != nil && d.Verb != coretypes.VerbAttach && d.Verb != coretypes.VerbDetach {
		return errors.Newf(errors.TypeInvalidInput, errCodeInvalidResourceDef, "Related is only valid with attach/detach, got %s", d.Verb.StringValue())
	}

	return nil
}

func (d ResourceDef) resolveRequest(ec ExtractorContext) []ResolvedResource {
	resolved := ResolvedResource{Resource: d.Resource, Verb: d.Verb, Selector: d.Selector}
	resolved.ID, resolved.responseID = resolveID(d.ID, ec)
	resolved.Related = resolveRelated(d.Related, ec)

	return []ResolvedResource{resolved}
}

func (d ResourcesDef) resolveRequest(ec ExtractorContext) []ResolvedResource {
	var ids []string
	if d.IDs.fn != nil {
		ids, _ = d.IDs.fn(ec)
	}

	resolved := make([]ResolvedResource, 0, len(ids))
	for _, id := range ids {
		resolved = append(resolved, ResolvedResource{
			Resource: d.Resource,
			Verb:     d.Verb,
			ID:       id,
			Selector: d.Selector,
			Related:  resolveRelated(d.Related, ec),
		})
	}

	return resolved
}

// resolveID runs a request-phase extractor immediately and returns its value;
// for a response-phase extractor it returns ("", extractor) so audit can run it
// later.
func resolveID(extractor ResourceIDExtractor, ec ExtractorContext) (string, ResourceIDExtractor) {
	if extractor.fn == nil {
		return "", ResourceIDExtractor{}
	}

	if extractor.phase == phaseResponse {
		return "", extractor
	}

	id, _ := extractor.fn(ec)
	return id, ResourceIDExtractor{}
}

func resolveRelated(related *RelatedResource, ec ExtractorContext) *ResolvedRelated {
	if related == nil {
		return nil
	}

	resolved := &ResolvedRelated{Resource: related.Resource}
	resolved.ID, resolved.responseID = resolveID(related.ID, ec)

	return resolved
}

// ResolvedResource is the uniform output of resolution (after fan-out). ID is a
// resolved string: request-phase ids are filled by the resource middleware;
// response-phase ids stay "" until FinalizeResponseIDs runs in the audit middleware.
type ResolvedResource struct {
	Resource   coretypes.Resource
	Verb       coretypes.Verb
	ID         string
	Selector   SelectorFunc
	Related    *ResolvedRelated
	responseID ResourceIDExtractor
}

// ResolvedRelated is the resolved counterpart for audit context.
type ResolvedRelated struct {
	Resource   coretypes.Resource
	ID         string
	responseID ResourceIDExtractor
}

// ResolveRequest resolves the request-phase ids for all specs (fan-out included)
// against ec. Called by the resource middleware pre-handler.
func ResolveRequest(defs []ResourceSpec, ec ExtractorContext) []ResolvedResource {
	var resolved []ResolvedResource
	for _, def := range defs {
		resolved = append(resolved, def.resolveRequest(ec)...)
	}

	return resolved
}

// FinalizeResponseIDs runs the carried response-phase extractors against ec to
// fill the ids that were unknown pre-handler. Called by the audit middleware
// post-handler. Mutates the entries in place.
func FinalizeResponseIDs(resolved []ResolvedResource, ec ExtractorContext) {
	for idx := range resolved {
		if resolved[idx].responseID.fn != nil {
			resolved[idx].ID, _ = resolved[idx].responseID.fn(ec)
		}

		if resolved[idx].Related != nil && resolved[idx].Related.responseID.fn != nil {
			resolved[idx].Related.ID, _ = resolved[idx].Related.responseID.fn(ec)
		}
	}
}

// HasResponseIDs reports whether any resolved entry needs the response body to
// finalize its id. The audit middleware uses this to decide whether to capture
// the success response body.
func HasResponseIDs(resolved []ResolvedResource) bool {
	for idx := range resolved {
		if resolved[idx].responseID.fn != nil {
			return true
		}

		if resolved[idx].Related != nil && resolved[idx].Related.responseID.fn != nil {
			return true
		}
	}

	return false
}
