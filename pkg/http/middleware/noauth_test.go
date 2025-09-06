package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNoAuth_Wrap(t *testing.T) {
	noAuth := NewNoAuth()

	// Create a test handler that checks for authentication context
	var capturedClaims authtypes.Claims
	var capturedAuthType ctxtypes.AuthType
	var authTypePresent bool

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var err error
		capturedClaims, err = authtypes.ClaimsFromContext(r.Context())
		require.NoError(t, err)

		capturedAuthType, authTypePresent = ctxtypes.AuthTypeFromContext(r.Context())
		w.WriteHeader(http.StatusOK)
	})

	// Wrap the test handler with NoAuth middleware
	wrappedHandler := noAuth.Wrap(testHandler)

	// Create a test request
	req := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()

	// Execute the request
	wrappedHandler.ServeHTTP(w, req)

	// Verify the response
	assert.Equal(t, http.StatusOK, w.Code)

	// Verify that authentication context was set correctly
	assert.Equal(t, "internal-user", capturedClaims.UserID)
	assert.Equal(t, types.RoleAdmin, capturedClaims.Role)
	assert.Equal(t, "internal@signoz.io", capturedClaims.Email)
	assert.Equal(t, "default-org", capturedClaims.OrgID)

	assert.True(t, authTypePresent)
	assert.Equal(t, ctxtypes.AuthTypeInternal, capturedAuthType)
}
