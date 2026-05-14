package audittypes

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/stretchr/testify/assert"
	oteltrace "go.opentelemetry.io/otel/trace"
)

var (
	testDashboardKind = coretypes.MustNewKind("dashboard")
)

func TestNewAuditEventFromHTTPRequest(t *testing.T) {
	traceID := oteltrace.TraceID{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16}
	spanID := oteltrace.SpanID{1, 2, 3, 4, 5, 6, 7, 8}

	testCases := []struct {
		name            string
		method          string
		path            string
		route           string
		statusCode      int
		action          coretypes.Verb
		category        ActionCategory
		claims          authtypes.Claims
		resourceID      string
		resourceKind    coretypes.Kind
		errorType       string
		errorCode       string
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
			category:        ActionCategoryConfigurationChange,
			claims:          authtypes.Claims{UserID: "019a1234-abcd-7000-8000-567800000001", Email: "alice@acme.com", OrgID: "019a-0000-0000-0001", IdentNProvider: authtypes.IdentNProviderTokenizer},
			resourceID:      "019b-5678-efgh-9012",
			resourceKind:    testDashboardKind,
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
			category:        ActionCategoryConfigurationChange,
			claims:          authtypes.Claims{UserID: "019aaaaa-bbbb-7000-8000-cccc00000002", Email: "viewer@acme.com", OrgID: "019a-0000-0000-0001", IdentNProvider: authtypes.IdentNProviderTokenizer},
			resourceID:      "019b-5678-efgh-9012",
			resourceKind:    testDashboardKind,
			errorType:       "forbidden",
			errorCode:       "authz_forbidden",
			expectedOutcome: OutcomeFailure,
			expectedBody:    "viewer@acme.com (019aaaaa-bbbb-7000-8000-cccc00000002) failed to update dashboard (019b-5678-efgh-9012): forbidden (authz_forbidden)",
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
				testCase.resourceID,
				testCase.resourceKind,
				testCase.errorType,
				testCase.errorCode,
			)

			assert.Equal(t, testCase.expectedOutcome, event.AuditAttributes.Outcome)
			assert.Equal(t, testCase.expectedBody, event.Body)
			assert.Equal(t, testCase.resourceKind, event.ResourceAttributes.ResourceKind)
			assert.Equal(t, testCase.resourceID, event.ResourceAttributes.ResourceID)
			assert.Equal(t, testCase.action, event.AuditAttributes.Action)
			assert.Equal(t, testCase.category, event.AuditAttributes.ActionCategory)
			assert.Equal(t, testCase.route, event.TransportAttributes.HTTPRoute)
			assert.Equal(t, testCase.statusCode, event.TransportAttributes.HTTPStatusCode)
			assert.Equal(t, testCase.method, event.TransportAttributes.HTTPMethod)
			assert.Equal(t, traceID, event.TraceID)
			assert.Equal(t, spanID, event.SpanID)
			assert.Equal(t, testCase.errorType, event.ErrorAttributes.ErrorType)
			assert.Equal(t, testCase.errorCode, event.ErrorAttributes.ErrorCode)
		})
	}
}

func newTestEvent(resourceKind coretypes.Kind, resourceID string, action coretypes.Verb) AuditEvent {
	return AuditEvent{
		Body:      resourceKind.String() + "." + action.PastTense(),
		EventName: NewEventName(resourceKind, action),
		AuditAttributes: AuditAttributes{
			Action:         action,
			ActionCategory: ActionCategoryConfigurationChange,
			Outcome:        OutcomeSuccess,
		},
		ResourceAttributes: ResourceAttributes{
			ResourceKind: resourceKind,
			ResourceID:   resourceID,
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
				newTestEvent(testDashboardKind, "d-001", coretypes.VerbCreate),
			},
			expectedResourceLogs:    1,
			expectedResourceKinds:   []string{"dashboard"},
			expectedResourceIDs:     []string{"d-001"},
			expectedLogRecordCounts: []int{1},
		},
		{
			name: "SameResource_MultipleEvents",
			events: []AuditEvent{
				newTestEvent(testDashboardKind, "d-001", coretypes.VerbCreate),
				newTestEvent(testDashboardKind, "d-001", coretypes.VerbUpdate),
				newTestEvent(testDashboardKind, "d-001", coretypes.VerbDelete),
			},
			expectedResourceLogs:    1,
			expectedResourceKinds:   []string{"dashboard"},
			expectedResourceIDs:     []string{"d-001"},
			expectedLogRecordCounts: []int{3},
		},
		{
			name: "DifferentResources_SeparateGroups",
			events: []AuditEvent{
				newTestEvent(testDashboardKind, "d-001", coretypes.VerbUpdate),
				newTestEvent(coretypes.MustNewKind("user"), "u-001", coretypes.VerbDelete),
			},
			expectedResourceLogs:    2,
			expectedResourceKinds:   []string{"dashboard", "user"},
			expectedResourceIDs:     []string{"d-001", "u-001"},
			expectedLogRecordCounts: []int{1, 1},
		},
		{
			name: "SameKind_DifferentIDs_SeparateGroups",
			events: []AuditEvent{
				newTestEvent(testDashboardKind, "d-001", coretypes.VerbUpdate),
				newTestEvent(testDashboardKind, "d-002", coretypes.VerbDelete),
			},
			expectedResourceLogs:    2,
			expectedResourceKinds:   []string{"dashboard", "dashboard"},
			expectedResourceIDs:     []string{"d-001", "d-002"},
			expectedLogRecordCounts: []int{1, 1},
		},
		{
			name: "InterleavedResources_GroupedCorrectly",
			events: []AuditEvent{
				newTestEvent(testDashboardKind, "d-001", coretypes.VerbCreate),
				newTestEvent(coretypes.MustNewKind("user"), "u-001", coretypes.VerbUpdate),
				newTestEvent(testDashboardKind, "d-001", coretypes.VerbUpdate),
				newTestEvent(coretypes.MustNewKind("user"), "u-001", coretypes.VerbDelete),
				newTestEvent(testDashboardKind, "d-001", coretypes.VerbDelete),
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

				// Verify service resource attributes
				serviceName, exists := resourceAttrs.Get("service.name")
				assert.True(t, exists)
				assert.Equal(t, "signoz", serviceName.Str())

				serviceVersion, exists := resourceAttrs.Get("service.version")
				assert.True(t, exists)
				assert.Equal(t, "0.90.0", serviceVersion.Str())

				// Verify audit resource attributes on Resource (not event attributes)
				kind, exists := resourceAttrs.Get("signoz.audit.resource.kind")
				assert.True(t, exists)
				assert.Equal(t, testCase.expectedResourceKinds[i], kind.Str())

				id, exists := resourceAttrs.Get("signoz.audit.resource.id")
				assert.True(t, exists)
				assert.Equal(t, testCase.expectedResourceIDs[i], id.Str())

				// Verify scope
				assert.Equal(t, 1, resourceLogs.ScopeLogs().Len())
				assert.Equal(t, "signoz.audit", resourceLogs.ScopeLogs().At(0).Scope().Name())

				// Verify log record count per group
				assert.Equal(t, testCase.expectedLogRecordCounts[i], resourceLogs.ScopeLogs().At(0).LogRecords().Len())

				// Verify resource attrs are NOT in log record event attributes
				for j := 0; j < resourceLogs.ScopeLogs().At(0).LogRecords().Len(); j++ {
					recordAttrs := resourceLogs.ScopeLogs().At(0).LogRecords().At(j).Attributes()
					_, hasKind := recordAttrs.Get("signoz.audit.resource.kind")
					_, hasID := recordAttrs.Get("signoz.audit.resource.id")
					assert.False(t, hasKind, "resource.kind must not be in log record attributes")
					assert.False(t, hasID, "resource.id must not be in log record attributes")
				}
			}
		})
	}
}
