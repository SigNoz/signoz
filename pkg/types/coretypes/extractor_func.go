package coretypes

import (
	"github.com/gorilla/mux"
	"github.com/tidwall/gjson"
)

// OneID lifts a single-id extractor into a one-element ids extractor.
func OneID(extractor ResourceIDExtractor) ResourceIDsExtractor {
	return ResourceIDsExtractor{Phase: extractor.Phase, Fn: func(ec ExtractorContext) ([]string, error) {
		id, err := extractor.Fn(ec)
		if err != nil || id == "" {
			return nil, err
		}
		return []string{id}, nil
	}}
}

func PathParam(name string) ResourceIDExtractor {
	return ResourceIDExtractor{Phase: PhaseRequest, Fn: func(ec ExtractorContext) (string, error) {
		if ec.Request == nil {
			return "", nil
		}
		return mux.Vars(ec.Request)[name], nil
	}}
}

func BodyJSONPath(path string) ResourceIDExtractor {
	return ResourceIDExtractor{Phase: PhaseRequest, Fn: func(ec ExtractorContext) (string, error) {
		return gjson.GetBytes(ec.RequestBody, path).String(), nil
	}}
}

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

func ResponseJSONPath(path string) ResourceIDExtractor {
	return ResourceIDExtractor{Phase: PhaseResponse, Fn: func(ec ExtractorContext) (string, error) {
		return gjson.GetBytes(ec.ResponseBody, path).String(), nil
	}}
}
