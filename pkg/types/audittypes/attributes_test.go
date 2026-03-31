package audittypes

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/stretchr/testify/assert"
)

func TestNewAuditEventAuditAttributesFromHTTP_OutcomeBoundary(t *testing.T) {
	claims := authtypes.Claims{IdentNProvider: "tokenizer"}

	testCases := []struct {
		name        string
		statusCode  int
		wantOutcome Outcome
	}{
		{
			name:        "200_Success",
			statusCode:  200,
			wantOutcome: OutcomeSuccess,
		},
		{
			name:        "399_Success",
			statusCode:  399,
			wantOutcome: OutcomeSuccess,
		},
		{
			name:        "400_Failure",
			statusCode:  400,
			wantOutcome: OutcomeFailure,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			attrs := NewAuditEventAuditAttributesFromHTTP(testCase.statusCode, ActionUpdate, ActionCategoryConfigurationChange, claims)
			assert.Equal(t, testCase.wantOutcome, attrs.Outcome)
		})
	}
}

func TestNewAuditEventPrincipalAttributesFromClaims_PrincipalType(t *testing.T) {
	testCases := []struct {
		name              string
		identNProvider    string
		wantPrincipalType PrincipalType
	}{
		{
			name:              "Tokenizer_User",
			identNProvider:    "tokenizer",
			wantPrincipalType: PrincipalTypeUser,
		},
		{
			name:              "APIKey_ServiceAccount",
			identNProvider:    "api_key",
			wantPrincipalType: PrincipalTypeServiceAccount,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			claims := authtypes.Claims{
				UserID:         "019a1234-abcd-7000-8000-567800000001",
				Email:          "test@acme.com",
				OrgID:          "019a-0000-0000-0001",
				IdentNProvider: testCase.identNProvider,
			}

			attrs := NewAuditEventPrincipalAttributesFromClaims(claims)
			assert.Equal(t, testCase.wantPrincipalType, attrs.PrincipalType)
		})
	}
}
