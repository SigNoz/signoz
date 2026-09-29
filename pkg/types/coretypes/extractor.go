package coretypes

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/gorilla/mux"
	"github.com/tidwall/gjson"
)

const (
	PhaseRequest ExtractPhase = iota
	PhaseResponse
)

var (
	errCodeExtractorContextNotFound = errors.MustNewCode("extractor_context_not_found")
	errCodeRequestTypeUndeclared    = errors.MustNewCode("request_type_undeclared")
	errCodeRequestTypeMismatch      = errors.MustNewCode("request_type_mismatch")
)

type ExtractPhase int

type extractorContextKey struct{}

// ExtractorContext carries everything an extractor may read: Request + RequestBody
// are filled pre-handler, ResponseBody post-handler. Body is RequestBody decoded
// by the resource middleware into the route's declared request type.
type ExtractorContext struct {
	Request      *http.Request
	RequestBody  []byte
	Body         any
	ResponseBody []byte
}

func NewContextWithExtractorContext(ctx context.Context, ec ExtractorContext) context.Context {
	return context.WithValue(ctx, extractorContextKey{}, ec)
}

func ExtractorContextFromContext(ctx context.Context) (ExtractorContext, error) {
	ec, ok := ctx.Value(extractorContextKey{}).(ExtractorContext)
	if !ok {
		return ExtractorContext{}, errors.New(errors.TypeInternal, errCodeExtractorContextNotFound, "extractor context not found in context")
	}

	return ec, nil
}

func BodyAs[T any](ec ExtractorContext) (*T, error) {
	if ec.Body == nil {
		return nil, errors.New(errors.TypeInternal, errCodeRequestTypeUndeclared, "route does not declare a request type")
	}

	typed, ok := ec.Body.(*T)
	if !ok {
		return nil, errors.Newf(errors.TypeInternal, errCodeRequestTypeMismatch, "route declares request type %T, expected %T", ec.Body, (*T)(nil))
	}

	return typed, nil
}

func BodyFromContext[T any](ctx context.Context) (*T, error) {
	ec, err := ExtractorContextFromContext(ctx)
	if err != nil {
		return nil, err
	}

	return BodyAs[T](ec)
}

type ResourceIDExtractor struct {
	Phase        ExtractPhase
	RequiresBody bool
	Fn           func(ExtractorContext) (string, error)
}

type ResourceIDsExtractor struct {
	Phase        ExtractPhase
	RequiresBody bool
	Fn           func(ExtractorContext) ([]string, error)
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
	if extractor.Fn == nil {
		return ResourceIDsExtractor{}
	}

	return ResourceIDsExtractor{Phase: extractor.Phase, RequiresBody: extractor.RequiresBody, Fn: func(ec ExtractorContext) ([]string, error) {
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

func BodyField[T any](pick func(*T) string) ResourceIDExtractor {
	return ResourceIDExtractor{Phase: PhaseRequest, RequiresBody: true, Fn: func(ec ExtractorContext) (string, error) {
		req, err := BodyAs[T](ec)
		if err != nil {
			return "", err
		}

		return pick(req), nil
	}}
}

func BodyFields[T any](pick func(*T) []string) ResourceIDsExtractor {
	return ResourceIDsExtractor{Phase: PhaseRequest, RequiresBody: true, Fn: func(ec ExtractorContext) ([]string, error) {
		req, err := BodyAs[T](ec)
		if err != nil {
			return nil, err
		}

		return pick(req), nil
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
