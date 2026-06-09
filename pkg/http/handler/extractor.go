// Resource id extraction constructors. The extractor types live in coretypes;
// these constructors hold the http/json specifics (mux, gjson).
package handler

import (
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/gorilla/mux"
	"github.com/tidwall/gjson"
)

// OneID adapts a single-id extractor into a one-element ids extractor, so a
// single path/body/response id can feed a relationship side that takes ids
// (e.g. the source/target of an AttachDetachSiblingResourceDef).
func OneID(extractor coretypes.ResourceIDExtractor) coretypes.ResourceIDsExtractor {
	return coretypes.ResourceIDsExtractor{Phase: extractor.Phase, Fn: func(ec coretypes.ExtractorContext) ([]string, error) {
		id, err := extractor.Fn(ec)
		if err != nil || id == "" {
			return nil, err
		}
		return []string{id}, nil
	}}
}

// PathParam reads a gorilla/mux path variable. Request-phase.
func PathParam(name string) coretypes.ResourceIDExtractor {
	return coretypes.ResourceIDExtractor{Phase: coretypes.PhaseRequest, Fn: func(ec coretypes.ExtractorContext) (string, error) {
		if ec.Request == nil {
			return "", nil
		}
		return mux.Vars(ec.Request)[name], nil
	}}
}

// BodyJSONPath reads a gjson path from the request body. Request-phase.
func BodyJSONPath(path string) coretypes.ResourceIDExtractor {
	return coretypes.ResourceIDExtractor{Phase: coretypes.PhaseRequest, Fn: func(ec coretypes.ExtractorContext) (string, error) {
		return gjson.GetBytes(ec.RequestBody, path).String(), nil
	}}
}

// BodyJSONArray reads a JSON array of strings from the request body. Request-phase.
func BodyJSONArray(path string) coretypes.ResourceIDsExtractor {
	return coretypes.ResourceIDsExtractor{Phase: coretypes.PhaseRequest, Fn: func(ec coretypes.ExtractorContext) ([]string, error) {
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
func ResponseJSONPath(path string) coretypes.ResourceIDExtractor {
	return coretypes.ResourceIDExtractor{Phase: coretypes.PhaseResponse, Fn: func(ec coretypes.ExtractorContext) (string, error) {
		return gjson.GetBytes(ec.ResponseBody, path).String(), nil
	}}
}
