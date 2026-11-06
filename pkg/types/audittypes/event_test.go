package audittypes

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/collector/pdata/plog"
	oteltrace "go.opentelemetry.io/otel/trace"
)

var (
	testDashboardResource = coretypes.ResourceMetaResourceDashboard
)

func TestNewAuditEvent(t *testing.T) {
	traceID := oteltrace.TraceID{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16}
	spanID := oteltrace.SpanID{1, 2, 3, 4, 5, 6, 7, 8}

	testCases := []struct {
		name            string
		method          string
		path            string
		route           string
		statusCode      int
		action          coretypes.Verb
		category        coretypes.ActionCategory
		claims          authtypes.Claims
		resource        coretypes.Resource
		resourceID      string
		errorType       string
		expectedOutcome Outcome
		expectedBody    string
	}{
		{
			name:            "Success_DashboardCreated",
			method:          http.MethodPost,
			path:            "/api/v1/dashboards",
			route:           "/api/v1/dashboards",
			statusCode:      http.StatusOK,
			action:          coretypes.VerbCreate,
			category:        coretypes.ActionCategoryConfigurationChange,
			claims:          authtypes.Claims{UserID: "019a1234-abcd-7000-8000-567800000001", Email: "alice@acme.com", OrgID: "019a-0000-0000-0001", IdentNProvider: authtypes.IdentNProviderTokenizer},
			resource:        testDashboardResource,
			resourceID:      "019b-5678-efgh-9012",
			expectedOutcome: OutcomeSuccess,
			expectedBody:    "alice@acme.com (019a1234-abcd-7000-8000-567800000001) created dashboard (019b-5678-efgh-9012)",
		},
		{
			name:            "Failure_ForbiddenDashboardUpdate",
			method:          http.MethodPut,
			path:            "/api/v1/dashboards/019b-5678-efgh-9012",
			route:           "/api/v1/dashboards/{id}",
			statusCode:      http.StatusForbidden,
			action:          coretypes.VerbUpdate,
			category:        coretypes.ActionCategoryConfigurationChange,
			claims:          authtypes.Claims{UserID: "019aaaaa-bbbb-7000-8000-cccc00000002", Email: "viewer@acme.com", OrgID: "019a-0000-0000-0001", IdentNProvider: authtypes.IdentNProviderTokenizer},
			resource:        testDashboardResource,
			resourceID:      "019b-5678-efgh-9012",
			errorType:       "forbidden",
			expectedOutcome: OutcomeFailure,
			expectedBody:    "viewer@acme.com (019aaaaa-bbbb-7000-8000-cccc00000002) failed to update dashboard (019b-5678-efgh-9012): forbidden",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			req := httptest.NewRequest(testCase.method, testCase.path, nil)

			event := NewAuditEventFromHTTPRequest(
				req,
				testCase.route,
				testCase.statusCode,
				traceID,
				spanID,
				testCase.action,
				testCase.category,
				testCase.claims,
				NewResourceAttributes(testCase.resource, testCase.resourceID),
				TargetAttributes{},
				testCase.errorType,
			)

			assert.Equal(t, testCase.expectedOutcome, event.AuditAttributes.Outcome)
			assert.Equal(t, testCase.expectedBody, event.Body)
			assert.Equal(t, testCase.resource.Kind(), event.ResourceAttributes.Resource.Kind())
			assert.Equal(t, testCase.resourceID, event.ResourceAttributes.ResourceID)
			assert.Equal(t, testCase.action, event.AuditAttributes.Action)
			assert.Equal(t, testCase.category, event.AuditAttributes.ActionCategory)
			assert.Equal(t, testCase.route, event.TransportAttributes.HTTPRoute)
			assert.Equal(t, testCase.statusCode, event.TransportAttributes.HTTPStatusCode)
			assert.Equal(t, testCase.method, event.TransportAttributes.HTTPMethod)
			assert.Equal(t, traceID, event.TraceID)
			assert.Equal(t, spanID, event.SpanID)
			assert.Equal(t, testCase.errorType, event.ErrorAttributes.ErrorType)
		})
	}
}

func newTestEvent(resource coretypes.Resource, resourceID string, action coretypes.Verb) AuditEvent {
	return AuditEvent{
		Body:      resource.Kind().String() + "." + action.PastTense(),
		EventName: NewEventName(action),
		AuditAttributes: AuditAttributes{
			Action:         action,
			ActionCategory: coretypes.ActionCategoryConfigurationChange,
			Outcome:        OutcomeSuccess,
		},
		ResourceAttributes: ResourceAttributes{
			Resource:   resource,
			ResourceID: resourceID,
		},
	}
}

func TestNewPLogsFromAuditEvents(t *testing.T) {
	testCases := []struct {
		name                    string
		events                  []AuditEvent
		expectedResourceLogs    int
		expectedResourceKinds   []string
		expectedResourceIDs     []string
		expectedLogRecordCounts []int
	}{
		{
			name:                 "Empty",
			events:               []AuditEvent{},
			expectedResourceLogs: 0,
		},
		{
			name: "SingleEvent",
			events: []AuditEvent{
				newTestEvent(testDashboardResource, "d-001", coretypes.VerbCreate),
			},
			expectedResourceLogs:    1,
			expectedResourceKinds:   []string{"dashboard"},
			expectedResourceIDs:     []string{"d-001"},
			expectedLogRecordCounts: []int{1},
		},
		{
			name: "SameResource_MultipleEvents",
			events: []AuditEvent{
				newTestEvent(testDashboardResource, "d-001", coretypes.VerbCreate),
				newTestEvent(testDashboardResource, "d-001", coretypes.VerbUpdate),
				newTestEvent(testDashboardResource, "d-001", coretypes.VerbDelete),
			},
			expectedResourceLogs:    1,
			expectedResourceKinds:   []string{"dashboard"},
			expectedResourceIDs:     []string{"d-001"},
			expectedLogRecordCounts: []int{3},
		},
		{
			name: "DifferentResources_SeparateGroups",
			events: []AuditEvent{
				newTestEvent(testDashboardResource, "d-001", coretypes.VerbUpdate),
				newTestEvent(coretypes.ResourceUser, "u-001", coretypes.VerbDelete),
			},
			expectedResourceLogs:    2,
			expectedResourceKinds:   []string{"dashboard", "user"},
			expectedResourceIDs:     []string{"d-001", "u-001"},
			expectedLogRecordCounts: []int{1, 1},
		},
		{
			name: "SameKind_DifferentIDs_SeparateGroups",
			events: []AuditEvent{
				newTestEvent(testDashboardResource, "d-001", coretypes.VerbUpdate),
				newTestEvent(testDashboardResource, "d-002", coretypes.VerbDelete),
			},
			expectedResourceLogs:    2,
			expectedResourceKinds:   []string{"dashboard", "dashboard"},
			expectedResourceIDs:     []string{"d-001", "d-002"},
			expectedLogRecordCounts: []int{1, 1},
		},
		{
			name: "InterleavedResources_GroupedCorrectly",
			events: []AuditEvent{
				newTestEvent(testDashboardResource, "d-001", coretypes.VerbCreate),
				newTestEvent(coretypes.ResourceUser, "u-001", coretypes.VerbUpdate),
				newTestEvent(testDashboardResource, "d-001", coretypes.VerbUpdate),
				newTestEvent(coretypes.ResourceUser, "u-001", coretypes.VerbDelete),
				newTestEvent(testDashboardResource, "d-001", coretypes.VerbDelete),
			},
			expectedResourceLogs:    2,
			expectedResourceKinds:   []string{"dashboard", "user"},
			expectedResourceIDs:     []string{"d-001", "u-001"},
			expectedLogRecordCounts: []int{3, 2},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			logs := NewPLogsFromAuditEvents(testCase.events, "signoz", "0.90.0", "signoz.audit")

			assert.Equal(t, testCase.expectedResourceLogs, logs.ResourceLogs().Len())

			for i := 0; i < logs.ResourceLogs().Len(); i++ {
				resourceLogs := logs.ResourceLogs().At(i)
				resourceAttrs := resourceLogs.Resource().Attributes()

				serviceName, exists := resourceAttrs.Get("service.name")
				assert.True(t, exists)
				assert.Equal(t, "signoz", serviceName.Str())

				serviceVersion, exists := resourceAttrs.Get("service.version")
				assert.True(t, exists)
				assert.Equal(t, "0.90.0", serviceVersion.Str())

				kind, exists := resourceAttrs.Get("signoz.resource.kind")
				assert.True(t, exists)
				assert.Equal(t, testCase.expectedResourceKinds[i], kind.Str())

				id, exists := resourceAttrs.Get("signoz.resource.id")
				assert.True(t, exists)
				assert.Equal(t, testCase.expectedResourceIDs[i], id.Str())

				assert.Equal(t, 1, resourceLogs.ScopeLogs().Len())
				assert.Equal(t, "signoz.audit", resourceLogs.ScopeLogs().At(0).Scope().Name())

				assert.Equal(t, testCase.expectedLogRecordCounts[i], resourceLogs.ScopeLogs().At(0).LogRecords().Len())

				for j := 0; j < resourceLogs.ScopeLogs().At(0).LogRecords().Len(); j++ {
					recordAttrs := resourceLogs.ScopeLogs().At(0).LogRecords().At(j).Attributes()
					_, hasKind := recordAttrs.Get("signoz.resource.kind")
					_, hasID := recordAttrs.Get("signoz.resource.id")
					assert.False(t, hasKind, "resource.kind must not be in log record attributes")
					assert.False(t, hasID, "resource.id must not be in log record attributes")
				}
			}
		})
	}
}

func TestNewEventName(t *testing.T) {
	testCases := []struct {
		name            string
		action          coretypes.Verb
		expected        string
		expectedAudited bool
	}{
		{name: "Create", action: coretypes.VerbCreate, expected: "signoz.audit.create", expectedAudited: true},
		{name: "Detach", action: coretypes.VerbDetach, expected: "signoz.audit.detach", expectedAudited: true},
		{name: "Read_NotAudited", action: coretypes.VerbRead, expected: "", expectedAudited: false},
		{name: "List_NotAudited", action: coretypes.VerbList, expected: "", expectedAudited: false},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.expected, NewEventName(testCase.action).String())
			assert.Equal(t, testCase.expectedAudited, IsAudited(testCase.action))
		})
	}
}

func TestAuditEventToLogRecord(t *testing.T) {
	testCases := []struct {
		name               string
		claims             authtypes.Claims
		resourceAttributes ResourceAttributes
		targetAttributes   TargetAttributes
		statusCode         int
		errorType          string
		remoteAddr         string
		proto              string
		protoMajor         int
		protoMinor         int
		expectedAttributes map[string]any
		absentAttributes   []string
	}{
		{
			name:               "Success_User_HTTP11",
			claims:             authtypes.Claims{UserID: "019a1234-abcd-7000-8000-567800000001", Principal: authtypes.PrincipalUser, Email: "alice@acme.com", OrgID: "019a1234-abcd-7000-8000-567800000002"},
			resourceAttributes: NewResourceAttributes(testDashboardResource, "d-001"),
			statusCode:         http.StatusOK,
			remoteAddr:         "10.0.0.1:52341",
			proto:              "HTTP/1.1",
			protoMajor:         1,
			protoMinor:         1,
			expectedAttributes: map[string]any{
				"signoz.audit.verb":            "create",
				"signoz.audit.action_category": "configuration_changes",
				"signoz.audit.outcome":         "success",
				"signoz.principal.id":          "019a1234-abcd-7000-8000-567800000001",
				"signoz.principal.type":        "user",
				"signoz.principal.email":       "alice@acme.com",
				"signoz.organization.id":       "019a1234-abcd-7000-8000-567800000002",
				"network.protocol.version":     "1.1",
				"client.address":               "10.0.0.1",
				"client.port":                  int64(52341),
				"url.path":                     "/api/v1/resource",
			},
			absentAttributes: []string{"exception.type", "signoz.workspace.key.id", "signoz.resource.target.kind", "signoz.audit.identn_provider"},
		},
		{
			name:               "ServiceAccount_HTTP2",
			claims:             authtypes.Claims{UserID: "00000000-0000-0000-0000-000000000000", ServiceAccountID: "019a1234-abcd-7000-8000-567800000003", Principal: authtypes.PrincipalServiceAccount, OrgID: "019a1234-abcd-7000-8000-567800000002"},
			resourceAttributes: NewResourceAttributes(testDashboardResource, "d-002"),
			statusCode:         http.StatusOK,
			remoteAddr:         "10.0.0.3:443",
			proto:              "HTTP/2.0",
			protoMajor:         2,
			protoMinor:         0,
			expectedAttributes: map[string]any{
				"signoz.principal.id":      "019a1234-abcd-7000-8000-567800000003",
				"signoz.principal.type":    "service_account",
				"network.protocol.version": "2",
			},
			absentAttributes: []string{"signoz.principal.email"},
		},
		{
			name:               "Failure_Anonymous_IngestionKey_AddressWithoutPort",
			claims:             authtypes.Claims{OrgID: "019a1234-abcd-7000-8000-567800000002"},
			resourceAttributes: NewResourceAttributes(coretypes.ResourceMetaResourceIngestionKey, "key-001"),
			statusCode:         http.StatusForbidden,
			errorType:          "forbidden",
			remoteAddr:         "10.0.0.2",
			proto:              "HTTP/1.1",
			protoMajor:         1,
			protoMinor:         1,
			expectedAttributes: map[string]any{
				"signoz.audit.outcome":    "failure",
				"exception.type":          "forbidden",
				"signoz.workspace.key.id": "key-001",
				"client.address":          "10.0.0.2",
			},
			absentAttributes: []string{"client.port", "signoz.principal.id", "signoz.principal.type", "signoz.principal.email"},
		},
		{
			name:               "Attach_IngestionLimitToKey",
			claims:             authtypes.Claims{UserID: "019a1234-abcd-7000-8000-567800000001", Principal: authtypes.PrincipalUser, OrgID: "019a1234-abcd-7000-8000-567800000002"},
			resourceAttributes: NewResourceAttributes(coretypes.ResourceMetaResourceIngestionLimit, "limit-001"),
			targetAttributes:   NewTargetAttributes(coretypes.ResourceMetaResourceIngestionKey, "key-002"),
			statusCode:         http.StatusOK,
			remoteAddr:         "10.0.0.4:1234",
			proto:              "HTTP/1.1",
			protoMajor:         1,
			protoMinor:         1,
			expectedAttributes: map[string]any{
				"signoz.resource.target.kind": "ingestion-key",
				"signoz.resource.target.id":   "key-002",
				"signoz.workspace.key.id":     "key-002",
			},
			absentAttributes: []string{"signoz.resource.kind", "signoz.resource.id"},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/v1/resource", nil)
			req.RemoteAddr = testCase.remoteAddr
			req.Proto, req.ProtoMajor, req.ProtoMinor = testCase.proto, testCase.protoMajor, testCase.protoMinor

			event := NewAuditEventFromHTTPRequest(req, "/api/v1/resource", testCase.statusCode, oteltrace.TraceID{}, oteltrace.SpanID{}, coretypes.VerbCreate, coretypes.ActionCategoryConfigurationChange, testCase.claims, testCase.resourceAttributes, testCase.targetAttributes, testCase.errorType)

			record := plog.NewLogRecord()
			event.ToLogRecord(record)
			attrs := record.Attributes().AsRaw()

			for key, value := range testCase.expectedAttributes {
				assert.Equal(t, value, attrs[key], key)
			}

			for _, key := range testCase.absentAttributes {
				assert.NotContains(t, attrs, key)
			}
		})
	}
}

func TestNewPLogsFromAuditEvents_TargetPerRecord(t *testing.T) {
	first := NewAuditEventFromHTTPRequest(httptest.NewRequest(http.MethodPost, "/", nil), "/", http.StatusOK, oteltrace.TraceID{}, oteltrace.SpanID{}, coretypes.VerbAttach, coretypes.ActionCategoryConfigurationChange, authtypes.Claims{}, NewResourceAttributes(testDashboardResource, "d-001"), NewTargetAttributes(coretypes.ResourceMetaResourceRule, "r-001"), "")
	second := NewAuditEventFromHTTPRequest(httptest.NewRequest(http.MethodPost, "/", nil), "/", http.StatusOK, oteltrace.TraceID{}, oteltrace.SpanID{}, coretypes.VerbAttach, coretypes.ActionCategoryConfigurationChange, authtypes.Claims{}, NewResourceAttributes(testDashboardResource, "d-001"), NewTargetAttributes(coretypes.ResourceMetaResourceRule, "r-002"), "")

	logs := NewPLogsFromAuditEvents([]AuditEvent{first, second}, "signoz", "0.90.0", "signoz.audit")
	require.Equal(t, 1, logs.ResourceLogs().Len())

	resourceLogs := logs.ResourceLogs().At(0)
	assert.NotContains(t, resourceLogs.Resource().Attributes().AsRaw(), "signoz.resource.target.id")

	records := resourceLogs.ScopeLogs().At(0).LogRecords()
	require.Equal(t, 2, records.Len())

	targetIDs := []any{}
	for i := 0; i < records.Len(); i++ {
		targetIDs = append(targetIDs, records.At(i).Attributes().AsRaw()["signoz.resource.target.id"])
	}

	assert.Equal(t, []any{"r-001", "r-002"}, targetIDs)
}
