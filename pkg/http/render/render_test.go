package render

import (
	"context"
	"fmt"
	"io"
	"net"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/errors"
)

func TestSuccess(t *testing.T) {
	listener, err := net.Listen("tcp", "localhost:0")
	require.NoError(t, err)

	data := map[string]any{
		"int64":  int64(9),
		"string": "string",
		"bool":   true,
	}

	marshalled, err := json.Marshal(data)
	require.NoError(t, err)

	expected := []byte(fmt.Sprintf(`{"status":"success","data":%s}`, string(marshalled)))

	server := &http.Server{
		Handler: http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
			Success(rw, http.StatusAccepted, data)
		}),
	}

	go func() {
		_ = server.Serve(listener)
	}()

	defer func() {
		_ = server.Shutdown(context.Background())
	}()

	req, err := http.NewRequest("GET", "http://"+listener.Addr().String(), nil)
	require.NoError(t, err)

	res, err := http.DefaultClient.Do(req)
	require.NoError(t, err)

	actual, err := io.ReadAll(res.Body)
	require.NoError(t, err)

	assert.Equal(t, http.StatusAccepted, res.StatusCode)
	assert.Equal(t, expected, actual)
}

func TestError(t *testing.T) {
	listener, err := net.Listen("tcp", "localhost:0")
	require.NoError(t, err)

	testCases := map[string]struct {
		name       string
		statusCode int
		err        error
		expected   []byte
	}{
		"/already_exists": {
			name:       "AlreadyExists",
			statusCode: http.StatusConflict,
			err:        errors.New(errors.TypeAlreadyExists, errors.MustNewCode("already_exists"), "already exists").WithUrl("https://already_exists"),
			expected:   []byte(`{"status":"error","error":{"code":"already_exists","message":"already exists","url":"https://already_exists"}}`),
		},
		"/unauthenticated": {
			name:       "Unauthenticated",
			statusCode: http.StatusUnauthorized,
			err:        errors.New(errors.TypeUnauthenticated, errors.MustNewCode("not_allowed"), "not allowed").WithUrl("https://unauthenticated").WithAdditional("a1", "a2"),
			expected:   []byte(`{"status":"error","error":{"code":"not_allowed","message":"not allowed","url":"https://unauthenticated","errors":[{"message":"a1"},{"message":"a2"}]}}`),
		},
	}

	server := &http.Server{
		Handler: http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
			tc, ok := testCases[req.URL.Path]
			if ok {
				Error(rw, tc.err)
				return
			}
		}),
	}

	go func() {
		_ = server.Serve(listener)
	}()

	defer func() {
		_ = server.Shutdown(context.Background())
	}()

	for path, tc := range testCases {
		t.Run("", func(t *testing.T) {
			req, err := http.NewRequest("GET", "http://"+listener.Addr().String()+path, nil)
			require.NoError(t, err)

			res, err := http.DefaultClient.Do(req)
			require.NoError(t, err)

			actual, err := io.ReadAll(res.Body)
			require.NoError(t, err)

			assert.Equal(t, tc.statusCode, res.StatusCode)
			assert.Equal(t, tc.expected, actual)
		})
	}

}
