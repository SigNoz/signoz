package audittypes

import (
	"net"
	"net/http"
	"strconv"
	"strings"

	"github.com/SigNoz/signoz-semantic-conventions/gen/go/sigsemconv"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"go.opentelemetry.io/collector/pdata/pcommon"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
)

// Audit attributes — Action (What).
type AuditAttributes struct {
	Action         coretypes.Verb           // guaranteed to be present
	ActionCategory coretypes.ActionCategory // guaranteed to be present
	Outcome        Outcome                  // guaranteed to be present
}

func NewAuditAttributesFromHTTP(statusCode int, action coretypes.Verb, category coretypes.ActionCategory) AuditAttributes {
	outcome := OutcomeFailure
	if statusCode >= 200 && statusCode < 400 {
		outcome = OutcomeSuccess
	}

	return AuditAttributes{
		Action:         action,
		ActionCategory: category,
		Outcome:        outcome,
	}
}

func (attributes AuditAttributes) Put(dest pcommon.Map) {
	dest.PutStr(string(sigsemconv.SigNozAuditVerbKey), attributes.Action.StringValue())
	dest.PutStr(string(sigsemconv.SigNozAuditActionCategoryKey), attributes.ActionCategory.StringValue())
	dest.PutStr(string(sigsemconv.SigNozAuditOutcomeKey), attributes.Outcome.StringValue())
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
	if claims.Principal == authtypes.PrincipalServiceAccount {
		principalID, _ = valuer.NewUUID(claims.ServiceAccountID)
	}
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
	if !attributes.PrincipalID.IsZero() {
		dest.PutStr(string(sigsemconv.SigNozPrincipalIDKey), attributes.PrincipalID.StringValue())
		putStrIfNotEmpty(dest, string(sigsemconv.SigNozPrincipalTypeKey), attributes.PrincipalType.StringValue())
	}
	putStrIfNotEmpty(dest, string(sigsemconv.SigNozPrincipalEmailKey), attributes.PrincipalEmail.String())
	dest.PutStr(string(sigsemconv.SigNozOrganizationIDKey), attributes.PrincipalOrgID.StringValue())
}

// Audit attributes — Resource (On What).
// These are OTel resource attributes (placed on the Resource, not event attributes).
type ResourceAttributes struct {
	Resource   coretypes.Resource // guaranteed to be present
	ResourceID string
}

func NewResourceAttributes(resource coretypes.Resource, resourceID string) ResourceAttributes {
	return ResourceAttributes{
		Resource:   resource,
		ResourceID: resourceID,
	}
}

// Put writes the resource attributes to an OTel Resource's attribute map.
// These are resource-level attributes (stored in the resource JSON column),
// not event-level attributes (stored in attributes_string).
func (attributes ResourceAttributes) Put(orgID valuer.UUID, dest pcommon.Map) {
	putStrIfNotEmpty(dest, string(sigsemconv.SigNozResourceKindKey), attributes.Resource.Kind().String())
	putStrIfNotEmpty(dest, string(sigsemconv.SigNozResourceIDKey), attributes.ResourceID)
	if attributes.ResourceID != "" {
		putStrIfNotEmpty(dest, string(sigsemconv.SigNozResourceObjectKey), attributes.Resource.Object(orgID, attributes.ResourceID))
	}
}

// Audit attributes — Target (To/From What).
// The counterpart of an attach/detach event, placed on the log record.
type TargetAttributes struct {
	// nil when there is no relationship.
	TargetResource   coretypes.Resource
	TargetResourceID string
}

func NewTargetAttributes(targetResource coretypes.Resource, targetResourceID string) TargetAttributes {
	return TargetAttributes{
		TargetResource:   targetResource,
		TargetResourceID: targetResourceID,
	}
}

func (attributes TargetAttributes) Put(orgID valuer.UUID, dest pcommon.Map) {
	if attributes.TargetResource == nil {
		return
	}

	putStrIfNotEmpty(dest, string(sigsemconv.SigNozResourceTargetKindKey), attributes.TargetResource.Kind().String())
	putStrIfNotEmpty(dest, string(sigsemconv.SigNozResourceTargetIDKey), attributes.TargetResourceID)
	if attributes.TargetResourceID != "" {
		putStrIfNotEmpty(dest, string(sigsemconv.SigNozResourceTargetObjectKey), attributes.TargetResource.Object(orgID, attributes.TargetResourceID))
	}
}

// Audit attributes — Workspace.
type WorkspaceAttributes struct {
	// The ingestion key the resource is or belongs to.
	WorkspaceKeyID string
}

func NewWorkspaceAttributes(resourceAttributes ResourceAttributes, targetAttributes TargetAttributes) WorkspaceAttributes {
	if resourceAttributes.Resource.Kind() == coretypes.KindIngestionKey {
		return WorkspaceAttributes{WorkspaceKeyID: resourceAttributes.ResourceID}
	}

	if resourceAttributes.Resource.Kind() == coretypes.KindIngestionLimit && targetAttributes.TargetResource != nil && targetAttributes.TargetResource.Kind() == coretypes.KindIngestionKey {
		return WorkspaceAttributes{WorkspaceKeyID: targetAttributes.TargetResourceID}
	}

	return WorkspaceAttributes{}
}

func (attributes WorkspaceAttributes) Put(dest pcommon.Map) {
	putStrIfNotEmpty(dest, string(sigsemconv.SigNozWorkspaceKeyIDKey), attributes.WorkspaceKeyID)
}

// Audit attributes — Error (When outcome is failure)
// Error messages are intentionally excluded to avoid leaking sensitive or
// PII data into audit logs. The error type is sufficient for filtering and
// alerting; investigators can correlate via trace ID.
type ErrorAttributes struct {
	ErrorType string
}

func NewErrorAttributes(errorType string) ErrorAttributes {
	return ErrorAttributes{
		ErrorType: errorType,
	}
}

func (attributes ErrorAttributes) Put(dest pcommon.Map) {
	putStrIfNotEmpty(dest, string(semconv.ExceptionTypeKey), attributes.ErrorType)
}

// Audit attributes — Transport Context (Where/How).
type TransportAttributes struct {
	NetworkProtocolName    string
	NetworkProtocolVersion string
	URLScheme              string
	HTTPMethod             string
	HTTPRoute              string
	HTTPStatusCode         int
	URLPath                string
	ClientAddress          string
	ClientPort             int
	UserAgent              string
}

func NewTransportAttributesFromHTTP(req *http.Request, route string, statusCode int) TransportAttributes {
	scheme := "http"
	if req.TLS != nil {
		scheme = "https"
	}

	clientAddress, clientPort := splitHostPort(req.RemoteAddr)

	return TransportAttributes{
		NetworkProtocolName:    "http",
		NetworkProtocolVersion: networkProtocolVersion(req),
		URLScheme:              scheme,
		HTTPMethod:             req.Method,
		HTTPRoute:              route,
		HTTPStatusCode:         statusCode,
		URLPath:                req.URL.Path,
		ClientAddress:          clientAddress,
		ClientPort:             clientPort,
		UserAgent:              req.UserAgent(),
	}
}

func (attributes TransportAttributes) Put(dest pcommon.Map) {
	putStrIfNotEmpty(dest, string(semconv.NetworkProtocolNameKey), attributes.NetworkProtocolName)
	putStrIfNotEmpty(dest, string(semconv.NetworkProtocolVersionKey), attributes.NetworkProtocolVersion)
	putStrIfNotEmpty(dest, string(semconv.URLSchemeKey), attributes.URLScheme)
	putStrIfNotEmpty(dest, string(semconv.HTTPRequestMethodKey), attributes.HTTPMethod)
	putStrIfNotEmpty(dest, string(semconv.HTTPRouteKey), attributes.HTTPRoute)
	if attributes.HTTPStatusCode != 0 {
		dest.PutInt(string(semconv.HTTPResponseStatusCodeKey), int64(attributes.HTTPStatusCode))
	}
	putStrIfNotEmpty(dest, string(semconv.URLPathKey), attributes.URLPath)
	putStrIfNotEmpty(dest, string(semconv.ClientAddressKey), attributes.ClientAddress)
	if attributes.ClientPort != 0 {
		dest.PutInt(string(semconv.ClientPortKey), int64(attributes.ClientPort))
	}
	putStrIfNotEmpty(dest, string(semconv.UserAgentOriginalKey), attributes.UserAgent)
}

// networkProtocolVersion drops the HTTP/ prefix, and the .0 of HTTP/2 and later.
func networkProtocolVersion(req *http.Request) string {
	if req.ProtoMajor >= 2 && req.ProtoMinor == 0 {
		return strconv.Itoa(req.ProtoMajor)
	}

	return strconv.Itoa(req.ProtoMajor) + "." + strconv.Itoa(req.ProtoMinor)
}

// splitHostPort returns addr unchanged with port 0 when it has no valid port.
func splitHostPort(addr string) (string, int) {
	host, portStr, err := net.SplitHostPort(addr)
	if err != nil {
		return addr, 0
	}

	port, err := strconv.Atoi(portStr)
	if err != nil {
		return addr, 0
	}

	return host, port
}

func putStrIfNotEmpty(attrs pcommon.Map, key, value string) {
	if value != "" {
		attrs.PutStr(key, value)
	}
}

func newBody(auditAttributes AuditAttributes, principalAttributes PrincipalAttributes, resourceAttributes ResourceAttributes, targetAttributes TargetAttributes, errorAttributes ErrorAttributes) string {
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

	// Resource: " kind (id)" or " kind".
	b.WriteString(" ")
	b.WriteString(resourceAttributes.Resource.Kind().String())
	if resourceAttributes.ResourceID != "" {
		b.WriteString(" (")
		b.WriteString(resourceAttributes.ResourceID)
		b.WriteString(")")
	}

	// Target (attach/detach context): " to target kind (id)" or " from target kind" for detach.
	if targetAttributes.TargetResource != nil {
		if auditAttributes.Action == coretypes.VerbDetach {
			b.WriteString(" from ")
		} else {
			b.WriteString(" to ")
		}
		b.WriteString(targetAttributes.TargetResource.Kind().String())
		if targetAttributes.TargetResourceID != "" {
			b.WriteString(" (")
			b.WriteString(targetAttributes.TargetResourceID)
			b.WriteString(")")
		}
	}

	// Error suffix (failure only): ": type" or omitted.
	if auditAttributes.Outcome == OutcomeFailure && errorAttributes.ErrorType != "" {
		b.WriteString(": ")
		b.WriteString(errorAttributes.ErrorType)
	}

	return b.String()
}
