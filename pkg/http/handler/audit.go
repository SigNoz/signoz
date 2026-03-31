package handler

import (
	"bytes"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	jsoniter "github.com/json-iterator/go"
	"go.opentelemetry.io/otel/trace"

	"github.com/SigNoz/signoz/pkg/auditor"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/audittypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var json = jsoniter.ConfigCompatibleWithStandardLibrary

// maxAuditResponseBody is the maximum number of bytes captured from the
// response body for error parsing in audit events.
const maxAuditResponseBody = 4096

// AuditDef declares audit instrumentation for a handler. When set alongside
// an OpenAPIDef, the handler automatically emits an audit event after every
// request via auditor.Audit().
type AuditDef struct {
	ResourceName    string                    // AuthZ Typeable.Name() value, e.g. "dashboard", "user".
	Action          audittypes.Action         // create, update, delete, login, etc.
	Category        audittypes.ActionCategory // access_control, configuration_change, etc.
	ResourceIDParam string                    // Gorilla mux path param name for the resource ID.
}

// Option configures optional behaviour on a handler created by New.
type Option func(*handler)

// WithAudit attaches audit instrumentation to the handler. When present, the
// handler wraps the response writer to capture status code and body, then
// emits an audit event after the inner handler completes.
func WithAudit(def AuditDef, a auditor.Auditor) Option {
	return func(h *handler) {
		h.auditDef = &def
		h.auditor = a
	}
}

// serveWithAudit wraps the handler with response capture and emits an audit
// event after the inner handler completes. Fail-open: errors during event
// construction are silently ignored.
func (handler *handler) serveWithAudit(rw http.ResponseWriter, req *http.Request) {
	sc := newStatusCapture(rw)
	handler.handlerFunc.ServeHTTP(sc, req)

	claims, _ := authtypes.ClaimsFromContext(req.Context())
	event := buildAuditEvent(req, sc.statusCode(), sc.bodyBytes(), *handler.auditDef, claims)
	handler.auditor.Audit(req.Context(), event)
}

// buildAuditEvent constructs an AuditEvent from the request, captured
// response, audit definition, and authenticated claims.
func buildAuditEvent(req *http.Request, statusCode int, body []byte, def AuditDef, claims authtypes.Claims) audittypes.AuditEvent {
	event := audittypes.AuditEvent{
		Timestamp:      time.Now(),
		EventName:      audittypes.NewEventName(def.ResourceName, def.Action),
		Action:         def.Action,
		ActionCategory: def.Category,
		ResourceName:   def.ResourceName,
		ResourceID:     resourceIDFromRequest(req, def.ResourceIDParam),
		HTTPMethod:     req.Method,
		HTTPRoute:      routeTemplate(req),
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

// routeTemplate returns the gorilla/mux route template for the request, e.g.
// "/api/v1/dashboards/{id}". Returns an empty string if unavailable.
func routeTemplate(req *http.Request) string {
	route := mux.CurrentRoute(req)
	if route == nil {
		return ""
	}
	tmpl, err := route.GetPathTemplate()
	if err != nil {
		return ""
	}
	return tmpl
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
	if err := json.Unmarshal(body, &resp); err != nil {
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

// ---------------------------------------------------------------------------
// statusCapture — ResponseWriter wrapper that captures status code and body
// ---------------------------------------------------------------------------

// statusCaptureWriter is the interface returned by newStatusCapture.
type statusCaptureWriter interface {
	http.ResponseWriter
	statusCode() int
	bodyBytes() []byte
}

// newStatusCapture wraps an http.ResponseWriter to capture the status code
// and response body (up to maxAuditResponseBody bytes). The returned writer
// transparently delegates all writes to the inner writer.
func newStatusCapture(rw http.ResponseWriter) statusCaptureWriter {
	base := &nonFlushingStatusCapture{rw: rw, code: http.StatusOK}
	if f, ok := rw.(http.Flusher); ok {
		return &flushingStatusCapture{nonFlushingStatusCapture: base, f: f}
	}
	return base
}

type nonFlushingStatusCapture struct {
	rw            http.ResponseWriter
	code          int
	body          bytes.Buffer
	bodyBytesLeft int
	headerWritten bool
}

func (sc *nonFlushingStatusCapture) Header() http.Header {
	return sc.rw.Header()
}

func (sc *nonFlushingStatusCapture) WriteHeader(code int) {
	if sc.headerWritten {
		return
	}
	sc.headerWritten = true
	sc.code = code
	if code >= 400 {
		sc.bodyBytesLeft = maxAuditResponseBody
	}
	sc.rw.WriteHeader(code)
}

func (sc *nonFlushingStatusCapture) Write(data []byte) (int, error) {
	if !sc.headerWritten {
		sc.WriteHeader(http.StatusOK)
	}
	n, err := sc.rw.Write(data)
	if sc.bodyBytesLeft > 0 {
		capture := data
		if len(capture) > sc.bodyBytesLeft {
			capture = capture[:sc.bodyBytesLeft]
		}
		sc.body.Write(capture)
		sc.bodyBytesLeft -= len(capture)
	}
	return n, err
}

func (sc *nonFlushingStatusCapture) Unwrap() http.ResponseWriter {
	return sc.rw
}

func (sc *nonFlushingStatusCapture) statusCode() int {
	return sc.code
}

func (sc *nonFlushingStatusCapture) bodyBytes() []byte {
	return sc.body.Bytes()
}

type flushingStatusCapture struct {
	*nonFlushingStatusCapture
	f http.Flusher
}

func (sc *flushingStatusCapture) Flush() {
	sc.f.Flush()
}
