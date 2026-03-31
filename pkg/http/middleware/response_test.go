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
		name               string
		handler            http.HandlerFunc
		expectedStatus     int
		expectedBodyBytes  string
		expectedClientBody string
	}{
		{
			name: "Success_DoesNotCaptureBody",
			handler: func(rw http.ResponseWriter, req *http.Request) {
				rw.WriteHeader(http.StatusOK)
				_, _ = rw.Write([]byte(`{"status":"success","data":{"id":"123"}}`))
			},
			expectedStatus:     http.StatusOK,
			expectedBodyBytes:  "",
			expectedClientBody: `{"status":"success","data":{"id":"123"}}`,
		},
		{
			name: "Error_CapturesBody",
			handler: func(rw http.ResponseWriter, req *http.Request) {
				rw.WriteHeader(http.StatusForbidden)
				_, _ = rw.Write([]byte(`{"status":"error","error":{"code":"authz_forbidden","message":"forbidden"}}`))
			},
			expectedStatus:     http.StatusForbidden,
			expectedBodyBytes:  `{"status":"error","error":{"code":"authz_forbidden","message":"forbidden"}}`,
			expectedClientBody: `{"status":"error","error":{"code":"authz_forbidden","message":"forbidden"}}`,
		},
		{
			name: "Error_TruncatesAtMaxCapture",
			handler: func(rw http.ResponseWriter, req *http.Request) {
				rw.WriteHeader(http.StatusInternalServerError)
				_, _ = rw.Write([]byte(strings.Repeat("x", maxResponseBodyCapture+100)))
			},
			expectedStatus:     http.StatusInternalServerError,
			expectedBodyBytes:  strings.Repeat("x", maxResponseBodyCapture) + "...",
			expectedClientBody: strings.Repeat("x", maxResponseBodyCapture+100),
		},
		{
			name: "NoContent_SuppressesWrite",
			handler: func(rw http.ResponseWriter, req *http.Request) {
				rw.WriteHeader(http.StatusNoContent)
				_, _ = rw.Write([]byte("should be suppressed"))
			},
			expectedStatus:     http.StatusNoContent,
			expectedBodyBytes:  "",
			expectedClientBody: "",
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

			assert.Equal(t, testCase.expectedStatus, captured.StatusCode())
			assert.Equal(t, testCase.expectedBodyBytes, string(captured.BodyBytes()))
			assert.Equal(t, testCase.expectedClientBody, string(clientBody))
		})
	}
}
