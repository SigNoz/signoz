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
		defs := resourceDefsFromRequest(req)
		if len(defs) == 0 {
			next.ServeHTTP(rw, req)
			return
		}

		// Buffer the body once so extractors can read it and the handler still sees a fresh reader.
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

		ctx := coretypes.NewContextWithResolvedResources(req.Context(), resolved)
		next.ServeHTTP(rw, req.WithContext(ctx))
	})
}

func resourceDefsFromRequest(req *http.Request) []handler.ResourceDef {
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
