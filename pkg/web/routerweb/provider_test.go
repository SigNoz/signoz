package routerweb

import (
	"context"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/global"
	"github.com/SigNoz/signoz/pkg/web"
	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func expectedHTML(baseHref string, settings web.Settings) string {
	settingsJSON, _ := json.Marshal(settings)
	return `<html><head><base href="` + baseHref + `" /></head><body><script>window.signozBootData={settings:` + string(settingsJSON) + `}</script>Welcome to test data!!!</body></html>`
}

func startServer(t *testing.T, config web.Config, globalConfig global.Config) string {
	t.Helper()

	web, err := New(context.Background(), factorytest.NewSettings(), config, globalConfig)
	require.NoError(t, err)

	router := mux.NewRouter()
	require.NoError(t, web.AddToRouter(router))

	listener, err := net.Listen("tcp", "localhost:0")
	require.NoError(t, err)

	server := &http.Server{Handler: router}
	go func() { _ = server.Serve(listener) }()
	t.Cleanup(func() { _ = server.Close() })

	return "http://" + listener.Addr().String()
}

func httpGet(t *testing.T, url string) string {
	t.Helper()

	res, err := http.DefaultClient.Get(url)
	require.NoError(t, err)
	defer func() { _ = res.Body.Close() }()

	body, err := io.ReadAll(res.Body)
	require.NoError(t, err)

	return string(body)
}

func TestServeTemplatedIndex(t *testing.T) {
	t.Parallel()

	emptySettings := web.Settings{}

	testCases := []struct {
		name         string
		path         string
		globalConfig global.Config
		webConfig    web.Config
		expected     string
	}{
		{
			name:         "RootBaseHrefAtRoot",
			path:         "/",
			globalConfig: global.Config{},
			webConfig:    web.Config{Index: "valid_template.html", Directory: "testdata"},
			expected:     expectedHTML("/", emptySettings),
		},
		{
			name:         "RootBaseHrefAtNonExistentPath",
			path:         "/does-not-exist",
			globalConfig: global.Config{},
			webConfig:    web.Config{Index: "valid_template.html", Directory: "testdata"},
			expected:     expectedHTML("/", emptySettings),
		},
		{
			name:         "RootBaseHrefAtDirectory",
			path:         "/assets",
			globalConfig: global.Config{},
			webConfig:    web.Config{Index: "valid_template.html", Directory: "testdata"},
			expected:     expectedHTML("/", emptySettings),
		},
		{
			name:         "SubPathBaseHrefAtRoot",
			path:         "/",
			globalConfig: global.Config{ExternalURL: &url.URL{Scheme: "https", Host: "example.com", Path: "/signoz"}},
			webConfig:    web.Config{Index: "valid_template.html", Directory: "testdata"},
			expected:     expectedHTML("/signoz/", emptySettings),
		},
		{
			name:         "SubPathBaseHrefAtNonExistentPath",
			path:         "/does-not-exist",
			globalConfig: global.Config{ExternalURL: &url.URL{Scheme: "https", Host: "example.com", Path: "/signoz"}},
			webConfig:    web.Config{Index: "valid_template.html", Directory: "testdata"},
			expected:     expectedHTML("/signoz/", emptySettings),
		},
		{
			name:         "SubPathBaseHrefAtDirectory",
			path:         "/assets",
			globalConfig: global.Config{ExternalURL: &url.URL{Scheme: "https", Host: "example.com", Path: "/signoz"}},
			webConfig:    web.Config{Index: "valid_template.html", Directory: "testdata"},
			expected:     expectedHTML("/signoz/", emptySettings),
		},
		{
			name:         "WithPopulatedSettings",
			path:         "/",
			globalConfig: global.Config{},
			webConfig: web.Config{
				Index:     "valid_template.html",
				Directory: "testdata",
				Settings: web.SettingsConfig{
					Posthog: web.PosthogConfig{
						Enabled: true,
						Key:     "phc_examplekey",
						APIHost: "https://us.i.posthog.com",
						UIHost:  "https://us.posthog.com",
					},
					Appcues: web.AppcuesConfig{
						Enabled: true,
						AppID:   "12345-abcde",
					},
					Sentry: web.SentryConfig{
						Enabled: true,
						DSN:     "https://examplePublicKey@o0.ingest.sentry.io/0",
						Tunnel:  "https://example.com/tunnel",
					},
					Pylon: web.PylonConfig{
						Enabled:        true,
						AppID:          "pylon-app-id",
						IdentitySecret: "pylon-secret",
					},
				},
			},
			expected: expectedHTML("/", web.Settings{
				Posthog: web.Posthog{
					Enabled: true,
					Key:     "phc_examplekey",
					APIHost: "https://us.i.posthog.com",
					UIHost:  "https://us.posthog.com",
				},
				Appcues: web.Appcues{
					Enabled: true,
					AppID:   "12345-abcde",
				},
				Sentry: web.Sentry{
					Enabled: true,
					DSN:     "https://examplePublicKey@o0.ingest.sentry.io/0",
					Tunnel:  "https://example.com/tunnel",
				},
				Pylon: web.Pylon{
					Enabled:        true,
					AppID:          "pylon-app-id",
					IdentitySecret: "pylon-secret",
				},
			}),
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			base := startServer(t, testCase.webConfig, testCase.globalConfig)

			assert.Equal(t, testCase.expected, strings.TrimSuffix(httpGet(t, base+testCase.path), "\n"))
		})
	}
}

func TestServeNoTemplateIndex(t *testing.T) {
	t.Parallel()

	expected, err := os.ReadFile(filepath.Join("testdata", "no_template.html"))
	require.NoError(t, err)

	testCases := []struct {
		name string
		path string
	}{
		{
			name: "Root",
			path: "/",
		},
		{
			name: "NonExistentPath",
			path: "/does-not-exist",
		},
		{
			name: "Directory",
			path: "/assets",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			base := startServer(t, web.Config{Index: "no_template.html", Directory: "testdata"}, global.Config{})

			assert.Equal(t, string(expected), httpGet(t, base+testCase.path))
		})
	}
}

func TestServeInvalidTemplateIndex(t *testing.T) {
	t.Parallel()

	expected, err := os.ReadFile(filepath.Join("testdata", "invalid_template.html"))
	require.NoError(t, err)

	testCases := []struct {
		name string
		path string
	}{
		{
			name: "Root",
			path: "/",
		},
		{
			name: "NonExistentPath",
			path: "/does-not-exist",
		},
		{
			name: "Directory",
			path: "/assets",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			base := startServer(t, web.Config{Index: "invalid_template.html", Directory: "testdata"}, global.Config{ExternalURL: &url.URL{Path: "/signoz"}})

			assert.Equal(t, string(expected), httpGet(t, base+testCase.path))
		})
	}
}

func TestServeStaticFilesUnchanged(t *testing.T) {
	t.Parallel()

	expected, err := os.ReadFile(filepath.Join("testdata", "assets", "style.css"))
	require.NoError(t, err)

	base := startServer(t, web.Config{Index: "valid_template.html", Directory: "testdata"}, global.Config{ExternalURL: &url.URL{Path: "/signoz"}})

	assert.Equal(t, string(expected), httpGet(t, base+"/assets/style.css"))
}

func TestServeCacheControl(t *testing.T) {
	t.Parallel()

	directory := t.TempDir()
	files := map[string]string{
		"index.html":           "<html>index</html>",
		"assets/x.js":          "console.log('x')",
		"assets/nested/y.css":  "body{}",
		"assets-legacy/z.js":   "console.log('z')",
		"favicon.ico":          "icon",
		"css/uPlot.min.css":    ".uplot{}",
		"locales/en/main.json": "{}",
	}
	for name, content := range files {
		require.NoError(t, os.MkdirAll(filepath.Join(directory, filepath.Dir(name)), 0o755))
		require.NoError(t, os.WriteFile(filepath.Join(directory, name), []byte(content), 0o644))
	}

	testCases := []struct {
		name           string
		basePath       string
		path           string
		expectedStatus int
		expectedBody   string
		expectedCC     string
	}{
		{name: "ExistingAsset_Immutable", path: "/assets/x.js", expectedBody: files["assets/x.js"], expectedCC: "public, max-age=31536000, immutable"},
		{name: "ExistingNestedAsset_Immutable", path: "/assets/nested/y.css", expectedBody: files["assets/nested/y.css"], expectedCC: "public, max-age=31536000, immutable"},
		{name: "MissingAsset_ServesIndex_NoCache", path: "/assets/missing-AAAA.js", expectedBody: files["index.html"], expectedCC: "max-age=0,no-cache,private,must-revalidate"},
		{name: "AssetsDirectory_ServesIndex_NoCache", path: "/assets/nested/", expectedBody: files["index.html"], expectedCC: "max-age=0,no-cache,private,must-revalidate"},
		{name: "Root_ServesIndex_NoCache", path: "/", expectedBody: files["index.html"], expectedCC: "max-age=0,no-cache,private,must-revalidate"},
		{name: "UnknownRoute_ServesIndex_NoCache", path: "/does-not-exist", expectedBody: files["index.html"], expectedCC: "max-age=0,no-cache,private,must-revalidate"},
		{name: "NonAssetFile_NoCache", path: "/favicon.ico", expectedBody: files["favicon.ico"], expectedCC: "max-age=0,no-cache,private,must-revalidate"},
		{name: "NonAssetNestedFile_NoCache", path: "/css/uPlot.min.css", expectedBody: files["css/uPlot.min.css"], expectedCC: "max-age=0,no-cache,private,must-revalidate"},
		{name: "LocaleFile_NoCache", path: "/locales/en/main.json", expectedBody: files["locales/en/main.json"], expectedCC: "max-age=0,no-cache,private,must-revalidate"},
		{name: "AssetsPrefixLookalike_NoCache", path: "/assets-legacy/z.js", expectedBody: files["assets-legacy/z.js"], expectedCC: "max-age=0,no-cache,private,must-revalidate"},
		{name: "BasePath_ExistingAsset_Immutable", basePath: "/signoz", path: "/assets/x.js", expectedBody: files["assets/x.js"], expectedCC: "public, max-age=31536000, immutable"},
		{name: "BasePath_MissingAsset_ServesIndex_NoCache", basePath: "/signoz", path: "/assets/missing-AAAA.js", expectedBody: files["index.html"], expectedCC: "max-age=0,no-cache,private,must-revalidate"},
		{name: "BasePath_NonAssetFile_NoCache", basePath: "/signoz", path: "/favicon.ico", expectedBody: files["favicon.ico"], expectedCC: "max-age=0,no-cache,private,must-revalidate"},
		{name: "AssetTrailingSlash_Redirects_NoCache", path: "/assets/x.js/", expectedStatus: http.StatusMovedPermanently, expectedCC: "max-age=0,no-cache,private,must-revalidate"},
		{name: "EncodedDotDotOutOfAssets_NoCache", path: "/assets/%2e%2e/locales/en/main.json", expectedBody: files["locales/en/main.json"], expectedCC: "max-age=0,no-cache,private,must-revalidate"},
		{name: "BasePath_Root_ServesIndex_NoCache", basePath: "/signoz", path: "/", expectedBody: files["index.html"], expectedCC: "max-age=0,no-cache,private,must-revalidate"},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			routerWeb, err := New(
				context.Background(),
				factorytest.NewSettings(),
				web.Config{Index: "index.html", Directory: directory},
				global.Config{ExternalURL: &url.URL{Path: testCase.basePath}},
			)
			require.NoError(t, err)

			router := mux.NewRouter().UseEncodedPath()
			require.NoError(t, routerWeb.AddToRouter(router))

			var handler http.Handler = router
			if testCase.basePath != "" {
				handler = http.StripPrefix(testCase.basePath, router)
			}

			server := httptest.NewServer(handler)
			t.Cleanup(server.Close)

			client := &http.Client{CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
			res, err := client.Get(server.URL + testCase.basePath + testCase.path)
			require.NoError(t, err)
			defer func() { _ = res.Body.Close() }()

			body, err := io.ReadAll(res.Body)
			require.NoError(t, err)

			expectedStatus := testCase.expectedStatus
			if expectedStatus == 0 {
				expectedStatus = http.StatusOK
			}
			assert.Equal(t, expectedStatus, res.StatusCode)
			assert.Equal(t, testCase.expectedCC, res.Header.Get("Cache-Control"))
			assert.Equal(t, testCase.expectedBody, string(body))
		})
	}
}
