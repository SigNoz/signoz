package middleware

import (
	"bytes"
	"io"
	"log/slog"
	"net"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
	"go.opentelemetry.io/otel/trace"

	"github.com/SigNoz/signoz/pkg/auditor"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/audittypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
)

const (
	logMessage = "::RECEIVED-REQUEST::"
)

type Audit struct {
	logger         *slog.Logger
	excludedRoutes map[string]struct{}
	auditor        auditor.Auditor
}

func NewAudit(logger *slog.Logger, excludedRoutes []string, auditor auditor.Auditor) *Audit {
	excludedRoutesMap := make(map[string]struct{})
	for _, route := range excludedRoutes {
		excludedRoutesMap[route] = struct{}{}
	}

	return &Audit{
		logger:         logger.With(slog.String("pkg", pkgname)),
		excludedRoutes: excludedRoutesMap,
		auditor:        auditor,
	}
}

func (middleware *Audit) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		start := time.Now()
		host, port, _ := net.SplitHostPort(req.Host)
		path, err := mux.CurrentRoute(req).GetPathTemplate()
		if err != nil {
			path = req.URL.Path
		}

		fields := []any{
			string(semconv.ClientAddressKey), req.RemoteAddr,
			string(semconv.UserAgentOriginalKey), req.UserAgent(),
			string(semconv.ServerAddressKey), host,
			string(semconv.ServerPortKey), port,
			string(semconv.HTTPRequestSizeKey), req.ContentLength,
			string(semconv.HTTPRouteKey), path,
		}

		// Pre-buffer the request body if the route declares any AuditDefs that
		// might want to extract from it after the handler has consumed the body.
		var requestBody []byte
		if len(auditDefsFromRequest(req)) > 0 && req.Body != nil {
			requestBody, _ = io.ReadAll(req.Body)
			req.Body = io.NopCloser(bytes.NewReader(requestBody))
		}

		responseBuffer := &byteBuffer{}
		writer := newResponseCapture(rw, responseBuffer)
		next.ServeHTTP(writer, req)

		statusCode, writeErr := writer.StatusCode(), writer.WriteError()

		// Logging or Audit: skip if the matched route is in the excluded list. This allows us to exclude noisy routes (e.g. health checks) from both logging and audit.
		if _, ok := middleware.excludedRoutes[path]; ok {
			return
		}

		middleware.emitAuditEvent(req, writer, path, requestBody)

		fields = append(fields,
			string(semconv.HTTPResponseStatusCodeKey), statusCode,
			string(semconv.HTTPServerRequestDurationName), time.Since(start),
		)
		if writeErr != nil {
			fields = append(fields, errors.Attr(writeErr))
			middleware.logger.ErrorContext(req.Context(), logMessage, fields...)
		} else {
			if responseBuffer.Len() != 0 {
				fields = append(fields, "response.body", responseBuffer.String())
			}

			middleware.logger.InfoContext(req.Context(), logMessage, fields...)
		}
	})
}

func (middleware *Audit) emitAuditEvent(req *http.Request, writer responseCapture, routeTemplate string, requestBody []byte) {
	if middleware.auditor == nil {
		return
	}

	defs := auditDefsFromRequest(req)
	if len(defs) == 0 {
		return
	}

	claims, _ := authtypes.ClaimsFromContext(req.Context())
	statusCode := writer.StatusCode()
	span := trace.SpanFromContext(req.Context())

	var errorType, errorCode string
	if statusCode >= 400 {
		errorType = render.ErrorTypeFromStatusCode(statusCode)
		errorCode = render.ErrorCodeFromBody(writer.BodyBytes())
	}

	extractorCtx := handler.ExtractorContext{
		Request:      req,
		RequestBody:  requestBody,
		ResponseBody: writer.BodyBytes(),
	}

	for _, def := range defs {
		resolved, err := resolveAuditDef(extractorCtx, def)
		if err != nil {
			middleware.logger.WarnContext(req.Context(), "audit event dropped — resource id extraction failed", errors.Attr(err))
			continue
		}

		if len(resolved) == 0 {
			if _, attach := def.(handler.AttachManyAuditDef); attach {
				middleware.logger.WarnContext(req.Context(), "audit AttachManyAuditDef resolved to zero events", slog.Int("request_body_size", len(requestBody)), slog.String("request_body_head", truncate(requestBody, 256)))
			}
		}

		for _, r := range resolved {
			event := audittypes.NewAuditEventFromHTTPRequest(
				req,
				routeTemplate,
				statusCode,
				span.SpanContext().TraceID(),
				span.SpanContext().SpanID(),
				r.Verb,
				r.Category,
				claims,
				r.ResourceAttributes,
				errorType,
				errorCode,
			)

			middleware.auditor.Audit(req.Context(), event)
		}
	}
}

type resolvedAuditDef struct {
	Verb               coretypes.Verb
	Category           audittypes.ActionCategory
	ResourceAttributes audittypes.ResourceAttributes
}

func auditDefsFromRequest(req *http.Request) []handler.AuditDef {
	route := mux.CurrentRoute(req)
	if route == nil {
		return nil
	}

	actualHandler := route.GetHandler()
	if actualHandler == nil {
		return nil
	}

	// The type assertion is necessary because route.GetHandler() returns
	// http.Handler, and not every http.Handler on the mux is a handler.Handler
	// (e.g. middleware wrappers, raw http.HandlerFunc registrations).
	provider, ok := actualHandler.(handler.Handler)
	if !ok {
		return nil
	}

	return provider.AuditDefs()
}

func resolveAuditDef(ctx handler.ExtractorContext, def handler.AuditDef) ([]resolvedAuditDef, error) {
	switch d := def.(type) {
	case handler.BasicAuditDef:
		resourceID, err := extractResourceID(ctx, d.ResourceID)
		if err != nil {
			return nil, err
		}

		return []resolvedAuditDef{{
			Verb:               d.Verb,
			Category:           d.Category,
			ResourceAttributes: audittypes.NewResourceAttributes(d.Resource, resourceID),
		}}, nil
	case handler.AttachAuditDef:
		attachedID, err := extractResourceID(ctx, d.AttachedResourceID)
		if err != nil {
			return nil, err
		}

		targetID, err := extractResourceID(ctx, d.TargetResourceID)
		if err != nil {
			return nil, err
		}

		return []resolvedAuditDef{{
			Verb:               d.Verb,
			Category:           d.Category,
			ResourceAttributes: audittypes.NewAttachResourceAttributes(d.AttachedResource, attachedID, d.TargetResource, targetID),
		}}, nil
	case handler.AttachManyAuditDef:
		ids, err := extractResourceIDs(ctx, d.AttachedResourceIDs)
		if err != nil {
			return nil, err
		}

		targetID, err := extractResourceID(ctx, d.TargetResourceID)
		if err != nil {
			return nil, err
		}

		resolved := make([]resolvedAuditDef, 0, len(ids))
		for _, id := range ids {
			resolved = append(resolved, resolvedAuditDef{
				Verb:               d.Verb,
				Category:           d.Category,
				ResourceAttributes: audittypes.NewAttachResourceAttributes(d.AttachedResource, id, d.TargetResource, targetID),
			})
		}

		return resolved, nil
	}

	return nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "unknown AuditDef implementation %T", def)
}

func extractResourceID(ctx handler.ExtractorContext, extractor handler.ResourceIDExtractor) (string, error) {
	if extractor == nil {
		return "", nil
	}

	return extractor(ctx)
}

func extractResourceIDs(ctx handler.ExtractorContext, extractor handler.ResourceIDsExtractor) ([]string, error) {
	if extractor == nil {
		return nil, nil
	}

	return extractor(ctx)
}

func truncate(b []byte, n int) string {
	if len(b) <= n {
		return string(b)
	}

	return string(b[:n]) + "..."
}
