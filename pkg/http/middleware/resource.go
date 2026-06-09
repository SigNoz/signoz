package middleware

import (
	"bytes"
	"io"
	"log/slog"
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/gorilla/mux"
)

// Resource resolves a route's declared ResourceDefs (request-side) and stashes
// the result in the request context. It is the OUTER of the resource-aware
// middlewares (placed before Audit) and the single point that buffers the
// request body. AuthZ (in the handler) and Audit (inner) read the resolved list.
type Resource struct {
	logger *slog.Logger
}

func NewResource(logger *slog.Logger) *Resource {
	return &Resource{logger: logger.With(slog.String("pkg", pkgname))}
}

func (middleware *Resource) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		defs := resourceDefsFromRequest(req)
		if len(defs) == 0 {
			next.ServeHTTP(rw, req)
			return
		}

		// Buffer the request body once so request-side extractors can read it and
		// the handler still sees a fresh reader. Single buffering point.
		var body []byte
		if req.Body != nil {
			body, _ = io.ReadAll(req.Body)
			req.Body = io.NopCloser(bytes.NewReader(body))
		}

		extractorCtx := coretypes.ExtractorContext{
			Request:     req,
			RequestBody: body,
		}
		resolved := handler.ResolveRequest(defs, extractorCtx)

		ctx := handler.NewContextWithResolvedResources(req.Context(), resolved)
		next.ServeHTTP(rw, req.WithContext(ctx))
	})
}

func resourceDefsFromRequest(req *http.Request) []handler.ResourceSpec {
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

	return provider.ResourceDefs()
}
