package audittypes

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/stretchr/testify/assert"
	oteltrace "go.opentelemetry.io/otel/trace"
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
		action          Action
		category        ActionCategory
		claims          authtypes.Claims
		resourceID      string
		resourceName    string
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
			action:          ActionCreate,
			category:        ActionCategoryConfigurationChange,
			claims:          authtypes.Claims{UserID: "019a1234-abcd-7000-8000-567800000001", Email: "alice@acme.com", OrgID: "019a-0000-0000-0001", IdentNProvider: authtypes.IdentNProviderTokenizer},
			resourceID:      "019b-5678-efgh-9012",
			resourceName:    "dashboard",
			expectedOutcome: OutcomeSuccess,
			expectedBody:    "alice@acme.com (019a1234-abcd-7000-8000-567800000001) created dashboard (019b-5678-efgh-9012)",
		},
		{
			name:            "Failure_ForbiddenDashboardUpdate",
			method:          http.MethodPut,
			path:            "/api/v1/dashboards/019b-5678-efgh-9012",
			route:           "/api/v1/dashboards/{id}",
			statusCode:      http.StatusForbidden,
			action:          ActionUpdate,
			category:        ActionCategoryConfigurationChange,
			claims:          authtypes.Claims{UserID: "019aaaaa-bbbb-7000-8000-cccc00000002", Email: "viewer@acme.com", OrgID: "019a-0000-0000-0001", IdentNProvider: authtypes.IdentNProviderTokenizer},
			resourceID:      "019b-5678-efgh-9012",
			resourceName:    "dashboard",
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
				testCase.resourceName,
				testCase.errorType,
				testCase.errorCode,
			)

			assert.Equal(t, testCase.expectedOutcome, event.AuditAttributes.Outcome)
			assert.Equal(t, testCase.expectedBody, event.Body)
			assert.Equal(t, testCase.resourceName, event.ResourceAttributes.ResourceName)
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
