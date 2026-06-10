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

		// Capture the body only when a resolved resource derives an id from it (e.g. a create).
		if coretypes.ShouldCaptureResponseBody(req.Context()) {
			writer.EnableBodyCapture()
		}

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
			if statusCode >= 400 && responseBuffer.Len() != 0 {
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

	resolved, err := coretypes.ResolvedResourcesFromContext(req.Context())
	if err != nil || len(resolved) == 0 {
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

	extractorCtx := coretypes.ExtractorContext{Request: req, ResponseBody: writer.BodyBytes()}

	for _, resource := range resolved {
		resource.ResolveResponse(extractorCtx)
		verb, category := resource.Verb(), resource.Category()

		switch typed := resource.(type) {
		case coretypes.ResolvedResourceWithTargetResource:
			for _, sourceID := range typed.SourceIDs() {
				for _, targetID := range typed.TargetIDs() {
					attributesList := []audittypes.ResourceAttributes{
						audittypes.NewRelatedResourceAttributes(
							typed.SourceResource(),
							sourceID,
							typed.TargetResource(),
							targetID,
						),
					}

					// Sibling peers are symmetric, so mirror the event from the target's side too.
					if !typed.IsParentChild() {
						attributesList = append(attributesList, audittypes.NewRelatedResourceAttributes(
							typed.TargetResource(),
							targetID,
							typed.SourceResource(),
							sourceID,
						))
					}

					for _, attributes := range attributesList {
						middleware.auditor.Audit(req.Context(), audittypes.NewAuditEventFromHTTPRequest(
							req,
							routeTemplate,
							statusCode,
							span.SpanContext().TraceID(),
							span.SpanContext().SpanID(),
							verb,
							category,
							claims,
							attributes,
							errorType,
							errorCode,
						))
					}
				}
			}
		default:
			for _, id := range resource.SourceIDs() {
				attributes := audittypes.NewResourceAttributes(resource.SourceResource(), id)

				middleware.auditor.Audit(req.Context(), audittypes.NewAuditEventFromHTTPRequest(
					req,
					routeTemplate,
					statusCode,
					span.SpanContext().TraceID(),
					span.SpanContext().SpanID(),
					verb,
					category,
					claims,
					attributes,
					errorType,
					errorCode,
				))
			}
		}
	}
}
