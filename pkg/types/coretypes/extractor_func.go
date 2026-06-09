package coretypes

import (
	"github.com/gorilla/mux"
	"github.com/tidwall/gjson"
)

// TelemetrySignalSource extracts the telemetry resource each query of a
// query-range request touches: per query it maps spec.signal + spec.source to a
// telemetry resource and reads idPath as that resource's id. One entry per query
// — no de-duplication, so repeated signals each yield their own resource + id.
func TelemetrySignalSource(queriesPath, idPath string) ResourceExtractor {
	return func(ec ExtractorContext) ([]ResourceWithID, error) {
		queries := gjson.GetBytes(ec.RequestBody, queriesPath).Array()

		refs := make([]ResourceWithID, 0, len(queries))
		for _, query := range queries {
			resource, ok := TelemetryResourceForSignalSource(
				query.Get("spec.signal").String(),
				query.Get("spec.source").String(),
			)
			if !ok {
				continue
			}

			refs = append(refs, ResourceWithID{Resource: resource, ID: query.Get(idPath).String()})
		}

		return refs, nil
	}
}

// OneID adapts a single-id extractor into a one-element ids extractor, so a
// single path/body/response id can feed a relationship side that takes ids
// (e.g. the source/target of an AttachDetachSiblingResourceDef).
func OneID(extractor ResourceIDExtractor) ResourceIDsExtractor {
	return ResourceIDsExtractor{Phase: extractor.Phase, Fn: func(ec ExtractorContext) ([]string, error) {
		id, err := extractor.Fn(ec)
		if err != nil || id == "" {
			return nil, err
		}
		return []string{id}, nil
	}}
}

// PathParam reads a gorilla/mux path variable. Request-phase.
func PathParam(name string) ResourceIDExtractor {
	return ResourceIDExtractor{Phase: PhaseRequest, Fn: func(ec ExtractorContext) (string, error) {
		if ec.Request == nil {
			return "", nil
		}
		return mux.Vars(ec.Request)[name], nil
	}}
}

// BodyJSONPath reads a gjson path from the request body. Request-phase.
func BodyJSONPath(path string) ResourceIDExtractor {
	return ResourceIDExtractor{Phase: PhaseRequest, Fn: func(ec ExtractorContext) (string, error) {
		return gjson.GetBytes(ec.RequestBody, path).String(), nil
	}}
}

// BodyJSONArray reads a JSON array of strings from the request body. Request-phase.
func BodyJSONArray(path string) ResourceIDsExtractor {
	return ResourceIDsExtractor{Phase: PhaseRequest, Fn: func(ec ExtractorContext) ([]string, error) {
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
	return ResourceIDExtractor{Phase: PhaseResponse, Fn: func(ec ExtractorContext) (string, error) {
		return gjson.GetBytes(ec.ResponseBody, path).String(), nil
	}}
}
