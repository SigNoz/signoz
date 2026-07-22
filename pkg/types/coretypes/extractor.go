package coretypes

import (
	"net/http"

	"github.com/gorilla/mux"
	"github.com/tidwall/gjson"
)

const (
	PhaseRequest ExtractPhase = iota
	PhaseResponse
)

type ExtractPhase int

// ExtractorContext carries everything an extractor may read: Request + RequestBody
// are filled pre-handler, ResponseBody post-handler.
type ExtractorContext struct {
	Request      *http.Request
	RequestBody  []byte
	ResponseBody []byte
}

type ResourceIDExtractor struct {
	Phase ExtractPhase
	Fn    func(ExtractorContext) (string, error)
}

type ResourceIDsExtractor struct {
	Phase ExtractPhase
	Fn    func(ExtractorContext) ([]string, error)
}

func NewResourceIDExtractor(phase ExtractPhase, fn func(ExtractorContext) (string, error)) ResourceIDExtractor {
	return ResourceIDExtractor{Phase: phase, Fn: fn}
}

func (extractor ResourceIDExtractor) IsPhase(phase ExtractPhase) bool {
	return extractor.Fn != nil && extractor.Phase == phase
}

func (extractor ResourceIDsExtractor) IsPhase(phase ExtractPhase) bool {
	return extractor.Fn != nil && extractor.Phase == phase
}

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

type ResourceWithID struct {
	Resource Resource
	ID       string
}

type ResourceExtractor func(ExtractorContext) ([]ResourceWithID, error)

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
