package audittypes

import (
	"net/http"
	"strings"

	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"go.opentelemetry.io/collector/pdata/pcommon"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
)

// Audit attributes — Action (What).
type AuditAttributes struct {
	Action         Action         // guaranteed to be present
	ActionCategory ActionCategory // guaranteed to be present
	Outcome        Outcome        // guaranteed to be present
	IdentNProvider authtypes.IdentNProvider
}

func NewAuditAttributesFromHTTP(statusCode int, action Action, category ActionCategory, claims authtypes.Claims) AuditAttributes {
	outcome := OutcomeFailure
	if statusCode >= 200 && statusCode < 400 {
		outcome = OutcomeSuccess
	}

	return AuditAttributes{
		Action:         action,
		ActionCategory: category,
		Outcome:        outcome,
		IdentNProvider: claims.IdentNProvider,
	}
}

func (attributes AuditAttributes) Put(dest pcommon.Map) {
	dest.PutStr("signoz.audit.action", attributes.Action.StringValue())
	dest.PutStr("signoz.audit.action_category", attributes.ActionCategory.StringValue())
	dest.PutStr("signoz.audit.outcome", attributes.Outcome.StringValue())
	putStrIfNotEmpty(dest, "signoz.audit.identn_provider", attributes.IdentNProvider.StringValue())
}

// Audit attributes — Principal (Who).
type PrincipalAttributes struct {
	PrincipalType  authtypes.Principal
	PrincipalID    valuer.UUID
	PrincipalEmail valuer.Email
	PrincipalOrgID valuer.UUID
}

func NewPrincipalAttributesFromClaims(claims authtypes.Claims) PrincipalAttributes {
	principalID, _ := valuer.NewUUID(claims.UserID)
	principalEmail, _ := valuer.NewEmail(claims.Email)
	principalOrgID, _ := valuer.NewUUID(claims.OrgID)

	return PrincipalAttributes{
		PrincipalType:  claims.Principal,
		PrincipalID:    principalID,
		PrincipalEmail: principalEmail,
		PrincipalOrgID: principalOrgID,
	}
}

func (attributes PrincipalAttributes) Put(dest pcommon.Map) {
	dest.PutStr("signoz.audit.principal.id", attributes.PrincipalID.StringValue())
	dest.PutStr("signoz.audit.principal.email", attributes.PrincipalEmail.String())
	dest.PutStr("signoz.audit.principal.type", attributes.PrincipalType.StringValue())
	dest.PutStr("signoz.audit.principal.org_id", attributes.PrincipalOrgID.StringValue())
}

// Audit attributes — Resource (On What).
type ResourceAttributes struct {
	ResourceID   string
	ResourceName string // guaranteed to be present
}

func NewResourceAttributes(resourceID, resourceName string) ResourceAttributes {
	return ResourceAttributes{
		ResourceID:   resourceID,
		ResourceName: resourceName,
	}
}

func (attributes ResourceAttributes) Put(dest pcommon.Map) {
	putStrIfNotEmpty(dest, "signoz.audit.resource.name", attributes.ResourceName)
	putStrIfNotEmpty(dest, "signoz.audit.resource.id", attributes.ResourceID)
}

// Audit attributes — Error (When outcome is failure)
// Error messages are intentionally excluded to avoid leaking sensitive or
// PII data into audit logs. The error type and code are sufficient for
// filtering and alerting; investigators can correlate via trace ID.
type ErrorAttributes struct {
	ErrorType string
	ErrorCode string
}

func NewErrorAttributes(errorType, errorCode string) ErrorAttributes {
	return ErrorAttributes{
		ErrorType: errorType,
		ErrorCode: errorCode,
	}
}

func (attributes ErrorAttributes) Put(dest pcommon.Map) {
	putStrIfNotEmpty(dest, "signoz.audit.error.type", attributes.ErrorType)
	putStrIfNotEmpty(dest, "signoz.audit.error.code", attributes.ErrorCode)
}

// Audit attributes — Transport Context (Where/How).
type TransportAttributes struct {
	HTTPMethod     string
	HTTPRoute      string
	HTTPStatusCode int
	URLPath        string
	ClientAddress  string
	UserAgent      string
}

func NewTransportAttributesFromHTTP(req *http.Request, route string, statusCode int) TransportAttributes {
	return TransportAttributes{
		HTTPMethod:     req.Method,
		HTTPRoute:      route,
		HTTPStatusCode: statusCode,
		URLPath:        req.URL.Path,
		ClientAddress:  req.RemoteAddr,
		UserAgent:      req.UserAgent(),
	}
}

func (attributes TransportAttributes) Put(dest pcommon.Map) {
	putStrIfNotEmpty(dest, string(semconv.HTTPRequestMethodKey), attributes.HTTPMethod)
	putStrIfNotEmpty(dest, string(semconv.HTTPRouteKey), attributes.HTTPRoute)
	if attributes.HTTPStatusCode != 0 {
		dest.PutInt(string(semconv.HTTPResponseStatusCodeKey), int64(attributes.HTTPStatusCode))
	}
	putStrIfNotEmpty(dest, string(semconv.URLPathKey), attributes.URLPath)
	putStrIfNotEmpty(dest, string(semconv.ClientAddressKey), attributes.ClientAddress)
	putStrIfNotEmpty(dest, string(semconv.UserAgentOriginalKey), attributes.UserAgent)
}

func putStrIfNotEmpty(attrs pcommon.Map, key, value string) {
	if value != "" {
		attrs.PutStr(key, value)
	}
}

func newBody(auditAttributes AuditAttributes, principalAttributes PrincipalAttributes, resourceAttributes ResourceAttributes, errorAttributes ErrorAttributes) string {
	var b strings.Builder

	// Principal: "email (id)" or "id" or "email" or omitted.
	hasEmail := principalAttributes.PrincipalEmail.String() != ""
	hasID := !principalAttributes.PrincipalID.IsZero()
	if hasEmail {
		b.WriteString(principalAttributes.PrincipalEmail.String())
		if hasID {
			b.WriteString(" (")
			b.WriteString(principalAttributes.PrincipalID.StringValue())
			b.WriteString(")")
		}
	} else if hasID {
		b.WriteString(principalAttributes.PrincipalID.StringValue())
	}

	// Action: " created" or " failed to create".
	if b.Len() > 0 {
		b.WriteString(" ")
	}
	if auditAttributes.Outcome == OutcomeSuccess {
		b.WriteString(auditAttributes.Action.PastTense())
	} else {
		b.WriteString("failed to ")
		b.WriteString(auditAttributes.Action.StringValue())
	}

	// Resource: " name (id)" or " name".
	b.WriteString(" ")
	b.WriteString(resourceAttributes.ResourceName)
	if resourceAttributes.ResourceID != "" {
		b.WriteString(" (")
		b.WriteString(resourceAttributes.ResourceID)
		b.WriteString(")")
	}

	// Error suffix (failure only): ": type (code)" or ": type" or ": (code)" or omitted.
	if auditAttributes.Outcome == OutcomeFailure {
		errorType := errorAttributes.ErrorType
		errorCode := errorAttributes.ErrorCode
		if errorType != "" || errorCode != "" {
			b.WriteString(": ")
			if errorType != "" && errorCode != "" {
				b.WriteString(errorType)
				b.WriteString(" (")
				b.WriteString(errorCode)
				b.WriteString(")")
			} else if errorType != "" {
				b.WriteString(errorType)
			} else {
				b.WriteString("(")
				b.WriteString(errorCode)
				b.WriteString(")")
			}
		}
	}

	return b.String()
}
