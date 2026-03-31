package audittypes

import (
	"fmt"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"go.opentelemetry.io/collector/pdata/pcommon"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
)

// Audit attributes — Action (What)
type AuditEventAuditAttributes struct {
	Action         Action         `json:"action"`
	ActionCategory ActionCategory `json:"actionCategory"`
	Outcome        Outcome        `json:"outcome"`
	IdentNProvider string         `json:"identnProvider,omitempty"`
}

func NewAuditEventAuditAttributesFromHTTP(statusCode int, action Action, category ActionCategory, claims authtypes.Claims) AuditEventAuditAttributes {
	outcome := OutcomeFailure
	if statusCode >= 200 && statusCode < 400 {
		outcome = OutcomeSuccess
	}

	return AuditEventAuditAttributes{
		Action:         action,
		ActionCategory: category,
		Outcome:        outcome,
		IdentNProvider: claims.IdentNProvider,
	}
}

func (attributes AuditEventAuditAttributes) Put(dest pcommon.Map) {
	dest.PutStr("signoz.audit.action", attributes.Action.StringValue())
	dest.PutStr("signoz.audit.action_category", attributes.ActionCategory.StringValue())
	dest.PutStr("signoz.audit.outcome", attributes.Outcome.StringValue())
	putStrIfNotEmpty(dest, "signoz.audit.identn_provider", attributes.IdentNProvider)
}

// Audit attributes — Principal (Who)
type AuditEventPrincipalAttributes struct {
	PrincipalID    valuer.UUID   `json:"principalId"`
	PrincipalEmail valuer.Email  `json:"principalEmail"`
	PrincipalType  PrincipalType `json:"principalType"`
	PrincipalOrgID valuer.UUID   `json:"principalOrgId"`
}

func NewAuditEventPrincipalAttributesFromClaims(claims authtypes.Claims) AuditEventPrincipalAttributes {
	principalID, _ := valuer.NewUUID(claims.UserID)
	principalEmail, _ := valuer.NewEmail(claims.Email)
	principalOrgID, _ := valuer.NewUUID(claims.OrgID)

	// TODO: Read from claims once we have a more robust identity provider system. For now, we only distinguish between user and service account based on the presence of an API key.
	principalType := PrincipalTypeUser
	if claims.IdentNProvider == "api_key" {
		principalType = PrincipalTypeServiceAccount
	}

	return AuditEventPrincipalAttributes{
		PrincipalID:    principalID,
		PrincipalEmail: principalEmail,
		PrincipalType:  principalType,
		PrincipalOrgID: principalOrgID,
	}
}

func (attributes AuditEventPrincipalAttributes) Put(dest pcommon.Map) {
	dest.PutStr("signoz.audit.principal.id", attributes.PrincipalID.StringValue())
	dest.PutStr("signoz.audit.principal.email", attributes.PrincipalEmail.String())
	dest.PutStr("signoz.audit.principal.type", attributes.PrincipalType.StringValue())
	dest.PutStr("signoz.audit.principal.org_id", attributes.PrincipalOrgID.StringValue())
}

// Audit attributes — Resource (On What)
type AuditEventResourceAttributes struct {
	ResourceID   string `json:"resourceId,omitempty"`
	ResourceName string `json:"resourceName"`
}

func NewAuditEventResourceAttributes(resourceID, resourceName string) AuditEventResourceAttributes {
	return AuditEventResourceAttributes{
		ResourceID:   resourceID,
		ResourceName: resourceName,
	}
}

func (attributes AuditEventResourceAttributes) Put(dest pcommon.Map) {
	putStrIfNotEmpty(dest, "signoz.audit.resource.name", attributes.ResourceName)
	putStrIfNotEmpty(dest, "signoz.audit.resource.id", attributes.ResourceID)
}

// Audit attributes — Error (When outcome is failure)
type AuditEventErrorAttributes struct {
	ErrorType    string `json:"errorType,omitempty"`
	ErrorCode    string `json:"errorCode,omitempty"`
	ErrorMessage string `json:"errorMessage,omitempty"`
}

func NewAuditEventErrorAttributes(errorType, errorCode, errorMessage string) AuditEventErrorAttributes {
	return AuditEventErrorAttributes{
		ErrorType:    errorType,
		ErrorCode:    errorCode,
		ErrorMessage: errorMessage,
	}
}

func (attributes AuditEventErrorAttributes) Put(dest pcommon.Map) {
	putStrIfNotEmpty(dest, "signoz.audit.error.type", attributes.ErrorType)
	putStrIfNotEmpty(dest, "signoz.audit.error.code", attributes.ErrorCode)
	putStrIfNotEmpty(dest, "signoz.audit.error.message", attributes.ErrorMessage)
}

// Audit attributes — Transport Context (Where/How)
type AuditEventTransportAttributes struct {
	HTTPMethod     string `json:"httpMethod,omitempty"`
	HTTPRoute      string `json:"httpRoute,omitempty"`
	HTTPStatusCode int    `json:"httpStatusCode,omitempty"`
	URLPath        string `json:"urlPath,omitempty"`
	ClientAddress  string `json:"clientAddress,omitempty"`
	UserAgent      string `json:"userAgent,omitempty"`
}

func NewAuditEventTransportAttributesFromHTTP(req *http.Request, route string, statusCode int) AuditEventTransportAttributes {
	return AuditEventTransportAttributes{
		HTTPMethod:     req.Method,
		HTTPRoute:      route,
		HTTPStatusCode: statusCode,
		URLPath:        req.URL.Path,
		ClientAddress:  req.RemoteAddr,
		UserAgent:      req.UserAgent(),
	}
}

func (attributes AuditEventTransportAttributes) Put(dest pcommon.Map) {
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

func newBody(auditAttributes AuditEventAuditAttributes, principalAttributes AuditEventPrincipalAttributes, resourceAttributes AuditEventResourceAttributes, errorAttributes AuditEventErrorAttributes) string {
	if auditAttributes.Outcome == OutcomeSuccess {
		return fmt.Sprintf("%s (%s) %s %s %s", principalAttributes.PrincipalEmail, principalAttributes.PrincipalID, auditAttributes.Action.PastTense(), resourceAttributes.ResourceName, resourceAttributes.ResourceID)
	}

	return fmt.Sprintf("%s (%s) failed to %s %s %s: %s (%s)", principalAttributes.PrincipalEmail, principalAttributes.PrincipalID, auditAttributes.Action.StringValue(), resourceAttributes.ResourceName, resourceAttributes.ResourceID, errorAttributes.ErrorType, errorAttributes.ErrorCode)
}
