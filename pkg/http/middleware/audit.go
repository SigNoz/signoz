package middleware

import (
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

		responseBuffer := &byteBuffer{}
		writer := newResponseCapture(rw, responseBuffer)
		next.ServeHTTP(writer, req)

		statusCode, writeErr := writer.StatusCode(), writer.WriteError()

		// Logging or Audit: skip if the matched route is in the excluded list. This allows us to exclude noisy routes (e.g. health checks) from both logging and audit.
		if _, ok := middleware.excludedRoutes[path]; ok {
			return
		}

		middleware.emitAuditEvent(req, writer, path)

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

func (middleware *Audit) emitAuditEvent(req *http.Request, writer responseCapture, routeTemplate string) {
	if middleware.auditor == nil {
		return
	}

	def := auditDefFromRequest(req)
	if def == nil {
		return
	}

	verb, category, resourceAttributes, err := resolveAuditDef(req, def)
	if err != nil {
		middleware.logger.WarnContext(req.Context(), "audit event dropped — resource id extraction failed", errors.Attr(err))
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

	event := audittypes.NewAuditEventFromHTTPRequest(
		req,
		routeTemplate,
		statusCode,
		span.SpanContext().TraceID(),
		span.SpanContext().SpanID(),
		verb,
		category,
		claims,
		resourceAttributes,
		errorType,
		errorCode,
	)

	middleware.auditor.Audit(req.Context(), event)
}

func auditDefFromRequest(req *http.Request) handler.AuditDef {
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

	return provider.AuditDef()
}

func resolveAuditDef(req *http.Request, def handler.AuditDef) (coretypes.Verb, audittypes.ActionCategory, audittypes.ResourceAttributes, error) {
	switch d := def.(type) {
	case handler.BasicAuditDef:
		resourceID, err := extractResourceID(req, d.ResourceID)
		if err != nil {
			return coretypes.Verb{}, audittypes.ActionCategory{}, audittypes.ResourceAttributes{}, err
		}

		return d.Verb, d.Category, audittypes.NewResourceAttributes(d.Resource, resourceID), nil
	case handler.AttachAuditDef:
		attachedID, err := extractResourceID(req, d.AttachedResourceID)
		if err != nil {
			return coretypes.Verb{}, audittypes.ActionCategory{}, audittypes.ResourceAttributes{}, err
		}

		targetID, err := extractResourceID(req, d.TargetResourceID)
		if err != nil {
			return coretypes.Verb{}, audittypes.ActionCategory{}, audittypes.ResourceAttributes{}, err
		}

		return d.Verb, d.Category, audittypes.NewAttachResourceAttributes(d.AttachedResource, attachedID, d.TargetResource, targetID), nil
	}

	return coretypes.Verb{}, audittypes.ActionCategory{}, audittypes.ResourceAttributes{}, errors.Newf(errors.TypeInternal, errors.CodeInternal, "unknown AuditDef implementation %T", def)
}

func extractResourceID(req *http.Request, extractor handler.ResourceIDExtractor) (string, error) {
	if extractor == nil {
		return "", nil
	}

	return extractor(req)
}
