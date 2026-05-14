package handler

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/audittypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/gorilla/mux"
	"github.com/tidwall/gjson"
)

// Option configures optional behaviour on a handler created by New.
type Option func(*handler)

// ExtractorContext carries everything a ResourceIDExtractor might read out of
// a request/response cycle. The middleware pre-buffers the request body and
// captures the response body so post-handler extraction works on both sides.
type ExtractorContext struct {
	Request      *http.Request
	RequestBody  []byte
	ResponseBody []byte
}

// ResourceIDExtractor pulls a resource id from an incoming request and/or its
// response. Returns an empty string with no error when the id source is
// genuinely absent (e.g. "me" routes that act on the caller without an id).
type ResourceIDExtractor func(ExtractorContext) (string, error)

// ResourceIDsExtractor pulls a list of resource ids. Used by AttachManyAuditDef
// to fan out one audit event per attached entity referenced in a request body.
type ResourceIDsExtractor func(ExtractorContext) ([]string, error)

// PathParam returns an extractor that reads a Gorilla mux path variable.
func PathParam(name string) ResourceIDExtractor {
	return func(ctx ExtractorContext) (string, error) {
		vars := mux.Vars(ctx.Request)
		if vars == nil {
			return "", nil
		}

		return vars[name], nil
	}
}

// BodyJSONPath returns an extractor that reads a JSON path from the request
// body via gjson. The middleware buffers the request body before forwarding
// to the handler, so this extractor still works after the handler runs.
func BodyJSONPath(path string) ResourceIDExtractor {
	return func(ctx ExtractorContext) (string, error) {
		return gjson.GetBytes(ctx.RequestBody, path).String(), nil
	}
}

// ResponseJSONPath returns an extractor that reads a JSON path from the
// response body via gjson. Useful for Create routes where the new resource id
// is only known after the handler runs and writes the response payload.
func ResponseJSONPath(path string) ResourceIDExtractor {
	return func(ctx ExtractorContext) (string, error) {
		return gjson.GetBytes(ctx.ResponseBody, path).String(), nil
	}
}

// BodyJSONArray returns a multi-id extractor that reads a JSON array of
// strings out of the request body at the given gjson path.
func BodyJSONArray(path string) ResourceIDsExtractor {
	return func(ctx ExtractorContext) ([]string, error) {
		result := gjson.GetBytes(ctx.RequestBody, path)
		if !result.Exists() {
			return nil, nil
		}

		array := result.Array()
		ids := make([]string, 0, len(array))
		for _, r := range array {
			ids = append(ids, r.String())
		}

		return ids, nil
	}
}

// AuditDef is a sealed interface implemented by BasicAuditDef and
// AttachAuditDef. The middleware type-switches over its implementations to
// build the audit event for the matched route.
type AuditDef interface {
	sealAuditDef()
}

// BasicAuditDef declares audit metadata for routes that operate on a single
// resource. EventName is derived as Resource.Kind() + "." + Verb.PastTense().
type BasicAuditDef struct {
	Resource   coretypes.Resource
	Verb       coretypes.Verb
	Category   audittypes.ActionCategory
	ResourceID ResourceIDExtractor // nil for collection routes with no addressable id
}

func (BasicAuditDef) sealAuditDef() {}

// AttachAuditDef declares audit metadata for routes that attach one resource
// to another (e.g. role attached to a user). The event subject is the
// attached resource; the target carries where it was attached. EventName is
// derived as AttachedResource.Kind() + "." + Verb.PastTense().
type AttachAuditDef struct {
	AttachedResource   coretypes.Resource
	AttachedResourceID ResourceIDExtractor
	TargetResource     coretypes.Resource
	TargetResourceID   ResourceIDExtractor
	Verb               coretypes.Verb
	Category           audittypes.ActionCategory
}

func (AttachAuditDef) sealAuditDef() {}

// AttachManyAuditDef declares that a single request attaches many of the same
// kind of resource to one target. The middleware fans out one attach event per
// id returned by AttachedResourceIDs. Used for routes whose body carries a
// list of references (e.g. rule preferredChannels, planned-maintenance
// alertIds, route-policy channels).
type AttachManyAuditDef struct {
	AttachedResource    coretypes.Resource
	AttachedResourceIDs ResourceIDsExtractor
	TargetResource      coretypes.Resource
	TargetResourceID    ResourceIDExtractor
	Verb                coretypes.Verb
	Category            audittypes.ActionCategory
}

func (AttachManyAuditDef) sealAuditDef() {}

// WithAuditDef attaches one or more AuditDef declarations to the handler. A
// single route can produce multiple audit events — e.g. creating a resource
// that is simultaneously attached to a parent emits one BasicAuditDef and one
// AttachAuditDef. The middleware emits one event per def in declaration order.
func WithAuditDef(defs ...AuditDef) Option {
	return func(h *handler) {
		h.auditDefs = append(h.auditDefs, defs...)
	}
}
