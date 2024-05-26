package gateway

import (
	"bytes"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGatewayServeHTTP(t *testing.T) {
	testCases := []struct {
		name       string
		method     string
		path       string
		query      string
		body       []byte
		statusCode int
	}{
		{
			name:       "Get",
			method:     http.MethodGet,
			path:       allowedPrefix + "/path1",
			body:       []byte{},
			statusCode: http.StatusOK,
		},
		{
			name:       "Post",
			method:     http.MethodPost,
			path:       allowedPrefix + "/path2",
			body:       []byte("from-post"),
			statusCode: http.StatusOK,
		},
		{
			// No calls will be allowed without the allowedPrefix
			name:       "Post",
			method:     http.MethodPost,
			path:       "/path2",
			body:       []byte("from-post"),
			statusCode: http.StatusNotFound,
		},
		{
			// No calls will be allowed without the allowedPrefix
			name:       "Post",
			method:     http.MethodPost,
			path:       "/path2" + allowedPrefix,
			body:       []byte("from-post"),
			statusCode: http.StatusNotFound,
		},
		{
			// No calls will be allowed without the allowedPrefix
			name:       "Post",
			method:     http.MethodPost,
			path:       "/path2" + allowedPrefix + "/path3",
			body:       []byte("from-post"),
			statusCode: http.StatusNotFound,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("X-Got-Query", r.URL.RawQuery)
				w.Header().Set("X-Got-Path", r.URL.Path)

				reqBody, err := io.ReadAll(r.Body)
				require.NoError(t, err)
				w.Write([]byte(reqBody))
				w.WriteHeader(http.StatusOK)
			}))
			defer backend.Close()

			backendURL, err := url.Parse(backend.URL)
			require.NoError(t, err)
			backendURL.Path = "/subpath"

			gateway, err := NewGateway(backendURL.String())
			require.NoError(t, err)

			frontend := httptest.NewServer(gateway)
			defer frontend.Close()

			req, err := http.NewRequest(tc.method, frontend.URL+RoutePrefix+tc.path, bytes.NewReader([]byte(tc.body)))
			require.NoError(t, err)

			res, err := frontend.Client().Do(req)
			require.NoError(t, err)

			resBody, err := io.ReadAll(res.Body)
			require.NoError(t, err)
			path, err := url.JoinPath("/subpath", tc.path)
			require.NoError(t, err)

			assert.Equal(t, tc.statusCode, res.StatusCode)

			if tc.statusCode == http.StatusOK {
				assert.Equal(t, tc.body, resBody)
				assert.Equal(t, path, res.Header.Get("X-Got-Path"))
				assert.Equal(t, tc.query, res.Header.Get("X-Got-Query"))
			}

		})
	}
}
