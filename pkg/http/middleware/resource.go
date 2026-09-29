package middleware

import (
	"bytes"
	"io"
	"log/slog"
	"net/http"
	"reflect"

	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/gorilla/mux"
)

// Resource resolves a route's declared ResourceDefs and stashes the result in
// the request context for authz and audit to read.
type Resource struct {
	logger *slog.Logger
}

func NewResource(logger *slog.Logger) *Resource {
	return &Resource{logger: logger.With(slog.String("pkg", pkgname))}
}

func (middleware *Resource) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		provider := handlerFromRequest(req)
		if provider == nil || len(provider.ResourceDefs()) == 0 {
			next.ServeHTTP(rw, req)
			return
		}

		// Buffer the body once so extractors can read it and the handler still sees a fresh reader.
		var body []byte
		if req.Body != nil {
			body, _ = io.ReadAll(req.Body)
			req.Body = io.NopCloser(bytes.NewReader(body))
		}

		defs := provider.ResourceDefs()

		var decoded any
		var decodeErr error
		if handler.RequiresBody(defs) {
			decoded, decodeErr = decodeBody(provider.Request(), body, provider.BindBodyOptions()...)
		}

		extractorCtx := coretypes.ExtractorContext{Request: req, RequestBody: body, Body: decoded}

		var resolved []coretypes.ResolvedResource
		if decodeErr != nil {
			// authz renders the error inside the audit middleware, so the request is still logged
			resolved = []coretypes.ResolvedResource{coretypes.NewResolvedResourceWithError(coretypes.Verb{}, coretypes.ActionCategory{}, decodeErr)}
		} else {
			resolved = handler.ResolveRequest(defs, extractorCtx)
		}

		ctx := coretypes.NewContextWithExtractorContext(req.Context(), extractorCtx)
		ctx = coretypes.NewContextWithResolvedResources(ctx, resolved)
		next.ServeHTTP(rw, req.WithContext(ctx))
	})
}

func decodeBody(prototype any, body []byte, opts ...binding.BindBodyOption) (any, error) {
	decoded := reflect.New(reflect.TypeOf(prototype).Elem()).Interface()
	if err := binding.JSON.BindBody(bytes.NewReader(body), decoded, opts...); err != nil {
		return nil, err
	}

	return decoded, nil
}

func handlerFromRequest(req *http.Request) handler.Handler {
	route := mux.CurrentRoute(req)
	if route == nil {
		return nil
	}

	actualHandler := route.GetHandler()
	if actualHandler == nil {
		return nil
	}

	provider, ok := actualHandler.(handler.Handler)
	if !ok {
		return nil
	}

	return provider
}
