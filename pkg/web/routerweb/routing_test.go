package routerweb

import (
	"compress/gzip"
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/global"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/web"
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/rs/cors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAPIFallback(t *testing.T) {
	t.Parallel()

	for _, prefix := range []string{"", "/signoz"} {
		t.Run("BasePath="+prefix, func(t *testing.T) {
			config := global.Config{ExternalURL: &url.URL{Path: prefix}}
			web, err := New(context.Background(), factorytest.NewSettings(), web.Config{
				Index: "valid_template.html", Directory: "testdata",
			}, config)
			require.NoError(t, err)

			router := mux.NewRouter().UseEncodedPath()
			router.Use(func(next http.Handler) http.Handler {
				return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					w.Header().Add("X-Test-Middleware", r.Method)
					next.ServeHTTP(w, r)
				})
			})
			api := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("X-Handled-Method", r.Method)
				w.Header().Set("X-Route-ID", mux.Vars(r)["id"])
				w.WriteHeader(http.StatusNoContent)
			})
			router.Handle("/api/v1/services", api).Methods(http.MethodPost)
			router.Handle("/api/v2/dashboards/{id}", api).Methods(http.MethodGet, http.MethodHead)
			router.Handle("/api/v2/dashboards/{id}", api).Methods(http.MethodGet, http.MethodPut)
			router.Handle("/api/v1/unrestricted", api)
			router.HandleFunc("/api/v4/query_range", func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("X-Edition-Override", "enterprise")
				api.ServeHTTP(w, r)
			}).Methods(http.MethodPost)
			for _, version := range []string{"v3", "v4"} {
				subrouter := router.PathPrefix("/api/" + version).Subrouter()
				subrouter.Handle("/query_range", api).Methods(http.MethodPost)
				subrouter.Handle("/fields", api).Methods(http.MethodGet)
			}
			router.PathPrefix("/api/v1/messaging-queues").Subrouter().
				PathPrefix("/kafka").Subrouter().
				Handle("/settings", api).Methods(http.MethodPut)
			router.Handle("/prometheus/api/v1/query", api).Methods(http.MethodGet, http.MethodPost)
			router.HandleFunc("/api/v1/legacy", func(w http.ResponseWriter, r *http.Request) {
				render.Error(w, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "legacy endpoint"))
			}).Methods(http.MethodGet)
			router.HandleFunc("/api/v2/missing-resource", func(w http.ResponseWriter, r *http.Request) {
				render.Error(w, errors.NewNotFoundf(errors.CodeNotFound, "resource not found"))
			}).Methods(http.MethodGet)
			router.HandleFunc("/api/v1/callback", func(w http.ResponseWriter, r *http.Request) {
				http.Redirect(w, r, prefix+"/login", http.StatusSeeOther)
			}).Methods(http.MethodPost)
			require.NoError(t, web.AddToRouter(router))

			handler := handlers.CompressHandler(cors.New(cors.Options{
				AllowedOrigins: []string{"*"},
				AllowedMethods: []string{"GET", "DELETE", "POST", "PUT", "PATCH", "OPTIONS"},
				AllowedHeaders: []string{"Accept", "Authorization", "Content-Type", "cache-control"},
			}).Handler(router))
			if prefix != "" {
				handler = http.StripPrefix(prefix, handler)
			}

			for _, path := range []string{"/api", "/api/", "/api/v99/missing", "/api/v3/missing", "/api/v4/missing", "/api/v1/messaging-queues/kafka/missing", "/api/v2/dashboards/a/b", "/%61pi/v99/missing"} {
				for _, method := range []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodHead, http.MethodOptions} {
					t.Run(method+path, func(t *testing.T) {
						req := httptest.NewRequest(method, prefix+path+"?test=1", nil)
						req.Header.Set("Accept", "application/json")
						response := httptest.NewRecorder()
						handler.ServeHTTP(response, req)

						assert.Equal(t, http.StatusNotFound, response.Code)
						assert.Equal(t, "application/json", response.Header().Get("Content-Type"))
						assert.Equal(t, "not_found", render.ErrorCodeFromBody(response.Body.Bytes()))
						assert.Equal(t, []string{method}, response.Header().Values("X-Test-Middleware"))
						assert.Empty(t, response.Header().Get("X-Handled-Method"))
						assert.Empty(t, response.Header().Get("Allow"))
						assert.NotContains(t, response.Body.String(), "<html>")
						assert.Equal(t, "max-age=0,no-cache,private,must-revalidate", response.Header().Get("Cache-Control"))
					})
				}
			}

			for _, testCase := range []struct {
				method string
				path   string
				allow  string
			}{
				{http.MethodGet, "/api/v1/services", "POST"},
				{http.MethodHead, "/api/v1/services", "POST"},
				{http.MethodOptions, "/api/v1/services", "POST"},
				{http.MethodPost, "/api/v2/dashboards/a", "GET, HEAD, PUT"},
				{http.MethodPost, "/api/v2/dashboards/a%2Fb", "GET, HEAD, PUT"},
				{http.MethodGet, "/api/v3/query_range", "POST"},
				{http.MethodHead, "/api/v3/fields", "GET"},
				{http.MethodGet, "/api/v4/query_range", "POST"},
				{http.MethodGet, "/api/v1/messaging-queues/kafka/settings", "PUT"},
				{http.MethodDelete, "/prometheus/api/v1/query", "GET, POST"},
			} {
				t.Run(testCase.method+testCase.path, func(t *testing.T) {
					response := httptest.NewRecorder()
					handler.ServeHTTP(response, httptest.NewRequest(testCase.method, prefix+testCase.path, nil))
					assert.Equal(t, http.StatusMethodNotAllowed, response.Code)
					assert.Equal(t, testCase.allow, response.Header().Get("Allow"))
					assert.Equal(t, "application/json", response.Header().Get("Content-Type"))
					assert.Equal(t, "method_not_allowed", render.ErrorCodeFromBody(response.Body.Bytes()))
					assert.Equal(t, []string{testCase.method}, response.Header().Values("X-Test-Middleware"))
					assert.Empty(t, response.Header().Get("X-Handled-Method"))
					assert.Equal(t, "max-age=0,no-cache,private,must-revalidate", response.Header().Get("Cache-Control"))
				})
			}

			for _, testCase := range []struct {
				method string
				path   string
			}{
				{http.MethodPost, "/api/v1/services"},
				{http.MethodGet, "/api/v2/dashboards/a"},
				{http.MethodPut, "/api/v2/dashboards/a"},
				{http.MethodHead, "/api/v2/dashboards/a"},
				{http.MethodGet, "/api/v2/dashboards/a%2Fb"},
				{http.MethodPost, "/api/v3/query_range"},
				{http.MethodPost, "/api/v4/query_range"},
				{http.MethodPut, "/api/v1/messaging-queues/kafka/settings"},
				{http.MethodPatch, "/api/v1/unrestricted"},
				{http.MethodGet, "/prometheus/api/v1/query"},
				{http.MethodPost, "/prometheus/api/v1/query"},
			} {
				t.Run(testCase.method+testCase.path, func(t *testing.T) {
					response := httptest.NewRecorder()
					handler.ServeHTTP(response, httptest.NewRequest(testCase.method, prefix+testCase.path, nil))
					assert.Equal(t, http.StatusNoContent, response.Code)
					assert.Equal(t, testCase.method, response.Header().Get("X-Handled-Method"))
					assert.Equal(t, []string{testCase.method}, response.Header().Values("X-Test-Middleware"))
					assert.Empty(t, response.Header().Get("Allow"))
					if strings.HasSuffix(testCase.path, "a%2Fb") {
						assert.Equal(t, "a%2Fb", response.Header().Get("X-Route-ID"))
					}
					if testCase.path == "/api/v4/query_range" {
						assert.Equal(t, "enterprise", response.Header().Get("X-Edition-Override"))
					}
				})
			}

			t.Run("HandlerErrorsAndRedirects", func(t *testing.T) {
				for _, testCase := range []struct {
					method string
					path   string
					status int
				}{
					{http.MethodGet, "/api/v1/legacy", http.StatusNotImplemented},
					{http.MethodGet, "/api/v2/missing-resource", http.StatusNotFound},
					{http.MethodPost, "/api/v1/callback", http.StatusSeeOther},
				} {
					response := httptest.NewRecorder()
					handler.ServeHTTP(response, httptest.NewRequest(testCase.method, prefix+testCase.path, nil))
					assert.Equal(t, testCase.status, response.Code)
					if testCase.status == http.StatusSeeOther {
						assert.Equal(t, prefix+"/login", response.Header().Get("Location"))
					} else {
						assert.Contains(t, response.Body.String(), map[int]string{
							http.StatusNotImplemented: "legacy endpoint",
							http.StatusNotFound:       "resource not found",
						}[testCase.status])
					}
				}
			})

			t.Run("CORSPreflight", func(t *testing.T) {
				req := httptest.NewRequest(http.MethodOptions, prefix+"/api/v99/missing", nil)
				req.Header.Set("Origin", "https://example.com")
				req.Header.Set("Access-Control-Request-Method", http.MethodPost)
				response := httptest.NewRecorder()
				handler.ServeHTTP(response, req)
				assert.Equal(t, http.StatusNoContent, response.Code)
				assert.Equal(t, "*", response.Header().Get("Access-Control-Allow-Origin"))
				assert.Empty(t, response.Body.String())
			})

			t.Run("StaticFileAndConditionalGET", func(t *testing.T) {
				response := httptest.NewRecorder()
				handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, prefix+"/assets/style.css", nil))
				assert.Equal(t, http.StatusOK, response.Code)
				assert.Equal(t, "text/css; charset=utf-8", response.Header().Get("Content-Type"))
				assert.Equal(t, "body { color: red; }\n", response.Body.String())
				assert.Equal(t, "max-age=0,no-cache,private,must-revalidate", response.Header().Get("Cache-Control"))
				require.NotEmpty(t, response.Header().Get("Last-Modified"))

				req := httptest.NewRequest(http.MethodGet, prefix+"/assets/style.css", nil)
				req.Header.Set("If-Modified-Since", response.Header().Get("Last-Modified"))
				response = httptest.NewRecorder()
				handler.ServeHTTP(response, req)
				assert.Equal(t, http.StatusNotModified, response.Code)
				assert.Empty(t, response.Body.String())
			})

			t.Run("CompressedAPIError", func(t *testing.T) {
				req := httptest.NewRequest(http.MethodGet, prefix+"/api/v99/missing", nil)
				req.Header.Set("Accept-Encoding", "gzip")
				req.Header.Set("Origin", "https://example.com")
				response := httptest.NewRecorder()
				handler.ServeHTTP(response, req)
				assert.Equal(t, http.StatusNotFound, response.Code)
				assert.Equal(t, "gzip", response.Header().Get("Content-Encoding"))
				assert.Equal(t, "*", response.Header().Get("Access-Control-Allow-Origin"))
				reader, err := gzip.NewReader(response.Body)
				require.NoError(t, err)
				defer func() { require.NoError(t, reader.Close()) }()
				body, err := io.ReadAll(reader)
				require.NoError(t, err)
				assert.Equal(t, "not_found", render.ErrorCodeFromBody(body))
			})

			for _, path := range []string{"/", "/dashboard/example", "/apiary", "/assets"} {
				for _, method := range []string{http.MethodGet, http.MethodPost} {
					t.Run(method+path, func(t *testing.T) {
						response := httptest.NewRecorder()
						handler.ServeHTTP(response, httptest.NewRequest(method, prefix+path, nil))
						assert.Equal(t, http.StatusOK, response.Code)
						assert.Equal(t, "text/html; charset=utf-8", response.Header().Get("Content-Type"))
						assert.Contains(t, response.Body.String(), "Welcome to test data!!!")
						assert.Contains(t, response.Body.String(), `base href="`+config.ExternalPathTrailing()+`"`)
						assert.Equal(t, "max-age=0,no-cache,private,must-revalidate", response.Header().Get("Cache-Control"))
					})
				}
			}
		})
	}
}

func TestAPIFallbackRouteConstraints(t *testing.T) {
	t.Parallel()

	web, err := New(context.Background(), factorytest.NewSettings(), web.Config{
		Index: "valid_template.html", Directory: "testdata",
	}, global.Config{})
	require.NoError(t, err)
	router := mux.NewRouter().UseEncodedPath()
	api := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})
	router.Host("example.com").Subrouter().Handle("/api/host", api).Methods(http.MethodGet)
	router.Handle("/api/query", api).Methods(http.MethodPost).Queries("kind", "logs")
	router.Handle("/api/header", api).Methods(http.MethodPut).Headers("X-Kind", "logs")
	router.Handle("/api/ids/{id:[0-9]+}", api).Methods(http.MethodDelete)
	router.Handle("/api/build-only", api).Methods(http.MethodGet).BuildOnly()
	require.NoError(t, web.AddToRouter(router))

	for _, testCase := range []struct {
		url    string
		header string
		status int
		allow  string
	}{
		{"http://example.com/api/host", "", http.StatusMethodNotAllowed, "GET"},
		{"http://other.example/api/host", "", http.StatusNotFound, ""},
		{"/api/query?kind=logs", "", http.StatusMethodNotAllowed, "POST"},
		{"/api/query?kind=traces", "", http.StatusNotFound, ""},
		{"/api/header", "logs", http.StatusMethodNotAllowed, "PUT"},
		{"/api/header", "traces", http.StatusNotFound, ""},
		{"/api/ids/123", "", http.StatusMethodNotAllowed, "DELETE"},
		{"/api/ids/abc", "", http.StatusNotFound, ""},
		{"/api/build-only", "", http.StatusNotFound, ""},
	} {
		t.Run(testCase.url+testCase.header, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPatch, testCase.url, nil)
			req.Header.Set("X-Kind", testCase.header)
			response := httptest.NewRecorder()
			router.ServeHTTP(response, req)
			assert.Equal(t, testCase.status, response.Code)
			assert.Equal(t, testCase.allow, response.Header().Get("Allow"))
		})
	}
}

func TestAPIFallbackHTTP(t *testing.T) {
	t.Parallel()

	web, err := New(context.Background(), factorytest.NewSettings(), web.Config{
		Index: "valid_template.html", Directory: "testdata",
	}, global.Config{})
	require.NoError(t, err)
	router := mux.NewRouter().UseEncodedPath()
	router.HandleFunc("/api/v1/export", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/csv")
		_, _ = io.WriteString(w, "service,count\nfrontend,1\n")
	}).Methods(http.MethodGet)
	require.NoError(t, web.AddToRouter(router))
	server := httptest.NewServer(router)
	t.Cleanup(server.Close)

	for _, testCase := range []struct {
		method      string
		path        string
		byteRange   string
		status      int
		contentType string
		allow       string
		body        string
	}{
		{http.MethodHead, "/api/v99/missing", "", http.StatusNotFound, "application/json", "", ""},
		{http.MethodHead, "/api/v1/export", "", http.StatusMethodNotAllowed, "application/json", "GET", ""},
		{http.MethodHead, "/assets/style.css", "", http.StatusOK, "text/css; charset=utf-8", "", ""},
		{http.MethodGet, "/api/v1/export", "", http.StatusOK, "text/csv", "", "service,count\nfrontend,1\n"},
		{http.MethodGet, "/assets/style.css", "bytes=0-3", http.StatusPartialContent, "text/css; charset=utf-8", "", "body"},
	} {
		t.Run(testCase.method+testCase.path, func(t *testing.T) {
			req, err := http.NewRequest(testCase.method, server.URL+testCase.path, nil)
			require.NoError(t, err)
			if testCase.byteRange != "" {
				req.Header.Set("Range", testCase.byteRange)
			}
			response, err := server.Client().Do(req)
			require.NoError(t, err)
			defer func() { require.NoError(t, response.Body.Close()) }()
			body, err := io.ReadAll(response.Body)
			require.NoError(t, err)
			assert.Equal(t, testCase.status, response.StatusCode)
			assert.Equal(t, testCase.contentType, response.Header.Get("Content-Type"))
			assert.Equal(t, testCase.allow, response.Header.Get("Allow"))
			assert.Equal(t, testCase.body, string(body))
		})
	}
}
