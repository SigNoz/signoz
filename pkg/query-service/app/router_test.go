package app

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/global"
	"github.com/SigNoz/signoz/pkg/http/middleware"
	"github.com/SigNoz/signoz/pkg/web"
	"github.com/SigNoz/signoz/pkg/web/routerweb"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLegacyRoutesWithWebFallback(t *testing.T) {
	t.Parallel()

	settings := factorytest.NewSettings()
	router := NewRouter()
	router.Use(middleware.NewRecovery(settings.Logger).Wrap)
	router.Use(middleware.NewResource(settings.Logger).Wrap)
	router.Use(middleware.NewAudit(settings.Logger, nil, nil).Wrap)
	authz := middleware.NewAuthZ(settings.Logger, nil, nil)
	api := &APIHandler{}
	api.RegisterQueryRangeV4Routes(router, authz)
	api.RegisterLogsRoutes(router, authz)
	api.RegisterMessagingQueuesRoutes(router, authz)

	directory := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(directory, "index.html"), []byte("<html>SigNoz</html>"), 0o600))
	web, err := routerweb.New(context.Background(), settings, web.Config{
		Index: "index.html", Directory: directory,
	}, global.Config{})
	require.NoError(t, err)
	require.NoError(t, web.AddToRouter(router))

	for _, testCase := range []struct {
		method string
		path   string
		status int
		allow  string
	}{
		{http.MethodPost, "/api/v4/query_range", http.StatusUnauthorized, ""},
		{http.MethodGet, "/api/v4/query_range", http.StatusMethodNotAllowed, "POST"},
		{http.MethodGet, "/api/v4/missing", http.StatusNotFound, ""},
		{http.MethodGet, "/api/v1/logs", http.StatusUnauthorized, ""},
		{http.MethodPost, "/api/v1/logs", http.StatusMethodNotAllowed, "GET"},
		{http.MethodGet, "/api/v1/logs/fields", http.StatusUnauthorized, ""},
		{http.MethodPut, "/api/v1/logs/fields", http.StatusMethodNotAllowed, "GET, POST"},
		{http.MethodGet, "/api/v1/logs/missing", http.StatusNotFound, ""},
		{http.MethodGet, "/api/v1/messaging-queues/kafka/missing", http.StatusNotFound, ""},
	} {
		t.Run(testCase.method+testCase.path, func(t *testing.T) {
			response := httptest.NewRecorder()
			router.ServeHTTP(response, httptest.NewRequest(testCase.method, testCase.path, nil))
			assert.Equal(t, testCase.status, response.Code)
			assert.Equal(t, "application/json", response.Header().Get("Content-Type"))
			assert.Equal(t, testCase.allow, response.Header().Get("Allow"))
			assert.NotContains(t, response.Body.String(), "<html>")
		})
	}
}
