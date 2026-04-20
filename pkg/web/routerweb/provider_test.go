package routerweb

import (
	"context"
	"io"
	"net"
	"net/http"
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

	testCases := []struct {
		name         string
		path         string
		globalConfig global.Config
		expected     string
	}{
		{
			name:         "RootBaseHrefAtRoot",
			path:         "/",
			globalConfig: global.Config{},
			expected:     `<html><head><base href="/" /></head><body>Welcome to test data!!!</body></html>`,
		},
		{
			name:         "RootBaseHrefAtNonExistentPath",
			path:         "/does-not-exist",
			globalConfig: global.Config{},
			expected:     `<html><head><base href="/" /></head><body>Welcome to test data!!!</body></html>`,
		},
		{
			name:         "RootBaseHrefAtDirectory",
			path:         "/assets",
			globalConfig: global.Config{},
			expected:     `<html><head><base href="/" /></head><body>Welcome to test data!!!</body></html>`,
		},
		{
			name:         "SubPathBaseHrefAtRoot",
			path:         "/",
			globalConfig: global.Config{ExternalURL: &url.URL{Scheme: "https", Host: "example.com", Path: "/signoz"}},
			expected:     `<html><head><base href="/signoz/" /></head><body>Welcome to test data!!!</body></html>`,
		},
		{
			name:         "SubPathBaseHrefAtNonExistentPath",
			path:         "/does-not-exist",
			globalConfig: global.Config{ExternalURL: &url.URL{Scheme: "https", Host: "example.com", Path: "/signoz"}},
			expected:     `<html><head><base href="/signoz/" /></head><body>Welcome to test data!!!</body></html>`,
		},
		{
			name:         "SubPathBaseHrefAtDirectory",
			path:         "/assets",
			globalConfig: global.Config{ExternalURL: &url.URL{Scheme: "https", Host: "example.com", Path: "/signoz"}},
			expected:     `<html><head><base href="/signoz/" /></head><body>Welcome to test data!!!</body></html>`,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			base := startServer(t, web.Config{Index: "valid_template.html", Directory: "testdata"}, testCase.globalConfig)

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
