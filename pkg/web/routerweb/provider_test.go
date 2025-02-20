package routerweb

import (
	"context"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"testing"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/factory/factorytest"
	"go.signoz.io/signoz/pkg/web"
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
