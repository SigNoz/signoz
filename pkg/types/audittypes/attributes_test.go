package audittypes

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
)

func TestNewAuditAttributesFromHTTP_OutcomeBoundary(t *testing.T) {
	claims := authtypes.Claims{IdentNProvider: authtypes.IdentNProviderTokenizer}

	testCases := []struct {
		name            string
		statusCode      int
		expectedOutcome Outcome
	}{
		{
			name:            "200_Success",
			statusCode:      200,
			expectedOutcome: OutcomeSuccess,
		},
		{
			name:            "399_Success",
			statusCode:      399,
			expectedOutcome: OutcomeSuccess,
		},
		{
			name:            "400_Failure",
			statusCode:      400,
			expectedOutcome: OutcomeFailure,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			attrs := NewAuditAttributesFromHTTP(testCase.statusCode, ActionUpdate, ActionCategoryConfigurationChange, claims)
			assert.Equal(t, testCase.expectedOutcome, attrs.Outcome)
		})
	}
}

func TestNewBody(t *testing.T) {
	testCases := []struct {
		name                string
		auditAttributes     AuditAttributes
		principalAttributes PrincipalAttributes
		resourceAttributes  ResourceAttributes
		errorAttributes     ErrorAttributes
		expectedBody        string
	}{
		{
			name: "Success_EmptyResourceID",
			auditAttributes: AuditAttributes{
				Action:         ActionDelete,
				ActionCategory: ActionCategoryConfigurationChange,
				Outcome:        OutcomeSuccess,
			},
			principalAttributes: PrincipalAttributes{
				PrincipalID:    valuer.MustNewUUID("019a1234-abcd-7000-8000-567800000001"),
				PrincipalEmail: valuer.MustNewEmail("test@acme.com"),
			},
			resourceAttributes: ResourceAttributes{
				ResourceID:   "",
				ResourceName: "dashboard",
			},
			errorAttributes: ErrorAttributes{},
			expectedBody:    "test@acme.com (019a1234-abcd-7000-8000-567800000001) deleted dashboard",
		},
		{
			name: "Success_EmptyPrincipalEmail",
			auditAttributes: AuditAttributes{
				Action:         ActionDelete,
				ActionCategory: ActionCategoryConfigurationChange,
				Outcome:        OutcomeSuccess,
			},
			principalAttributes: PrincipalAttributes{
				PrincipalID:    valuer.MustNewUUID("019a1234-abcd-7000-8000-567800000001"),
				PrincipalEmail: valuer.Email{},
			},
			resourceAttributes: ResourceAttributes{
				ResourceID:   "abd",
				ResourceName: "dashboard",
			},
			errorAttributes: ErrorAttributes{},
			expectedBody:    "019a1234-abcd-7000-8000-567800000001 deleted dashboard (abd)",
		},
		{
			name: "Success_EmptyPrincipalIDandEmail",
			auditAttributes: AuditAttributes{
				Action:         ActionDelete,
				ActionCategory: ActionCategoryConfigurationChange,
				Outcome:        OutcomeSuccess,
			},
			principalAttributes: PrincipalAttributes{
				PrincipalID:    valuer.UUID{},
				PrincipalEmail: valuer.Email{},
			},
			resourceAttributes: ResourceAttributes{
				ResourceID:   "abd",
				ResourceName: "dashboard",
			},
			errorAttributes: ErrorAttributes{},
			expectedBody:    "deleted dashboard (abd)",
		},
		{
			name: "Success_AllPresent",
			auditAttributes: AuditAttributes{
				Action:         ActionCreate,
				ActionCategory: ActionCategoryConfigurationChange,
				Outcome:        OutcomeSuccess,
			},
			principalAttributes: PrincipalAttributes{
				PrincipalID:    valuer.MustNewUUID("019a1234-abcd-7000-8000-567800000001"),
				PrincipalEmail: valuer.MustNewEmail("alice@acme.com"),
			},
			resourceAttributes: ResourceAttributes{
				ResourceID:   "019b-5678",
				ResourceName: "dashboard",
			},
			errorAttributes: ErrorAttributes{},
			expectedBody:    "alice@acme.com (019a1234-abcd-7000-8000-567800000001) created dashboard (019b-5678)",
		},
		{
			name: "Success_EmptyEverythingOptional",
			auditAttributes: AuditAttributes{
				Action:         ActionUpdate,
				ActionCategory: ActionCategoryConfigurationChange,
				Outcome:        OutcomeSuccess,
			},
			principalAttributes: PrincipalAttributes{},
			resourceAttributes: ResourceAttributes{
				ResourceName: "alert-rule",
			},
			errorAttributes: ErrorAttributes{},
			expectedBody:    "updated alert-rule",
		},
		{
			name: "Failure_AllPresent",
			auditAttributes: AuditAttributes{
				Action:         ActionUpdate,
				ActionCategory: ActionCategoryConfigurationChange,
				Outcome:        OutcomeFailure,
			},
			principalAttributes: PrincipalAttributes{
				PrincipalID:    valuer.MustNewUUID("019aaaaa-bbbb-7000-8000-cccc00000002"),
				PrincipalEmail: valuer.MustNewEmail("viewer@acme.com"),
			},
			resourceAttributes: ResourceAttributes{
				ResourceID:   "019b-5678",
				ResourceName: "dashboard",
			},
			errorAttributes: ErrorAttributes{
				ErrorType: "forbidden",
				ErrorCode: "authz_forbidden",
			},
			expectedBody: "viewer@acme.com (019aaaaa-bbbb-7000-8000-cccc00000002) failed to update dashboard (019b-5678): forbidden (authz_forbidden)",
		},
		{
			name: "Failure_ErrorTypeOnly",
			auditAttributes: AuditAttributes{
				Action:  ActionDelete,
				Outcome: OutcomeFailure,
			},
			principalAttributes: PrincipalAttributes{
				PrincipalID:    valuer.MustNewUUID("019a1234-abcd-7000-8000-567800000001"),
				PrincipalEmail: valuer.MustNewEmail("test@acme.com"),
			},
			resourceAttributes: ResourceAttributes{
				ResourceName: "user",
			},
			errorAttributes: ErrorAttributes{
				ErrorType: "not-found",
			},
			expectedBody: "test@acme.com (019a1234-abcd-7000-8000-567800000001) failed to delete user: not-found",
		},
		{
			name: "Failure_NoErrorDetails",
			auditAttributes: AuditAttributes{
				Action:  ActionCreate,
				Outcome: OutcomeFailure,
			},
			principalAttributes: PrincipalAttributes{
				PrincipalID:    valuer.MustNewUUID("019a1234-abcd-7000-8000-567800000001"),
				PrincipalEmail: valuer.MustNewEmail("test@acme.com"),
			},
			resourceAttributes: ResourceAttributes{
				ResourceID:   "019b-5678",
				ResourceName: "dashboard",
			},
			errorAttributes: ErrorAttributes{},
			expectedBody:    "test@acme.com (019a1234-abcd-7000-8000-567800000001) failed to create dashboard (019b-5678)",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			body := newBody(testCase.auditAttributes, testCase.principalAttributes, testCase.resourceAttributes, testCase.errorAttributes)
			assert.Equal(t, testCase.expectedBody, body)
		})
	}
}
