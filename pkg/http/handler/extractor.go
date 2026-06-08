// Resource id extraction from the request/response.
package handler

import (
	"net/http"

	"github.com/gorilla/mux"
	"github.com/tidwall/gjson"
)

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

// isPhase reports whether this extractor is runnable in the given phase.
func (extractor ResourceIDExtractor) isPhase(phase extractPhase) bool {
	return extractor.fn != nil && extractor.phase == phase
}

// runFor runs the extractor against ec when it belongs to phase, reporting
// whether it ran.
func (extractor ResourceIDExtractor) runFor(phase extractPhase, ec ExtractorContext) (string, bool) {
	if !extractor.isPhase(phase) {
		return "", false
	}

	id, _ := extractor.fn(ec)
	return id, true
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
