package middleware

import (
	"bufio"
	"bytes"
	"compress/gzip"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func gzipPayload(t *testing.T, payload []byte) []byte {
	t.Helper()

	var buf bytes.Buffer
	writer := gzip.NewWriter(&buf)
	_, err := writer.Write(payload)
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

func newCompressClient() *http.Client {
	return &http.Client{Transport: &http.Transport{DisableCompression: true}}
}

func TestCompress(t *testing.T) {
	t.Parallel()

	large := []byte(strings.Repeat(`{"status":"ok","value":12345}`, 200))
	small := []byte(`{"status":"ok"}`)

	testCases := []struct {
		name           string
		disabled       bool
		accept         string
		acceptEncoding string
		contentType    string
		contentRange   string
		status         int
		payload        []byte
		encoded        bool
		wantEncoding   string
		wantLayers     int
	}{
		{
			name:           "JSON_AcceptsGzip_Compressed",
			acceptEncoding: "gzip",
			contentType:    "application/json",
			status:         http.StatusOK,
			payload:        large,
			wantEncoding:   "gzip",
			wantLayers:     1,
		},
		{
			name:         "JSON_NoAcceptEncoding_Plain",
			contentType:  "application/json",
			status:       http.StatusOK,
			payload:      large,
			wantEncoding: "",
			wantLayers:   0,
		},
		{
			name:           "JSON_Small_Plain",
			acceptEncoding: "gzip",
			contentType:    "application/json",
			status:         http.StatusOK,
			payload:        small,
			wantEncoding:   "",
			wantLayers:     0,
		},
		{
			name:           "AlreadyEncoded_NotCompressedAgain",
			acceptEncoding: "gzip",
			contentType:    "text/javascript",
			status:         http.StatusOK,
			payload:        large,
			encoded:        true,
			wantEncoding:   "gzip",
			wantLayers:     1,
		},
		{
			name:           "PNG_Plain",
			acceptEncoding: "gzip",
			contentType:    "image/png",
			status:         http.StatusOK,
			payload:        large,
			wantEncoding:   "",
			wantLayers:     0,
		},
		{
			name:           "WOFF2_Plain",
			acceptEncoding: "gzip",
			contentType:    "font/woff2",
			status:         http.StatusOK,
			payload:        large,
			wantEncoding:   "",
			wantLayers:     0,
		},
		{
			name:           "SVG_Compressed",
			acceptEncoding: "gzip",
			contentType:    "image/svg+xml",
			status:         http.StatusOK,
			payload:        large,
			wantEncoding:   "gzip",
			wantLayers:     1,
		},
		{
			name:           "JSON_AcceptsJSON_Compressed",
			accept:         "application/json, text/plain, */*",
			acceptEncoding: "gzip",
			contentType:    "application/json",
			status:         http.StatusOK,
			payload:        large,
			wantEncoding:   "gzip",
			wantLayers:     1,
		},
		{
			name:           "EventStream_AcceptsEventStream_Plain",
			accept:         "text/event-stream",
			acceptEncoding: "gzip",
			contentType:    "text/event-stream",
			status:         http.StatusOK,
			payload:        large,
			wantEncoding:   "",
			wantLayers:     0,
		},
		{
			name:           "Disabled_AcceptsGzip_Plain",
			disabled:       true,
			acceptEncoding: "gzip",
			contentType:    "application/json",
			status:         http.StatusOK,
			payload:        large,
			wantEncoding:   "",
			wantLayers:     0,
		},
		{
			name:           "Disabled_AlreadyEncoded_Untouched",
			disabled:       true,
			acceptEncoding: "gzip",
			contentType:    "text/javascript",
			status:         http.StatusOK,
			payload:        large,
			encoded:        true,
			wantEncoding:   "gzip",
			wantLayers:     1,
		},
		{
			name:           "PartialContent_Plain",
			acceptEncoding: "gzip",
			contentType:    "application/json",
			contentRange:   "bytes 0-5999/9000",
			status:         http.StatusPartialContent,
			payload:        large,
			wantEncoding:   "",
			wantLayers:     0,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			t.Parallel()

			compress, err := NewCompress(!testCase.disabled, gzip.DefaultCompression)
			require.NoError(t, err)

			wire := testCase.payload
			if testCase.encoded {
				wire = gzipPayload(t, testCase.payload)
			}

			seen := make(chan string, 1)
			server := httptest.NewServer(compress.Wrap(http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
				seen <- req.Header.Get("Accept-Encoding")
				rw.Header().Set("Content-Type", testCase.contentType)
				if testCase.encoded {
					rw.Header().Set("Content-Encoding", "gzip")
				}
				if testCase.contentRange != "" {
					rw.Header().Set("Content-Range", testCase.contentRange)
				}
				rw.WriteHeader(testCase.status)
				_, _ = rw.Write(wire)
			})))
			t.Cleanup(server.Close)

			req, err := http.NewRequest(http.MethodGet, server.URL, nil)
			require.NoError(t, err)
			if testCase.accept != "" {
				req.Header.Set("Accept", testCase.accept)
			}
			if testCase.acceptEncoding != "" {
				req.Header.Set("Accept-Encoding", testCase.acceptEncoding)
			}

			res, err := newCompressClient().Do(req)
			require.NoError(t, err)
			defer func() { _ = res.Body.Close() }()

			body, err := io.ReadAll(res.Body)
			require.NoError(t, err)

			assert.Equal(t, testCase.status, res.StatusCode)
			assert.Equal(t, testCase.wantEncoding, res.Header.Get("Content-Encoding"))
			assert.Equal(t, testCase.acceptEncoding, <-seen)

			layers, plain := gunzipLayers(t, body)
			assert.Equal(t, testCase.wantLayers, layers)
			assert.Equal(t, testCase.payload, plain)
		})
	}
}

func TestCompressFlushesStream(t *testing.T) {
	t.Parallel()

	compress, err := NewCompress(true, gzip.DefaultCompression)
	require.NoError(t, err)

	release := make(chan struct{})
	server := httptest.NewServer(compress.Wrap(http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		rw.Header().Set("Content-Type", "text/event-stream")
		_, _ = rw.Write([]byte("data: first\n\n"))
		rw.(http.Flusher).Flush()

		select {
		case <-release:
		case <-req.Context().Done():
			return
		}

		_, _ = rw.Write([]byte("data: second\n\n"))
	})))
	t.Cleanup(server.Close)

	req, err := http.NewRequest(http.MethodGet, server.URL, nil)
	require.NoError(t, err)
	req.Header.Set("Accept-Encoding", "gzip")

	res, err := newCompressClient().Do(req)
	require.NoError(t, err)
	defer func() { _ = res.Body.Close() }()
	require.Equal(t, "gzip", res.Header.Get("Content-Encoding"))

	reader, err := gzip.NewReader(res.Body)
	require.NoError(t, err)
	lines := bufio.NewReader(reader)

	first := make(chan string, 1)
	go func() {
		line, _ := lines.ReadString('\n')
		first <- line
	}()

	select {
	case line := <-first:
		assert.Equal(t, "data: first\n", line)
	case <-time.After(5 * time.Second):
		t.Fatal("first event was not flushed before the handler finished")
	}

	close(release)
	rest, err := io.ReadAll(lines)
	require.NoError(t, err)
	assert.Equal(t, "\ndata: second\n\n", string(rest))
}

func TestCompressEventStreamSendsHeaders(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		name   string
		accept string
	}{
		{name: "Exact", accept: "text/event-stream"},
		{name: "MixedCase", accept: "Text/Event-Stream"},
		{name: "WithParams", accept: "text/event-stream;q=0.9"},
		{name: "InList_WildcardLast", accept: "text/event-stream, */*;q=0.1"},
		{name: "InList_WildcardFirst", accept: "application/json, */*;q=0.5 , text/event-stream"},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			t.Parallel()

			compress, err := NewCompress(true, gzip.DefaultCompression)
			require.NoError(t, err)

			release := make(chan struct{})
			server := httptest.NewServer(compress.Wrap(http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
				rw.Header().Set("Content-Type", "text/event-stream")
				rw.WriteHeader(http.StatusOK)
				rw.(http.Flusher).Flush()

				select {
				case <-release:
				case <-req.Context().Done():
				}
			})))
			t.Cleanup(server.Close)
			t.Cleanup(func() { close(release) })

			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			defer cancel()

			req, err := http.NewRequestWithContext(ctx, http.MethodGet, server.URL, nil)
			require.NoError(t, err)
			req.Header.Set("Accept", testCase.accept)
			req.Header.Set("Accept-Encoding", "gzip")

			res, err := newCompressClient().Do(req)
			require.NoError(t, err)
			defer func() { _ = res.Body.Close() }()

			assert.Equal(t, http.StatusOK, res.StatusCode)
			assert.Equal(t, "text/event-stream", res.Header.Get("Content-Type"))
			assert.Empty(t, res.Header.Get("Content-Encoding"))
		})
	}
}

func TestNewCompressLevel(t *testing.T) {
	t.Parallel()

	var payload strings.Builder
	for i := range 4000 {
		fmt.Fprintf(&payload, `{"id":%d,"name":"service-%d","latency":%d}`, i*7919%10007, i%97, i*104729%1009)
	}

	size := func(t *testing.T, level int) int {
		compress, err := NewCompress(true, level)
		require.NoError(t, err)

		server := httptest.NewServer(compress.Wrap(http.HandlerFunc(func(rw http.ResponseWriter, _ *http.Request) {
			rw.Header().Set("Content-Type", "application/json")
			_, _ = rw.Write([]byte(payload.String()))
		})))
		t.Cleanup(server.Close)

		req, err := http.NewRequest(http.MethodGet, server.URL, nil)
		require.NoError(t, err)
		req.Header.Set("Accept-Encoding", "gzip")

		res, err := newCompressClient().Do(req)
		require.NoError(t, err)
		defer func() { _ = res.Body.Close() }()

		body, err := io.ReadAll(res.Body)
		require.NoError(t, err)

		return len(body)
	}

	assert.Less(t, size(t, gzip.BestCompression), size(t, gzip.BestSpeed))
}

func TestNewCompressInvalidLevel(t *testing.T) {
	t.Parallel()

	_, err := NewCompress(true, 10)
	assert.Error(t, err)

	_, err = NewCompress(false, 10)
	assert.NoError(t, err)
}
