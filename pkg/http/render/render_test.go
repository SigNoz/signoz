package render

import (
	"context"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
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
	defer func() {
		require.NoError(t, res.Body.Close())
	}()

	actual, err := io.ReadAll(res.Body)
	require.NoError(t, err)

	assert.Equal(t, http.StatusAccepted, res.StatusCode)
	assert.Equal(t, expected, actual)
}

func TestErrorCodeFromBody(t *testing.T) {
	testCases := []struct {
		name     string
		body     []byte
		wantCode string
	}{
		{
			name:     "ValidErrorResponse",
			body:     []byte(`{"status":"error","error":{"code":"authz_forbidden","message":"only admins can access this resource"}}`),
			wantCode: "authz_forbidden",
		},
		{
			name:     "InvalidJSON",
			body:     []byte(`not json`),
			wantCode: "unset",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.wantCode, ErrorCodeFromBody(testCase.body))
		})
	}
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
			expected:   []byte(`{"status":"error","error":{"type":"already-exists","code":"already_exists","message":"already exists","url":"https://already_exists"}}`),
		},
		"/unauthenticated": {
			name:       "Unauthenticated",
			statusCode: http.StatusUnauthorized,
			err:        errors.New(errors.TypeUnauthenticated, errors.MustNewCode("not_allowed"), "not allowed").WithUrl("https://unauthenticated").WithAdditional("a1", "a2"),
			expected:   []byte(`{"status":"error","error":{"type":"unauthenticated","code":"not_allowed","message":"not allowed","url":"https://unauthenticated","errors":[{"message":"a1"},{"message":"a2"}]}}`),
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
			defer func() {
				require.NoError(t, res.Body.Close())
			}()

			actual, err := io.ReadAll(res.Body)
			require.NoError(t, err)

			assert.Equal(t, tc.statusCode, res.StatusCode)
			assert.Equal(t, tc.expected, actual)
		})
	}

}

// TestErrorRetryAfterHeader verifies that the HTTP Retry-After header is set
// when (and only when) the error declares an explicit WithRetryAfter delay.
// Other retry policies (backoff, after_fix, after_auth, never) and bare errors
// without any policy must NOT emit the header — clients ignore non-numeric or
// missing values, but emitting one wrongly would mislead retry libraries.
func TestErrorRetryAfterHeader(t *testing.T) {
	testCases := map[string]struct {
		name                string
		err                 error
		wantRetryAfter      string // expected header value; "" means header must be absent
		wantBodyContains    string // substring that must appear in the JSON body
		wantBodyNotContains string // substring that must NOT appear in the JSON body
	}{
		"/with_retry_after_5s": {
			name:             "ExplicitDelay5Seconds",
			err:              errors.New(errors.TypeTooManyRequests, errors.MustNewCode("rate_limited"), "slow down").WithRetryAfter(5 * time.Second),
			wantRetryAfter:   "5",
			wantBodyContains: `"retry":{"delay":5000000000}`,
		},
		"/with_retry_after_subsecond": {
			name:             "SubSecondRoundsUp",
			err:              errors.New(errors.TypeTooManyRequests, errors.MustNewCode("rate_limited"), "slow down").WithRetryAfter(500 * time.Millisecond),
			wantRetryAfter:   "1", // ceiling-rounded
			wantBodyContains: `"delay":500000000`,
		},
		"/bare_no_policy": {
			name:                "BareErrorNoHeaderNoRetryBlock",
			err:                 errors.New(errors.TypeInternal, errors.MustNewCode("boom"), "boom"),
			wantRetryAfter:      "",
			wantBodyContains:    `"code":"boom"`,
			wantBodyNotContains: `"retry"`,
		},
	}

	srv := httptest.NewServer(http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		if tc, ok := testCases[req.URL.Path]; ok {
			Error(rw, tc.err)
		}
	}))
	defer srv.Close()

	for path, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			res, err := http.Get(srv.URL + path)
			require.NoError(t, err)
			defer func() { require.NoError(t, res.Body.Close()) }()

			body, err := io.ReadAll(res.Body)
			require.NoError(t, err)

			assert.Equal(t, tc.wantRetryAfter, res.Header.Get("Retry-After"),
				"Retry-After header for %s", tc.name)
			if tc.wantBodyContains != "" {
				assert.Contains(t, string(body), tc.wantBodyContains,
					"body should contain %q for %s", tc.wantBodyContains, tc.name)
			}
			if tc.wantBodyNotContains != "" {
				assert.NotContains(t, string(body), tc.wantBodyNotContains,
					"body should NOT contain %q for %s", tc.wantBodyNotContains, tc.name)
			}
		})
	}
}
