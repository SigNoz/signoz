package routerweb

import (
	"context"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"testing"

	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/web"
	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestServeHttpWithoutPrefix(t *testing.T) {
	t.Parallel()
	fi, err := os.Open(filepath.Join("testdata", indexFileName))
	require.NoError(t, err)

	expected, err := io.ReadAll(fi)
	require.NoError(t, err)

	web, err := New(context.Background(), factorytest.NewSettings(), web.Config{Prefix: "/", Directory: filepath.Join("testdata")})
	require.NoError(t, err)

	router := mux.NewRouter()
	err = web.AddToRouter(router)
	require.NoError(t, err)

	listener, err := net.Listen("tcp", "localhost:0")
	require.NoError(t, err)

	server := &http.Server{
		Handler: router,
	}

	go func() {
		_ = server.Serve(listener)
	}()
	defer func() {
		_ = server.Close()
	}()

	testCases := []struct {
		name string
		path string
	}{
		{
			name: "Root",
			path: "/",
		},
		{
			name: "Index",
			path: "/" + indexFileName,
		},
		{
			name: "DoesNotExist",
			path: "/does-not-exist",
		},
		{
			name: "Directory",
			path: "/assets",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			res, err := http.DefaultClient.Get("http://" + listener.Addr().String() + tc.path)
			require.NoError(t, err)

			defer func() {
				_ = res.Body.Close()
			}()

			actual, err := io.ReadAll(res.Body)
			require.NoError(t, err)

			assert.Equal(t, expected, actual)
		})
	}

}

func TestCatchAllResponsesUseNoStore(t *testing.T) {
	t.Parallel()

	web, err := New(context.Background(), factorytest.NewSettings(), web.Config{Prefix: "/", Directory: filepath.Join("testdata")})
	require.NoError(t, err)

	router := mux.NewRouter()
	err = web.AddToRouter(router)
	require.NoError(t, err)

	listener, err := net.Listen("tcp", "localhost:0")
	require.NoError(t, err)

	server := &http.Server{
		Handler: router,
	}

	go func() {
		_ = server.Serve(listener)
	}()
	defer func() {
		_ = server.Close()
	}()

	testCases := []struct {
		name           string
		path           string
		expectNoStore  bool
	}{
		{
			name:          "CatchAllForUnknownPath",
			path:          "/does-not-exist",
			expectNoStore: true,
		},
		{
			name:          "CatchAllForAPILikePath",
			path:          "/api/v3/licenses/active",
			expectNoStore: true,
		},
		{
			name:          "CatchAllForDirectory",
			path:          "/assets",
			expectNoStore: true,
		},
		{
			name:          "StaticFile",
			path:          "/assets/index.css",
			expectNoStore: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			res, err := http.DefaultClient.Get("http://" + listener.Addr().String() + tc.path)
			require.NoError(t, err)

			defer func() {
				_ = res.Body.Close()
			}()

			cacheControl := res.Header.Get("Cache-Control")
			if tc.expectNoStore {
				assert.Equal(t, "no-store", cacheControl,
					"catch-all responses serving index.html must use no-store to prevent cache poisoning")
			} else {
				assert.NotEqual(t, "no-store", cacheControl,
					"static file responses should use the cache middleware headers, not no-store")
				assert.Contains(t, cacheControl, "no-cache",
					"static file responses should contain no-cache from the cache middleware")
			}
		})
	}
}

func TestServeHttpWithPrefix(t *testing.T) {
	t.Parallel()
	fi, err := os.Open(filepath.Join("testdata", indexFileName))
	require.NoError(t, err)

	expected, err := io.ReadAll(fi)
	require.NoError(t, err)

	web, err := New(context.Background(), factorytest.NewSettings(), web.Config{Prefix: "/web", Directory: filepath.Join("testdata")})
	require.NoError(t, err)

	router := mux.NewRouter()
	err = web.AddToRouter(router)
	require.NoError(t, err)

	listener, err := net.Listen("tcp", "localhost:0")
	require.NoError(t, err)

	server := &http.Server{
		Handler: router,
	}

	go func() {
		_ = server.Serve(listener)
	}()
	defer func() {
		_ = server.Close()
	}()

	testCases := []struct {
		name  string
		path  string
		found bool
	}{
		{
			name:  "Root",
			path:  "/web",
			found: true,
		},
		{
			name:  "Index",
			path:  "/web/" + indexFileName,
			found: true,
		},
		{
			name:  "FileDoesNotExist",
			path:  "/web/does-not-exist",
			found: true,
		},
		{
			name:  "Directory",
			path:  "/web/assets",
			found: true,
		},
		{
			name:  "DoesNotExist",
			path:  "/does-not-exist",
			found: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			res, err := http.DefaultClient.Get("http://" + listener.Addr().String() + tc.path)
			require.NoError(t, err)

			defer func() {
				_ = res.Body.Close()
			}()

			if tc.found {
				actual, err := io.ReadAll(res.Body)
				require.NoError(t, err)

				assert.Equal(t, expected, actual)
			} else {
				assert.Equal(t, http.StatusNotFound, res.StatusCode)
			}

		})
	}

}
