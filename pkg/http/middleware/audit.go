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

		// If any resolved resource derives its id from the response, capture the
		// success body (bounded) so the audit event can read it post-handler.
		if resolved, ok := ResolvedFromContext(req.Context()); ok && handler.HasResponseIDs(*resolved) {
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
			// Only log error bodies (status >= 400); a force-captured success
			// body is for audit id extraction, not for logging.
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

	claims, _ := authtypes.ClaimsFromContext(req.Context())
	statusCode := writer.StatusCode()
	span := trace.SpanFromContext(req.Context())

	var errorType, errorCode string
	if statusCode >= 400 {
		errorType = render.ErrorTypeFromStatusCode(statusCode)
		errorCode = render.ErrorCodeFromBody(writer.BodyBytes())
	}

	// Resources resolved by the Resource middleware — emit one event per entry.
	resolved, ok := ResolvedFromContext(req.Context())
	if !ok || len(*resolved) == 0 {
		return
	}

	handler.FinalizeResponseIDs(*resolved, handler.ExtractorContext{Request: req, ResponseBody: writer.BodyBytes()})

	for _, entry := range *resolved {
		resourceAttributes := audittypes.NewResourceAttributes(entry.Resource, entry.ID)
		if entry.Related != nil {
			resourceAttributes = audittypes.NewAttachResourceAttributes(entry.Resource, entry.ID, entry.Related.Resource, entry.Related.ID)
		}

		event := audittypes.NewAuditEvent(
			req,
			routeTemplate,
			statusCode,
			span.SpanContext().TraceID(),
			span.SpanContext().SpanID(),
			entry.Verb,
			audittypes.CategoryFor(entry.Resource),
			claims,
			resourceAttributes,
			errorType,
			errorCode,
		)

		middleware.auditor.Audit(req.Context(), event)
	}
}
