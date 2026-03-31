package middleware

import (
	"net/http"
	"time"

	"github.com/gorilla/mux"
	jsoniter "github.com/json-iterator/go"
	"go.opentelemetry.io/otel/trace"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/audittypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var jsonAPI = jsoniter.ConfigCompatibleWithStandardLibrary

// emitAuditEvent checks if the matched route's handler carries an AuditDef
// and, if so, builds and emits an audit event. Fail-open: any error during
// event construction is silently ignored.
func (middleware *Logging) emitAuditEvent(req *http.Request, writer responseCapture, routeTemplate string) {
	if middleware.auditor == nil {
		return
	}

	def := auditDefFromRequest(req)
	if def == nil {
		return
	}

	claims, _ := authtypes.ClaimsFromContext(req.Context())
	event := buildAuditEvent(req, writer.StatusCode(), writer.BodyBytes(), *def, claims, routeTemplate)
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

// buildAuditEvent constructs an AuditEvent from the request, captured
// response, audit definition, and authenticated claims.
func buildAuditEvent(req *http.Request, statusCode int, body []byte, def handler.AuditDef, claims authtypes.Claims, routeTemplate string) audittypes.AuditEvent {
	event := audittypes.AuditEvent{
		Timestamp:      time.Now(),
		EventName:      audittypes.NewEventName(def.ResourceName, def.Action),
		Action:         def.Action,
		ActionCategory: def.Category,
		ResourceName:   def.ResourceName,
		ResourceID:     resourceIDFromRequest(req, def.ResourceIDParam),
		HTTPMethod:     req.Method,
		HTTPRoute:      routeTemplate,
		HTTPStatusCode: statusCode,
		URLPath:        req.URL.Path,
		ClientAddress:  req.RemoteAddr,
		UserAgent:      req.UserAgent(),
	}

	// Principal.
	principalID, _ := valuer.NewUUID(claims.UserID)
	principalEmail, _ := valuer.NewEmail(claims.Email)
	principalOrgID, _ := valuer.NewUUID(claims.OrgID)
	event.PrincipalID = principalID
	event.PrincipalEmail = principalEmail
	event.PrincipalType = principalTypeFromClaims(claims)
	event.PrincipalOrgID = principalOrgID
	event.IdentNProvider = claims.IdentNProvider

	// Trace context.
	span := trace.SpanFromContext(req.Context())
	if span.SpanContext().HasTraceID() {
		event.TraceID = span.SpanContext().TraceID().String()
	}
	if span.SpanContext().HasSpanID() {
		event.SpanID = span.SpanContext().SpanID().String()
	}

	// Outcome and error details.
	if statusCode >= 400 {
		event.Outcome = audittypes.OutcomeFailure
		event.ErrorType = errorTypeFromStatusCode(statusCode)
		code, message := parseErrorResponse(body)
		event.ErrorCode = code
		event.ErrorMessage = message
	} else {
		event.Outcome = audittypes.OutcomeSuccess
	}

	return event
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
