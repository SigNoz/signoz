package querier

import (
	"bytes"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const substituteVarsBody = `{
	"schemaVersion": "v1",
	"start": 1000,
	"end": 2000,
	"requestType": "scalar",
	"compositeQuery": {
		"queries": [
			{
				"type": "builder_query",
				"spec": {
					"name": "A",
					"signal": "logs",
					"filter": {"expression": "service.name = $service"}
				}
			}
		]
	},
	"variables": {
		"service": {"type": "text", "value": "frontend"}
	}
}`

// newDeprecationTestHandler returns a handler whose logs land in the buffer.
func newDeprecationTestHandler(t *testing.T) (Handler, *bytes.Buffer) {
	t.Helper()

	logs := new(bytes.Buffer)
	settings := instrumentationtest.New().ToProviderSettings()
	settings.Logger = slog.New(slog.NewJSONHandler(logs, &slog.HandlerOptions{Level: slog.LevelInfo}))

	// ReplaceVariables reads neither the querier nor analytics.
	return NewHandler(settings, nil, nil), logs
}

func TestReplaceVariablesSignalsDeprecation(t *testing.T) {
	handler, logs := newDeprecationTestHandler(t)

	req := httptest.NewRequest(http.MethodPost, substituteVarsPath, strings.NewReader(substituteVarsBody))
	rw := httptest.NewRecorder()

	handler.ReplaceVariables(rw, req)

	require.Equal(t, http.StatusOK, rw.Code, "body: %s", rw.Body.String())
	assert.Equal(t, "true", rw.Header().Get("Deprecation"), "RFC 8594 deprecation header")

	// Still does its job: the variable is gone, so behaviour is unchanged.
	assert.NotContains(t, rw.Body.String(), "$service")

	assert.Contains(t, logs.String(), "deprecated endpoint called")
	assert.Contains(t, logs.String(), substituteVarsPath)
}

// A caller sending only bad payloads still has to learn the endpoint is going away.
func TestReplaceVariablesSignalsDeprecationOnError(t *testing.T) {
	handler, _ := newDeprecationTestHandler(t)

	req := httptest.NewRequest(http.MethodPost, substituteVarsPath, strings.NewReader(`{"start":`))
	rw := httptest.NewRecorder()

	handler.ReplaceVariables(rw, req)

	require.NotEqual(t, http.StatusOK, rw.Code)
	assert.Equal(t, "true", rw.Header().Get("Deprecation"))
}
