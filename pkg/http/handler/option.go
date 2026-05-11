package handler

import (
	"bytes"
	"io"
	"net/http"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/audittypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/gorilla/mux"
	"github.com/tidwall/gjson"
)

// Option configures optional behaviour on a handler created by New.
type Option func(*handler)

// ResourceIDExtractor pulls a resource id from an incoming request. Returns
// an empty string with no error when the id source is genuinely absent (e.g.
// "me" routes that act on the caller without an explicit id).
type ResourceIDExtractor func(*http.Request) (string, error)

// PathParam returns an extractor that reads a Gorilla mux path variable.
func PathParam(name string) ResourceIDExtractor {
	return func(req *http.Request) (string, error) {
		vars := mux.Vars(req)
		if vars == nil {
			return "", nil
		}

		return vars[name], nil
	}
}

// BodyJSONPath returns an extractor that reads a JSON path out of the request
// body using gjson. The body is read and rewound so the downstream handler
// still sees the full payload.
func BodyJSONPath(path string) ResourceIDExtractor {
	return func(req *http.Request) (string, error) {
		if req.Body == nil {
			return "", nil
		}

		body, err := io.ReadAll(req.Body)
		if err != nil {
			return "", errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to read request body for audit extraction")
		}
		req.Body = io.NopCloser(bytes.NewReader(body))

		return gjson.GetBytes(body, path).String(), nil
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

// WithAuditDef attaches one or more AuditDef declarations to the handler. A
// single route can produce multiple audit events — e.g. creating a resource
// that is simultaneously attached to a parent emits one BasicAuditDef and one
// AttachAuditDef. The middleware emits one event per def in declaration order.
func WithAuditDef(defs ...AuditDef) Option {
	return func(h *handler) {
		h.auditDefs = append(h.auditDefs, defs...)
	}
}
