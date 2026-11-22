package routerweb

import (
	"bytes"
	"compress/gzip"
	"context"
	"fmt"
	"io"
	"mime"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/global"
	"github.com/SigNoz/signoz/pkg/http/middleware"
	"github.com/SigNoz/signoz/pkg/web"
	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func gzipBest(t *testing.T, content []byte) []byte {
	t.Helper()

	var buf bytes.Buffer
	writer, err := gzip.NewWriterLevel(&buf, gzip.BestCompression)
	require.NoError(t, err)
	_, err = writer.Write(content)
	require.NoError(t, err)
	require.NoError(t, writer.Close())

	return buf.Bytes()
}

func gunzipLayers(t *testing.T, body []byte) (int, []byte) {
	t.Helper()

	layers := 0
	for len(body) > 2 && body[0] == 0x1f && body[1] == 0x8b {
		reader, err := gzip.NewReader(bytes.NewReader(body))
		require.NoError(t, err)
		body, err = io.ReadAll(reader)
		require.NoError(t, err)
		layers++
	}

	return layers, body
}

func newIndex(body string) []byte {
	return []byte(fmt.Sprintf(`<html><head><base href="[[.BaseHref]]" /></head><body>%s</body></html>`, body))
}

func newWebServer(t *testing.T, directory string, externalPath string, compression bool) *httptest.Server {
	t.Helper()

	routerWeb, err := New(context.Background(), factorytest.NewSettings(), web.Config{Index: "index.html", Directory: directory}, global.Config{ExternalURL: &url.URL{Scheme: "https", Host: "example.com", Path: externalPath}})
	require.NoError(t, err)

	router := mux.NewRouter().UseEncodedPath()
	require.NoError(t, routerWeb.AddToRouter(router))

	compress, err := middleware.NewCompress(compression, gzip.DefaultCompression)
	require.NoError(t, err)
	handler := compress.Wrap(router)

	if externalPath != "" {
		handler = http.StripPrefix(externalPath, handler)
	}

	server := httptest.NewServer(handler)
	t.Cleanup(server.Close)

	return server
}

func TestServePrecompressed(t *testing.T) {
	t.Parallel()

	script := bytes.Repeat([]byte("export const a=1;\n"), 400)
	scriptTwin := gzipBest(t, script)
	manifest := bytes.Repeat([]byte(`{"name":"signoz"}`), 100)
	manifestTwin := gzipBest(t, manifest)
	padding := strings.Repeat("welcome ", 200)

	directory := t.TempDir()
	files := map[string][]byte{
		"index.html":             newIndex(padding),
		"index.html.gz":          gzipBest(t, []byte("untemplated [[.BaseHref]]")),
		"manifest.json":          manifest,
		"manifest.json.gz":       manifestTwin,
		"assets/app.js":          script,
		"assets/app.js.gz":       scriptTwin,
		"assets/plain.css":       []byte("body{}"),
		"assets/data.unknown":    []byte("unknown"),
		"assets/data.unknown.gz": gzipBest(t, []byte("unknown")),
		"assets/stale.js":        []byte("export const v=22;"),
		"assets/stale.js.gz":     gzipBest(t, []byte("export const v=1;")),
	}
	for name, content := range files {
		require.NoError(t, os.MkdirAll(filepath.Join(directory, filepath.Dir(name)), 0o755))
		require.NoError(t, os.WriteFile(filepath.Join(directory, name), content, 0o644))
	}

	rootIndex := strings.ReplaceAll(string(files["index.html"]), "[[.BaseHref]]", "/")
	prefixedIndex := strings.ReplaceAll(string(files["index.html"]), "[[.BaseHref]]", "/signoz/")
	jsType := mime.TypeByExtension(".js")
	require.NotEmpty(t, jsType)

	testCases := []struct {
		name         string
		method       string
		path         string
		externalPath string
		headers      map[string]string
		noCompress   bool

		wantStatus        int
		wantEncoding      string
		wantContentType   string
		wantContentLength string
		wantCacheControl  string
		wantAcceptRanges  string
		wantVary          []string
		wantWire          []byte
		wantContent       []byte
		wantLayers        int
	}{
		{
			name:              "Twin_AcceptsGzip_ServedOnce",
			path:              "/assets/app.js",
			headers:           map[string]string{"Accept-Encoding": "gzip, deflate, br"},
			wantStatus:        http.StatusOK,
			wantEncoding:      "gzip",
			wantContentType:   jsType,
			wantContentLength: strconv.Itoa(len(scriptTwin)),
			wantCacheControl:  immutableCacheControl,
			wantAcceptRanges:  "none",
			wantVary:          []string{"Accept-Encoding"},
			wantWire:          scriptTwin,
			wantContent:       script,
			wantLayers:        1,
		},
		{
			name:              "Twin_OutsideAssets_NotImmutable",
			path:              "/manifest.json",
			headers:           map[string]string{"Accept-Encoding": "gzip"},
			wantStatus:        http.StatusOK,
			wantEncoding:      "gzip",
			wantContentType:   mime.TypeByExtension(".json"),
			wantContentLength: strconv.Itoa(len(manifestTwin)),
			wantCacheControl:  "max-age=0,no-cache,private,must-revalidate",
			wantVary:          []string{"Accept-Encoding"},
			wantWire:          manifestTwin,
			wantContent:       manifest,
			wantLayers:        1,
		},
		{
			name:              "Twin_CompressionDisabled_AcceptsGzip_Served",
			path:              "/assets/app.js",
			noCompress:        true,
			headers:           map[string]string{"Accept-Encoding": "gzip"},
			wantStatus:        http.StatusOK,
			wantEncoding:      "gzip",
			wantContentType:   jsType,
			wantContentLength: strconv.Itoa(len(scriptTwin)),
			wantCacheControl:  immutableCacheControl,
			wantVary:          []string{"Accept-Encoding"},
			wantWire:          scriptTwin,
			wantContent:       script,
			wantLayers:        1,
		},
		{
			name:              "Twin_CompressionDisabled_NoAcceptEncoding_PlainWithVary",
			path:              "/assets/app.js",
			noCompress:        true,
			wantStatus:        http.StatusOK,
			wantContentType:   jsType,
			wantContentLength: strconv.Itoa(len(script)),
			wantCacheControl:  immutableCacheControl,
			wantVary:          []string{"Accept-Encoding"},
			wantWire:          script,
			wantContent:       script,
		},
		{
			name:             "NoTwin_CompressionDisabled_PlainWithoutVary",
			path:             "/assets/plain.css",
			noCompress:       true,
			headers:          map[string]string{"Accept-Encoding": "gzip"},
			wantStatus:       http.StatusOK,
			wantCacheControl: immutableCacheControl,
			wantWire:         []byte("body{}"),
			wantContent:      []byte("body{}"),
		},
		{
			name:             "Twin_NoAcceptEncoding_Plain",
			path:             "/assets/app.js",
			wantStatus:       http.StatusOK,
			wantContentType:  jsType,
			wantCacheControl: immutableCacheControl,
			wantAcceptRanges: "bytes",
			wantVary:         []string{"Accept-Encoding"},
			wantWire:         script,
			wantContent:      script,
		},
		{
			name:             "Twin_GzipRefused_Plain",
			path:             "/assets/app.js",
			headers:          map[string]string{"Accept-Encoding": "gzip;q=0, br"},
			wantStatus:       http.StatusOK,
			wantContentType:  jsType,
			wantCacheControl: immutableCacheControl,
			wantVary:         []string{"Accept-Encoding"},
			wantWire:         script,
			wantContent:      script,
		},
		{
			name:             "Twin_OnlyBrotliAccepted_Plain",
			path:             "/assets/app.js",
			headers:          map[string]string{"Accept-Encoding": "br"},
			wantStatus:       http.StatusOK,
			wantContentType:  jsType,
			wantCacheControl: immutableCacheControl,
			wantVary:         []string{"Accept-Encoding"},
			wantWire:         script,
			wantContent:      script,
		},
		{
			name:             "Twin_Range_PlainSlice",
			path:             "/assets/app.js",
			headers:          map[string]string{"Accept-Encoding": "gzip", "Range": "bytes=0-9"},
			wantStatus:       http.StatusPartialContent,
			wantContentType:  jsType,
			wantCacheControl: immutableCacheControl,
			wantVary:         []string{"Accept-Encoding"},
			wantWire:         script[:10],
			wantContent:      script[:10],
		},
		{
			name:             "Twin_Post_CompressionDisabled_Plain",
			method:           http.MethodPost,
			path:             "/assets/app.js",
			noCompress:       true,
			headers:          map[string]string{"Accept-Encoding": "gzip"},
			wantStatus:       http.StatusOK,
			wantContentType:  jsType,
			wantCacheControl: immutableCacheControl,
			wantWire:         script,
			wantContent:      script,
		},
		{
			name:              "Twin_Head_HeadersOnly",
			method:            http.MethodHead,
			path:              "/assets/app.js",
			headers:           map[string]string{"Accept-Encoding": "gzip"},
			wantStatus:        http.StatusOK,
			wantEncoding:      "gzip",
			wantContentType:   jsType,
			wantContentLength: strconv.Itoa(len(scriptTwin)),
			wantCacheControl:  immutableCacheControl,
			wantVary:          []string{"Accept-Encoding"},
			wantWire:          []byte{},
			wantContent:       []byte{},
		},
		{
			name:             "Twin_IfModifiedSince_NotModified",
			path:             "/assets/app.js",
			headers:          map[string]string{"Accept-Encoding": "gzip", "If-Modified-Since": time.Now().Add(time.Hour).UTC().Format(http.TimeFormat)},
			wantStatus:       http.StatusNotModified,
			wantCacheControl: immutableCacheControl,
			wantVary:         []string{"Accept-Encoding"},
			wantWire:         []byte{},
			wantContent:      []byte{},
		},
		{
			name:             "Twin_IfUnmodifiedSinceFails_PreconditionFailedWithoutBody",
			path:             "/assets/app.js",
			headers:          map[string]string{"Accept-Encoding": "gzip", "If-Unmodified-Since": time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC).Format(http.TimeFormat)},
			wantStatus:       http.StatusPreconditionFailed,
			wantCacheControl: immutableCacheControl,
			wantVary:         []string{"Accept-Encoding"},
			wantWire:         []byte{},
			wantContent:      []byte{},
		},
		{
			name:             "Twin_SizeMismatch_Plain",
			path:             "/assets/stale.js",
			headers:          map[string]string{"Accept-Encoding": "gzip"},
			wantStatus:       http.StatusOK,
			wantContentType:  jsType,
			wantCacheControl: immutableCacheControl,
			wantVary:         []string{"Accept-Encoding"},
			wantWire:         []byte("export const v=22;"),
			wantContent:      []byte("export const v=22;"),
		},
		{
			name:             "Twin_TrailingSlash_RedirectsWithoutImmutable",
			path:             "/assets/app.js/",
			headers:          map[string]string{"Accept-Encoding": "gzip"},
			wantStatus:       http.StatusMovedPermanently,
			wantCacheControl: "max-age=0,no-cache,private,must-revalidate",
			wantVary:         []string{"Accept-Encoding"},
		},
		{
			name:             "Twin_DotDotOutOfAssets_NotImmutable",
			path:             "/assets/%2e%2e/manifest.json",
			headers:          map[string]string{"Accept-Encoding": "gzip"},
			wantStatus:       http.StatusOK,
			wantEncoding:     "gzip",
			wantContentType:  mime.TypeByExtension(".json"),
			wantCacheControl: "max-age=0,no-cache,private,must-revalidate",
			wantVary:         []string{"Accept-Encoding"},
			wantContent:      manifest,
			wantLayers:       1,
		},
		{
			name:             "NoTwin_AcceptsGzip_Plain",
			path:             "/assets/plain.css",
			headers:          map[string]string{"Accept-Encoding": "gzip"},
			wantStatus:       http.StatusOK,
			wantCacheControl: immutableCacheControl,
			wantVary:         []string{"Accept-Encoding"},
			wantWire:         []byte("body{}"),
			wantContent:      []byte("body{}"),
		},
		{
			name:             "Twin_UnknownExtension_Plain",
			path:             "/assets/data.unknown",
			headers:          map[string]string{"Accept-Encoding": "gzip"},
			wantStatus:       http.StatusOK,
			wantCacheControl: immutableCacheControl,
			wantVary:         []string{"Accept-Encoding"},
			wantWire:         []byte("unknown"),
			wantContent:      []byte("unknown"),
		},
		{
			name:             "IndexFile_Redirects",
			path:             "/index.html",
			headers:          map[string]string{"Accept-Encoding": "gzip"},
			wantStatus:       http.StatusMovedPermanently,
			wantCacheControl: "max-age=0,no-cache,private,must-revalidate",
			wantVary:         []string{"Accept-Encoding"},
			wantWire:         nil,
		},
		{
			name:             "Root_ServesTemplatedIndexNotTwin",
			path:             "/",
			headers:          map[string]string{"Accept-Encoding": "gzip"},
			wantStatus:       http.StatusOK,
			wantEncoding:     "gzip",
			wantContentType:  "text/html; charset=utf-8",
			wantCacheControl: "max-age=0,no-cache,private,must-revalidate",
			wantVary:         []string{"Accept-Encoding"},
			wantContent:      []byte(rootIndex),
			wantLayers:       1,
		},
		{
			name:             "MissingAsset_FallsBackToIndexWithoutImmutable",
			path:             "/assets/missing.js",
			headers:          map[string]string{"Accept-Encoding": "gzip"},
			wantStatus:       http.StatusOK,
			wantEncoding:     "gzip",
			wantContentType:  "text/html; charset=utf-8",
			wantCacheControl: "max-age=0,no-cache,private,must-revalidate",
			wantVary:         []string{"Accept-Encoding"},
			wantContent:      []byte(rootIndex),
			wantLayers:       1,
		},
		{
			name:              "BasePath_Twin_AcceptsGzip_Served",
			path:              "/signoz/assets/app.js",
			externalPath:      "/signoz",
			headers:           map[string]string{"Accept-Encoding": "gzip"},
			wantStatus:        http.StatusOK,
			wantEncoding:      "gzip",
			wantContentType:   jsType,
			wantContentLength: strconv.Itoa(len(scriptTwin)),
			wantCacheControl:  immutableCacheControl,
			wantVary:          []string{"Accept-Encoding"},
			wantWire:          scriptTwin,
			wantContent:       script,
			wantLayers:        1,
		},
		{
			name:             "BasePath_MissingAsset_FallsBackToIndexWithBaseHref",
			path:             "/signoz/assets/missing.js",
			externalPath:     "/signoz",
			headers:          map[string]string{"Accept-Encoding": "gzip"},
			wantStatus:       http.StatusOK,
			wantEncoding:     "gzip",
			wantContentType:  "text/html; charset=utf-8",
			wantCacheControl: "max-age=0,no-cache,private,must-revalidate",
			wantVary:         []string{"Accept-Encoding"},
			wantContent:      []byte(prefixedIndex),
			wantLayers:       1,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			t.Parallel()

			server := newWebServer(t, directory, testCase.externalPath, !testCase.noCompress)

			method := testCase.method
			if method == "" {
				method = http.MethodGet
			}

			req, err := http.NewRequest(method, server.URL+testCase.path, nil)
			require.NoError(t, err)
			for key, value := range testCase.headers {
				req.Header.Set(key, value)
			}

			client := &http.Client{
				Transport:     &http.Transport{DisableCompression: true},
				CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse },
			}
			res, err := client.Do(req)
			require.NoError(t, err)
			defer func() { _ = res.Body.Close() }()

			body, err := io.ReadAll(res.Body)
			require.NoError(t, err)

			assert.Equal(t, testCase.wantStatus, res.StatusCode)
			assert.Equal(t, testCase.wantEncoding, res.Header.Get("Content-Encoding"))
			assert.Equal(t, testCase.wantCacheControl, res.Header.Get("Cache-Control"))
			assert.Equal(t, testCase.wantVary, res.Header.Values("Vary"))
			if testCase.wantAcceptRanges != "" {
				assert.Equal(t, testCase.wantAcceptRanges, res.Header.Get("Accept-Ranges"))
			}
			if testCase.wantContentType != "" {
				assert.Equal(t, testCase.wantContentType, res.Header.Get("Content-Type"))
			}
			if testCase.wantContentLength != "" {
				assert.Equal(t, testCase.wantContentLength, res.Header.Get("Content-Length"))
			}
			if testCase.wantWire != nil {
				assert.Equal(t, testCase.wantWire, body)
			}

			layers, content := gunzipLayers(t, body)
			assert.Equal(t, testCase.wantLayers, layers)
			if testCase.wantContent != nil {
				assert.Equal(t, testCase.wantContent, content)
			}
		})
	}
}

func TestServePrecompressedLastModified(t *testing.T) {
	t.Parallel()

	script := bytes.Repeat([]byte("export const a=1;\n"), 400)
	directory := t.TempDir()
	require.NoError(t, os.MkdirAll(filepath.Join(directory, "assets"), 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(directory, "index.html"), newIndex("index"), 0o644))
	require.NoError(t, os.WriteFile(filepath.Join(directory, "assets", "app.js"), script, 0o644))
	require.NoError(t, os.WriteFile(filepath.Join(directory, "assets", "app.js.gz"), gzipBest(t, script), 0o644))

	plainTime := time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC)
	twinTime := time.Date(2026, 1, 2, 3, 5, 6, 0, time.UTC)
	require.NoError(t, os.Chtimes(filepath.Join(directory, "assets", "app.js"), plainTime, plainTime))
	require.NoError(t, os.Chtimes(filepath.Join(directory, "assets", "app.js.gz"), twinTime, twinTime))

	server := newWebServer(t, directory, "", true)

	testCases := []struct {
		name           string
		acceptEncoding string
		wantModified   time.Time
	}{
		{name: "AcceptsGzip_TwinModTime", acceptEncoding: "gzip", wantModified: twinTime},
		{name: "NoAcceptEncoding_PlainModTime", acceptEncoding: "", wantModified: plainTime},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			req, err := http.NewRequest(http.MethodGet, server.URL+"/assets/app.js", nil)
			require.NoError(t, err)
			if testCase.acceptEncoding != "" {
				req.Header.Set("Accept-Encoding", testCase.acceptEncoding)
			}

			res, err := (&http.Client{Transport: &http.Transport{DisableCompression: true}}).Do(req)
			require.NoError(t, err)
			defer func() { _ = res.Body.Close() }()

			assert.Equal(t, testCase.wantModified.Format(http.TimeFormat), res.Header.Get("Last-Modified"))
		})
	}
}

func TestServePrecompressedCustomIndex(t *testing.T) {
	t.Parallel()

	directory := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(directory, "index.html"), []byte("untemplated"), 0o644))
	require.NoError(t, os.WriteFile(filepath.Join(directory, "index.html.gz"), gzipBest(t, []byte("untemplated")), 0o644))

	req := httptest.NewRequest(http.MethodGet, "/index.html", nil)
	req.Header.Set("Accept-Encoding", "gzip")
	rec := httptest.NewRecorder()
	newPrecompressedHandler(http.Dir(directory), "main.html").ServeHTTP(rec, req)

	assert.Equal(t, http.StatusMovedPermanently, rec.Code)
	assert.Empty(t, rec.Header().Get("Content-Encoding"))
}

func TestAcceptsGzip(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		name   string
		header string
		want   bool
	}{
		{name: "Empty", header: "", want: false},
		{name: "Gzip", header: "gzip", want: true},
		{name: "Gzip_UpperCase", header: "GZIP", want: true},
		{name: "Gzip_AmongOthers", header: "gzip, deflate, br, zstd", want: true},
		{name: "Gzip_LowQuality", header: "br, gzip;q=0.5", want: true},
		{name: "Gzip_ZeroQuality", header: "gzip;q=0", want: false},
		{name: "Gzip_ZeroQualityWithSpaces", header: "gzip; q=0.0", want: false},
		{name: "Gzip_InvalidQuality", header: "gzip;q=notanumber", want: true},
		{name: "Gzip_ZeroQualityAfterOtherParam", header: "gzip;level=1;q=0", want: false},
		{name: "Star", header: "*", want: true},
		{name: "Star_ZeroQuality", header: "*;q=0", want: false},
		{name: "Star_LowQuality", header: "deflate, *;q=0.1", want: true},
		{name: "Gzip_RefusedOverridesStar", header: "gzip;q=0, *", want: false},
		{name: "Identity", header: "identity", want: false},
		{name: "Brotli", header: "br", want: false},
		{name: "XGzip", header: "x-gzip", want: false},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			t.Parallel()

			assert.Equal(t, testCase.want, acceptsGzip(testCase.header))
		})
	}
}
