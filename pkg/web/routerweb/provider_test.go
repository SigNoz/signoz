package routerweb

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/json"
	"io"
	"maps"
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
	"github.com/SigNoz/signoz/pkg/http/middleware"
	"github.com/SigNoz/signoz/pkg/web"
	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func expectedHTML(baseHref string, settings web.Settings) string {
	settingsJSON, _ := json.Marshal(settings)
	return `<html><head><base href="` + baseHref + `" /></head><body><script>window.signozBootData={settings:` + string(settingsJSON) + `}</script>Welcome to test data!!!</body></html>`
}

func startServer(t *testing.T, config web.Config, globalConfig global.Config, wrappers ...func(http.Handler) http.Handler) string {
	t.Helper()

	web, err := New(context.Background(), factorytest.NewSettings(), config, globalConfig)
	require.NoError(t, err)

	router := mux.NewRouter()
	require.NoError(t, web.AddToRouter(router))

	listener, err := net.Listen("tcp", "localhost:0")
	require.NoError(t, err)

	var handler http.Handler = router
	for _, wrap := range wrappers {
		handler = wrap(handler)
	}

	server := &http.Server{Handler: handler}
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

type response struct {
	status int
	header http.Header
	body   string
}

func sendRequest(t *testing.T, client *http.Client, method string, url string, headers map[string]string) response {
	t.Helper()

	req, err := http.NewRequest(method, url, nil)
	require.NoError(t, err)

	for key, value := range headers {
		req.Header.Set(key, value)
	}

	res, err := client.Do(req)
	require.NoError(t, err)
	defer func() { _ = res.Body.Close() }()

	body, err := io.ReadAll(res.Body)
	require.NoError(t, err)

	if res.Header.Get("Content-Encoding") == "gzip" && len(body) > 0 {
		reader, err := gzip.NewReader(bytes.NewReader(body))
		require.NoError(t, err)

		body, err = io.ReadAll(reader)
		require.NoError(t, err)
	}

	return response{status: res.StatusCode, header: res.Header, body: string(body)}
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

func TestServeIndexETag(t *testing.T) {
	t.Parallel()

	// Over 1 KiB, or the compression middleware leaves it plain.
	index := []byte("<html><body>" + strings.Repeat("welcome ", 200) + "</body></html>")
	stylesheet := []byte("body{}")

	directory := t.TempDir()
	require.NoError(t, os.MkdirAll(filepath.Join(directory, "assets"), 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(directory, "index.html"), index, 0o644))
	require.NoError(t, os.WriteFile(filepath.Join(directory, "assets", "style.css"), stylesheet, 0o644))

	webConfig := web.Config{Index: "index.html", Directory: directory}
	plain := startServer(t, webConfig, global.Config{})
	compress, err := middleware.NewCompress(true, gzip.DefaultCompression)
	require.NoError(t, err)
	compressed := startServer(t, webConfig, global.Config{}, compress.Wrap)

	transport := &http.Transport{DisableCompression: true}
	t.Cleanup(transport.CloseIdleConnections)
	client := &http.Client{Transport: transport}

	first := sendRequest(t, client, http.MethodGet, plain+"/", nil)
	require.Equal(t, http.StatusOK, first.status)
	etag := first.header.Get("ETag")
	require.True(t, strings.HasPrefix(etag, `W/"`), "ETag must be weak, got %q", etag)
	assert.Contains(t, first.header.Get("Cache-Control"), "no-cache")

	strongForm := strings.TrimPrefix(etag, "W/")

	testCases := []struct {
		name         string
		compressed   bool
		method       string
		path         string
		headers      map[string]string
		wantStatus   int
		wantETag     string
		wantEncoding string
		wantBody     string
	}{
		{
			name:       "Root_ServesIndex",
			method:     http.MethodGet,
			path:       "/",
			wantStatus: http.StatusOK,
			wantETag:   etag,
			wantBody:   string(index),
		},
		{
			name:       "NonExistentPath_ServesIndex",
			method:     http.MethodGet,
			path:       "/does-not-exist",
			wantStatus: http.StatusOK,
			wantETag:   etag,
			wantBody:   string(index),
		},
		{
			name:       "Directory_ServesIndex",
			method:     http.MethodGet,
			path:       "/assets",
			wantStatus: http.StatusOK,
			wantETag:   etag,
			wantBody:   string(index),
		},
		{
			name:       "StaticFile_HasNoIndexETag",
			method:     http.MethodGet,
			path:       "/assets/style.css",
			wantStatus: http.StatusOK,
			wantETag:   "",
			wantBody:   string(stylesheet),
		},
		{
			name:       "StaticFile_IfNoneMatchOfIndex_ServesFile",
			method:     http.MethodGet,
			path:       "/assets/style.css",
			headers:    map[string]string{"If-None-Match": etag},
			wantStatus: http.StatusOK,
			wantETag:   "",
			wantBody:   string(stylesheet),
		},
		{
			name:       "Get_MatchingIfNoneMatch_NotModified",
			method:     http.MethodGet,
			path:       "/home",
			headers:    map[string]string{"If-None-Match": etag},
			wantStatus: http.StatusNotModified,
			wantETag:   etag,
		},
		{
			name:       "Get_StrongFormOfIfNoneMatch_NotModified",
			method:     http.MethodGet,
			path:       "/home",
			headers:    map[string]string{"If-None-Match": strongForm},
			wantStatus: http.StatusNotModified,
			wantETag:   etag,
		},
		{
			name:       "Get_ListContainingIfNoneMatch_NotModified",
			method:     http.MethodGet,
			path:       "/home",
			headers:    map[string]string{"If-None-Match": `"other", W/"another" ,` + etag},
			wantStatus: http.StatusNotModified,
			wantETag:   etag,
		},
		{
			name:       "Get_WildcardIfNoneMatch_NotModified",
			method:     http.MethodGet,
			path:       "/home",
			headers:    map[string]string{"If-None-Match": "*"},
			wantStatus: http.StatusNotModified,
			wantETag:   etag,
		},
		{
			name:       "Get_StaleIfNoneMatch_ServesIndex",
			method:     http.MethodGet,
			path:       "/home",
			headers:    map[string]string{"If-None-Match": `"stale", W/"stale-too"`},
			wantStatus: http.StatusOK,
			wantETag:   etag,
			wantBody:   string(index),
		},
		{
			name:       "Head_MatchingIfNoneMatch_NotModified",
			method:     http.MethodHead,
			path:       "/home",
			headers:    map[string]string{"If-None-Match": etag},
			wantStatus: http.StatusNotModified,
			wantETag:   etag,
		},
		{
			name:       "Head_NoValidator_OkWithoutBody",
			method:     http.MethodHead,
			path:       "/home",
			wantStatus: http.StatusOK,
			wantETag:   etag,
		},
		{
			name:       "Post_MatchingIfNoneMatch_ServesIndex",
			method:     http.MethodPost,
			path:       "/api/v1/mistyped",
			headers:    map[string]string{"If-None-Match": etag},
			wantStatus: http.StatusOK,
			wantETag:   etag,
			wantBody:   string(index),
		},
		{
			name:       "Get_NonMatchingIfMatch_ServesIndex",
			method:     http.MethodGet,
			path:       "/home",
			headers:    map[string]string{"If-Match": `"other"`},
			wantStatus: http.StatusOK,
			wantETag:   etag,
			wantBody:   string(index),
		},
		{
			name:       "Get_Range_ServesFullIndex",
			method:     http.MethodGet,
			path:       "/home",
			headers:    map[string]string{"Range": "bytes=0-9"},
			wantStatus: http.StatusOK,
			wantETag:   etag,
			wantBody:   string(index),
		},
		{
			name:         "Gzip_NoValidator_ServesCompressedIndex",
			compressed:   true,
			method:       http.MethodGet,
			path:         "/home",
			wantStatus:   http.StatusOK,
			wantETag:     etag,
			wantEncoding: "gzip",
			wantBody:     string(index),
		},
		{
			name:         "Gzip_RangeBytes_ServesFullIndex",
			compressed:   true,
			method:       http.MethodGet,
			path:         "/home",
			headers:      map[string]string{"Range": "bytes=0-9"},
			wantStatus:   http.StatusOK,
			wantETag:     etag,
			wantEncoding: "gzip",
			wantBody:     string(index),
		},
		{
			name:         "Gzip_RangeBeyondEnd_ServesFullIndex",
			compressed:   true,
			method:       http.MethodGet,
			path:         "/home",
			headers:      map[string]string{"Range": "bytes=999999-"},
			wantStatus:   http.StatusOK,
			wantETag:     etag,
			wantEncoding: "gzip",
			wantBody:     string(index),
		},
		{
			name:         "Gzip_RangeUnknownUnit_ServesFullIndex",
			compressed:   true,
			method:       http.MethodGet,
			path:         "/home",
			headers:      map[string]string{"Range": "items=0-1"},
			wantStatus:   http.StatusOK,
			wantETag:     etag,
			wantEncoding: "gzip",
			wantBody:     string(index),
		},
		{
			name:         "Gzip_IfRangeWithRange_ServesFullIndex",
			compressed:   true,
			method:       http.MethodGet,
			path:         "/home",
			headers:      map[string]string{"Range": "bytes=0-9", "If-Range": etag},
			wantStatus:   http.StatusOK,
			wantETag:     etag,
			wantEncoding: "gzip",
			wantBody:     string(index),
		},
		{
			name:       "Gzip_MatchingIfNoneMatch_NotModified",
			compressed: true,
			method:     http.MethodGet,
			path:       "/home",
			headers:    map[string]string{"If-None-Match": etag},
			wantStatus: http.StatusNotModified,
			wantETag:   etag,
		},
		{
			name:       "Gzip_StrongFormOfIfNoneMatch_NotModified",
			compressed: true,
			method:     http.MethodGet,
			path:       "/home",
			headers:    map[string]string{"If-None-Match": strongForm},
			wantStatus: http.StatusNotModified,
			wantETag:   etag,
		},
		{
			name:       "Gzip_ListIfNoneMatch_NotModified",
			compressed: true,
			method:     http.MethodGet,
			path:       "/home",
			headers:    map[string]string{"If-None-Match": `"other",` + etag + `,"another"`},
			wantStatus: http.StatusNotModified,
			wantETag:   etag,
		},
		{
			name:         "Gzip_Post_MatchingIfNoneMatch_ServesIndex",
			compressed:   true,
			method:       http.MethodPost,
			path:         "/api/v1/mistyped",
			headers:      map[string]string{"If-None-Match": etag},
			wantStatus:   http.StatusOK,
			wantETag:     etag,
			wantEncoding: "gzip",
			wantBody:     string(index),
		},
		{
			name:         "Gzip_NonMatchingIfMatch_ServesIndex",
			compressed:   true,
			method:       http.MethodGet,
			path:         "/home",
			headers:      map[string]string{"If-Match": `"other"`},
			wantStatus:   http.StatusOK,
			wantETag:     etag,
			wantEncoding: "gzip",
			wantBody:     string(index),
		},
		{
			name:         "Gzip_IfUnmodifiedSince_ServesIndex",
			compressed:   true,
			method:       http.MethodGet,
			path:         "/home",
			headers:      map[string]string{"If-Unmodified-Since": "Mon, 02 Jan 2006 15:04:05 GMT"},
			wantStatus:   http.StatusOK,
			wantETag:     etag,
			wantEncoding: "gzip",
			wantBody:     string(index),
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			base := plain
			headers := maps.Clone(testCase.headers)
			if testCase.compressed {
				base = compressed
				if headers == nil {
					headers = map[string]string{}
				}
				headers["Accept-Encoding"] = "gzip"
			}

			res := sendRequest(t, client, testCase.method, base+testCase.path, headers)

			assert.Equal(t, testCase.wantStatus, res.status)
			assert.Equal(t, testCase.wantETag, res.header.Get("ETag"))
			assert.Empty(t, res.header.Get("Content-Range"))
			assert.Equal(t, testCase.wantBody, res.body)

			if testCase.wantBody != "" {
				assert.Equal(t, testCase.wantEncoding, res.header.Get("Content-Encoding"))
			}
		})
	}
}

func TestServeIndexETagChangesWithIndex(t *testing.T) {
	t.Parallel()

	template, err := os.ReadFile(filepath.Join("testdata", "valid_template.html"))
	require.NoError(t, err)

	changedDirectory := t.TempDir()
	changedTemplate := strings.Replace(string(template), "Welcome to test data!!!", "Welcome to new data!!!", 1)
	require.NoError(t, os.WriteFile(filepath.Join(changedDirectory, "valid_template.html"), []byte(changedTemplate), 0o644))

	webConfig := web.Config{Index: "valid_template.html", Directory: "testdata"}
	sentrySettings := web.SettingsConfig{Sentry: web.SentryConfig{Enabled: true, DSN: "https://examplePublicKey@o0.ingest.sentry.io/0"}}

	client := &http.Client{}
	previous := sendRequest(t, client, http.MethodGet, startServer(t, webConfig, global.Config{})+"/", nil)
	require.Equal(t, http.StatusOK, previous.status)
	previousETag := previous.header.Get("ETag")
	require.NotEmpty(t, previousETag)

	testCases := []struct {
		name         string
		webConfig    web.Config
		globalConfig global.Config
		wantBody     string
	}{
		{
			name:      "ChangedHTML",
			webConfig: web.Config{Index: "valid_template.html", Directory: changedDirectory},
			wantBody:  strings.Replace(expectedHTML("/", web.Settings{}), "Welcome to test data!!!", "Welcome to new data!!!", 1),
		},
		{
			name:         "ChangedBaseHref",
			webConfig:    webConfig,
			globalConfig: global.Config{ExternalURL: &url.URL{Path: "/signoz"}},
			wantBody:     expectedHTML("/signoz/", web.Settings{}),
		},
		{
			name:      "ChangedSettings",
			webConfig: web.Config{Index: "valid_template.html", Directory: "testdata", Settings: sentrySettings},
			wantBody:  expectedHTML("/", web.Settings{Sentry: web.Sentry{Enabled: true, DSN: sentrySettings.Sentry.DSN}}),
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			base := startServer(t, testCase.webConfig, testCase.globalConfig)

			res := sendRequest(t, client, http.MethodGet, base+"/", map[string]string{"If-None-Match": previousETag})

			assert.Equal(t, http.StatusOK, res.status)
			assert.NotEmpty(t, res.header.Get("ETag"))
			assert.NotEqual(t, previousETag, res.header.Get("ETag"))
			assert.Equal(t, testCase.wantBody, strings.TrimSuffix(res.body, "\n"))
		})
	}
}
