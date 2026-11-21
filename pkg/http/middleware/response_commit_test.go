package middleware

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestResponseCaptureCommittedResponse(t *testing.T) {
	tests := []struct {
		name         string
		handler      func(responseCapture)
		forceCapture bool
		status       int
		body         string
		captured     string
	}{
		{
			name: "implicit success captures requested body", forceCapture: true,
			handler: func(writer responseCapture) { _, _ = writer.Write([]byte("created")) },
			status:  http.StatusOK, body: "created", captured: "created",
		},
		{
			name: "implicit success ignores later error",
			handler: func(writer responseCapture) {
				_, _ = writer.Write([]byte("ok"))
				writer.WriteHeader(http.StatusInternalServerError)
				_, _ = writer.Write([]byte("later"))
			},
			status: http.StatusOK, body: "oklater",
		},
		{
			name: "first final status wins",
			handler: func(writer responseCapture) {
				writer.WriteHeader(http.StatusForbidden)
				writer.WriteHeader(http.StatusOK)
				_, _ = writer.Write([]byte("denied"))
			},
			status: http.StatusForbidden, body: "denied", captured: "denied",
		},
		{
			name: "flush commits success",
			handler: func(writer responseCapture) {
				writer.(http.Flusher).Flush()
				writer.WriteHeader(http.StatusInternalServerError)
				_, _ = writer.Write([]byte("ok"))
			},
			status: http.StatusOK, body: "ok",
		},
		{
			name: "flush captures requested body", forceCapture: true,
			handler: func(writer responseCapture) {
				writer.(http.Flusher).Flush()
				_, _ = writer.Write([]byte("created"))
			},
			status: http.StatusOK, body: "created", captured: "created",
		},
		{
			name: "early hints then implicit success", forceCapture: true,
			handler: func(writer responseCapture) {
				writer.WriteHeader(http.StatusEarlyHints)
				_, _ = writer.Write([]byte("ok"))
			},
			status: http.StatusOK, body: "ok", captured: "ok",
		},
		{
			name: "early hints then error",
			handler: func(writer responseCapture) {
				writer.WriteHeader(http.StatusEarlyHints)
				writer.WriteHeader(http.StatusForbidden)
				_, _ = writer.Write([]byte("denied"))
			},
			status: http.StatusForbidden, body: "denied", captured: "denied",
		},
		{
			name: "repeated header does not restart bounded capture",
			handler: func(writer responseCapture) {
				writer.WriteHeader(http.StatusForbidden)
				_, _ = writer.Write([]byte(strings.Repeat("x", maxResponseBodyCapture+1)))
				writer.WriteHeader(http.StatusForbidden)
				_, _ = writer.Write([]byte("later"))
			},
			status:   http.StatusForbidden,
			body:     strings.Repeat("x", maxResponseBodyCapture+1) + "later",
			captured: strings.Repeat("x", maxResponseBodyCapture) + "...",
		},
		{
			name:    "empty handler defaults to success",
			handler: func(writer responseCapture) {},
			status:  http.StatusOK,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			type result struct {
				status int
				body   string
			}
			captured := make(chan result, 1)
			server := httptest.NewServer(http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
				writer := newResponseCapture(rw, &byteBuffer{})
				if test.forceCapture {
					writer.EnableBodyCapture()
				}
				test.handler(writer)
				captured <- result{writer.StatusCode(), string(writer.BodyBytes())}
			}))
			defer server.Close()
			response, err := server.Client().Get(server.URL)
			require.NoError(t, err)
			defer response.Body.Close()
			body, err := io.ReadAll(response.Body)
			require.NoError(t, err)
			got := <-captured
			assert.Equal(t, test.status, response.StatusCode)
			assert.Equal(t, test.status, got.status)
			assert.Equal(t, test.body, string(body))
			assert.Equal(t, test.captured, got.body)
		})
	}
}

func TestResponseCaptureImplicitWritePreservesContentType(t *testing.T) {
	recorder := httptest.NewRecorder()
	writer := newResponseCapture(recorder, &byteBuffer{})
	_, err := writer.Write([]byte("<html><body>ok</body></html>"))
	require.NoError(t, err)
	assert.Equal(t, "text/html; charset=utf-8", recorder.Header().Get("Content-Type"))
}

func TestResponseCaptureWithoutFlusher(t *testing.T) {
	recorder := httptest.NewRecorder()
	// Expose only ResponseWriter, without the recorder's optional Flush method.
	underlying := struct{ http.ResponseWriter }{recorder}
	writer := newResponseCapture(underlying, &byteBuffer{})
	_, flushes := writer.(http.Flusher)
	assert.False(t, flushes)
	writer.EnableBodyCapture()
	_, err := writer.Write([]byte("created"))
	require.NoError(t, err)
	writer.WriteHeader(http.StatusInternalServerError)
	assert.Equal(t, http.StatusOK, writer.StatusCode())
	assert.Equal(t, http.StatusOK, recorder.Code)
	assert.Equal(t, "created", string(writer.BodyBytes()))
}

func TestResponseCaptureSwitchingProtocolsIsFinal(t *testing.T) {
	recorder := httptest.NewRecorder()
	writer := newResponseCapture(recorder, &byteBuffer{})
	writer.WriteHeader(http.StatusSwitchingProtocols)
	writer.WriteHeader(http.StatusInternalServerError)
	assert.Equal(t, http.StatusSwitchingProtocols, writer.StatusCode())
	assert.Equal(t, http.StatusSwitchingProtocols, recorder.Code)
}
