package middleware

import (
	"log/slog"
	"net"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	jsoniter "github.com/json-iterator/go"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
	"go.opentelemetry.io/otel/trace"

	"github.com/SigNoz/signoz/pkg/auditor"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/audittypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var jsonAPI = jsoniter.ConfigCompatibleWithStandardLibrary

const (
	logMessage = "::RECEIVED-REQUEST::"
)

// Audit is a middleware that captures HTTP responses for request logging
// and audit event emission. It wraps the response writer once to avoid
// double-wrapping.
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

		// Audit: emit event if the matched handler declares an AuditDef.
		middleware.emitAuditEvent(req, writer, path)

		// Logging.
		if _, ok := middleware.excludedRoutes[path]; ok {
			return
		}

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

// ---------------------------------------------------------------------------
// Audit event emission
// ---------------------------------------------------------------------------

// emitAuditEvent checks if the matched route's handler carries an AuditDef
// and, if so, builds and emits an audit event. Fail-open: any error during
// event construction is silently ignored.
func (middleware *Audit) emitAuditEvent(req *http.Request, writer responseCapture, routeTemplate string) {
	if middleware.auditor == nil {
		return
	}

	def := auditDefFromRequest(req)
	if def == nil {
		return
	}

	claims, _ := authtypes.ClaimsFromContext(req.Context())
	statusCode := writer.StatusCode()

	// Pre-extract principal.
	principalID, _ := valuer.NewUUID(claims.UserID)
	principalEmail, _ := valuer.NewEmail(claims.Email)
	principalOrgID, _ := valuer.NewUUID(claims.OrgID)

	// Pre-extract trace context.
	span := trace.SpanFromContext(req.Context())
	var traceID, spanID string
	if span.SpanContext().HasTraceID() {
		traceID = span.SpanContext().TraceID().String()
	}
	if span.SpanContext().HasSpanID() {
		spanID = span.SpanContext().SpanID().String()
	}

	// Pre-extract error details.
	var errorType, errorCode, errorMessage string
	if statusCode >= 400 {
		errorType = errorTypeFromStatusCode(statusCode)
		errorCode, errorMessage = parseErrorResponse(writer.BodyBytes())
	}

	event := audittypes.NewAuditEventFromHTTPRequest(req, audittypes.AuditEventContext{
		Action:         def.Action,
		ActionCategory: def.Category,
		ResourceName:   def.ResourceName,
		ResourceID:     resourceIDFromRequest(req, def.ResourceIDParam),
		PrincipalID:    principalID,
		PrincipalEmail: principalEmail,
		PrincipalType:  principalTypeFromClaims(claims),
		PrincipalOrgID: principalOrgID,
		IdentNProvider: claims.IdentNProvider,
		StatusCode:     statusCode,
		ErrorType:      errorType,
		ErrorCode:      errorCode,
		ErrorMessage:   errorMessage,
		RouteTemplate:  routeTemplate,
		TraceID:        traceID,
		SpanID:         spanID,
	})
	middleware.auditor.Audit(req.Context(), event)
}

// auditDefFromRequest extracts the AuditDef from the matched route's handler.
// Returns nil if the handler does not implement handler.AuditDefProvider.
func auditDefFromRequest(req *http.Request) *handler.AuditDef {
	route := mux.CurrentRoute(req)
	if route == nil {
		return nil
	}
	h := route.GetHandler()
	if h == nil {
		return nil
	}
	provider, ok := h.(handler.AuditDefProvider)
	if !ok {
		return nil
	}
	return provider.AuditDef()
}

// resourceIDFromRequest extracts the resource ID from gorilla/mux path
// parameters. Returns an empty string when the param is not configured or
// not present.
func resourceIDFromRequest(req *http.Request, param string) string {
	if param == "" {
		return ""
	}
	vars := mux.Vars(req)
	if vars == nil {
		return ""
	}
	return vars[param]
}

// principalTypeFromClaims derives the principal type from authentication
// claims. API key authentication maps to service_account; everything else
// maps to user.
func principalTypeFromClaims(claims authtypes.Claims) audittypes.PrincipalType {
	if claims.IdentNProvider == "api_key" {
		return audittypes.PrincipalTypeServiceAccount
	}
	return audittypes.PrincipalTypeUser
}

// parseErrorResponse attempts to extract the error code and message from a
// response body formatted as render.ErrorResponse. Returns zero values on
// parse failure (fail-open).
func parseErrorResponse(body []byte) (code string, message string) {
	if len(body) == 0 {
		return "", ""
	}
	var resp render.ErrorResponse
	if err := jsonAPI.Unmarshal(body, &resp); err != nil {
		return "", ""
	}
	if resp.Error == nil {
		return "", ""
	}
	return resp.Error.Code, resp.Error.Message
}

// errorTypeFromStatusCode maps an HTTP status code to the corresponding error
// type string. This is the reverse of the mapping in render.Error().
func errorTypeFromStatusCode(statusCode int) string {
	switch statusCode {
	case http.StatusBadRequest:
		return errors.TypeInvalidInput.String()
	case http.StatusUnauthorized:
		return errors.TypeUnauthenticated.String()
	case http.StatusForbidden:
		return errors.TypeForbidden.String()
	case http.StatusNotFound:
		return errors.TypeNotFound.String()
	case http.StatusConflict:
		return errors.TypeAlreadyExists.String()
	case http.StatusUnavailableForLegalReasons:
		return errors.TypeLicenseUnavailable.String()
	case http.StatusNotImplemented:
		return errors.TypeUnsupported.String()
	case http.StatusGatewayTimeout:
		return errors.TypeTimeout.String()
	default:
		return errors.TypeInternal.String()
	}
}
