package middleware

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/identn"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockIdentN is a test implementation of identn.IdentN.
type mockIdentN struct {
	provider authtypes.IdentNProvider
	err      error
}

func (m *mockIdentN) Test(r *http.Request) bool {
	return true
}

func (m *mockIdentN) GetIdentity(r *http.Request) (*authtypes.Identity, error) {
	if m.err != nil {
		return nil, m.err
	}
	return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "mock: GetIdentity not configured with an error")
}

func (m *mockIdentN) Name() authtypes.IdentNProvider {
	return m.provider
}

// mockIdentNResolver returns a fixed IdentN.
type mockIdentNResolver struct {
	idn identn.IdentN
}

func (m *mockIdentNResolver) GetIdentN(r *http.Request) identn.IdentN {
	return m.idn
}

// mockSharder is a no-op sharder.
type mockSharder struct{}

func (m *mockSharder) GetMyOwnedKeyRange(ctx context.Context) (uint32, uint32, error) {
	return 0, 0, nil
}

func (m *mockSharder) IsMyOwnedKey(ctx context.Context, key uint32) error {
	return nil
}

func TestIdentN_LogsFailedResolutionWithoutCredential(t *testing.T) {
	t.Parallel()

	// Create a test error shaped like the API key store error that leaks the credential
	credential := "super-secret-api-key-12345"
	testErr := errors.Newf(
		errors.TypeUnauthenticated,
		errors.MustNewCode("api_key_not_found"),
		"api key with key: %s doesn't exist.",
		credential,
	)

	mockIDN := &mockIdentN{
		provider: authtypes.IdentNProviderAPIKey,
		err:      testErr,
	}

	// Capture logs in JSON format
	var logBuf bytes.Buffer
	jsonHandler := slog.NewJSONHandler(&logBuf, &slog.HandlerOptions{Level: slog.LevelWarn})
	logger := slog.New(jsonHandler)

	middleware := &IdentN{
		resolver: &mockIdentNResolver{idn: mockIDN},
		sharder:  &mockSharder{},
		logger:   logger,
	}

	// Create a test request and handler
	req := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()

	nextCalled := false
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusOK)
	})

	wrapped := middleware.Wrap(nextHandler)
	wrapped.ServeHTTP(w, req)

	// Verify the next handler was called (failed auth should not block)
	assert.True(t, nextCalled, "next handler should be called on failed identity resolution")

	// Parse the log output
	logOutput := logBuf.String()
	assert.NotEmpty(t, logOutput, "log should not be empty")

	var logRecord map[string]interface{}
	err := json.Unmarshal([]byte(logOutput), &logRecord)
	require.NoError(t, err, "log output should be valid JSON")

	// Verify the log contains the expected fields
	assert.Equal(t, "failed to resolve identity", logRecord["msg"])
	assert.Equal(t, "api_key", logRecord["identn_provider"], "should log provider name")
	assert.Equal(t, "api_key_not_found", logRecord["identn_error_code"], "should log error code")

	// Verify the log does NOT contain the credential
	logStr := logBuf.String()
	assert.NotContains(t, logStr, credential, "log must not contain the API key credential")
	assert.NotContains(t, logStr, "api key with key:", "log must not contain the formatted error message")
}

func TestIdentN_TokenError_NoCredentialLeakage(t *testing.T) {
	t.Parallel()

	// Create a test error shaped like the tokenizer store error
	// The tokenizer store passes a token to a format string with no verb,
	// so fmt appends it as %!(EXTRA string=...)
	credential := "opaque-access-token-xyz789"
	testErr := errors.Newf(
		errors.TypeUnauthenticated,
		errors.MustNewCode("token_not_found"),
		"token does not exist %s",
		credential, // The message contains the token
	)

	mockIDN := &mockIdentN{
		provider: authtypes.IdentNProviderTokenizer,
		err:      testErr,
	}

	// Capture logs in JSON format
	var logBuf bytes.Buffer
	jsonHandler := slog.NewJSONHandler(&logBuf, &slog.HandlerOptions{Level: slog.LevelWarn})
	logger := slog.New(jsonHandler)

	middleware := &IdentN{
		resolver: &mockIdentNResolver{idn: mockIDN},
		sharder:  &mockSharder{},
		logger:   logger,
	}

	req := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()

	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	wrapped := middleware.Wrap(nextHandler)
	wrapped.ServeHTTP(w, req)

	// Verify the log does NOT contain the credential
	logStr := logBuf.String()
	assert.NotContains(t, logStr, credential, "log must not contain the token credential")
	assert.NotContains(t, logStr, "%!(EXTRA", "log must not contain fmt's extra argument notation")

	// Verify the log contains the expected fields
	var logRecord map[string]interface{}
	err := json.Unmarshal([]byte(logStr), &logRecord)
	require.NoError(t, err)

	assert.Equal(t, "failed to resolve identity", logRecord["msg"])
	assert.Equal(t, "tokenizer", logRecord["identn_provider"])
	assert.Equal(t, "token_not_found", logRecord["identn_error_code"])
}
