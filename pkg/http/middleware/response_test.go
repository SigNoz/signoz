package middleware

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestResponseCapture(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		name           string
		handler        http.HandlerFunc
		wantStatus     int
		wantBodyBytes  string
		wantClientBody string
	}{
		{
			name: "Success_DoesNotCaptureBody",
			handler: func(rw http.ResponseWriter, req *http.Request) {
				rw.WriteHeader(http.StatusOK)
				_, _ = rw.Write([]byte(`{"status":"success","data":{"id":"123"}}`))
			},
			wantStatus:     http.StatusOK,
			wantBodyBytes:  "",
			wantClientBody: `{"status":"success","data":{"id":"123"}}`,
		},
		{
			name: "Error_CapturesBody",
			handler: func(rw http.ResponseWriter, req *http.Request) {
				rw.WriteHeader(http.StatusForbidden)
				_, _ = rw.Write([]byte(`{"status":"error","error":{"code":"authz_forbidden","message":"forbidden"}}`))
			},
			wantStatus:     http.StatusForbidden,
			wantBodyBytes:  `{"status":"error","error":{"code":"authz_forbidden","message":"forbidden"}}`,
			wantClientBody: `{"status":"error","error":{"code":"authz_forbidden","message":"forbidden"}}`,
		},
		{
			name: "Error_TruncatesAtMaxCapture",
			handler: func(rw http.ResponseWriter, req *http.Request) {
				rw.WriteHeader(http.StatusInternalServerError)
				_, _ = rw.Write([]byte(strings.Repeat("x", maxResponseBodyCapture+100)))
			},
			wantStatus:     http.StatusInternalServerError,
			wantBodyBytes:  strings.Repeat("x", maxResponseBodyCapture) + "...",
			wantClientBody: strings.Repeat("x", maxResponseBodyCapture+100),
		},
		{
			name: "NoContent_SuppressesWrite",
			handler: func(rw http.ResponseWriter, req *http.Request) {
				rw.WriteHeader(http.StatusNoContent)
				_, _ = rw.Write([]byte("should be suppressed"))
			},
			wantStatus:     http.StatusNoContent,
			wantBodyBytes:  "",
			wantClientBody: "",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			t.Parallel()

			var captured responseCapture
			server := httptest.NewServer(http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
				buf := &byteBuffer{}
				captured = newResponseCapture(rw, buf)
				testCase.handler(captured, req)
			}))
			defer server.Close()

			resp, err := http.Get(server.URL)
			assert.NoError(t, err)
			defer resp.Body.Close()

			clientBody, _ := io.ReadAll(resp.Body)

			assert.Equal(t, testCase.wantStatus, captured.StatusCode())
			assert.Equal(t, testCase.wantBodyBytes, string(captured.BodyBytes()))
			assert.Equal(t, testCase.wantClientBody, string(clientBody))
		})
	}
}
