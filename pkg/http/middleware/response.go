package middleware

import (
	"bufio"
	"net"
	"net/http"

	"github.com/SigNoz/signoz/pkg/errors"
)

const (
	maxResponseBodyCapture int = 4096 // At most 4k bytes from response bodies.
)

// Wraps an http.ResponseWriter to capture the status code,
// write errors, and (for error responses) a bounded slice of the body.
type responseCapture interface {
	http.ResponseWriter

	// StatusCode returns the HTTP status code written to the response.
	StatusCode() int

	// WriteError returns the error (if any) from the downstream Write call.
	WriteError() error

	// BodyBytes returns the captured response body bytes. Only populated
	// for error responses (status >= 400).
	BodyBytes() []byte
}

func newResponseCapture(rw http.ResponseWriter, buffer *byteBuffer) responseCapture {
	b := nonFlushingResponseCapture{
		rw:            rw,
		buffer:        buffer,
		captureBody:   false,
		bodyBytesLeft: maxResponseBodyCapture,
		statusCode:    http.StatusOK,
	}

	if f, ok := rw.(http.Flusher); ok {
		return &flushingResponseCapture{nonFlushingResponseCapture: b, f: f}
	}

	return &b
}

// byteBuffer is a minimal write-only buffer used to capture response bodies.
type byteBuffer struct {
	buf []byte
}

func (b *byteBuffer) Write(p []byte) (int, error) {
	b.buf = append(b.buf, p...)
	return len(p), nil
}

func (b *byteBuffer) WriteString(s string) (int, error) {
	b.buf = append(b.buf, s...)
	return len(s), nil
}

func (b *byteBuffer) Bytes() []byte {
	return b.buf
}

func (b *byteBuffer) Len() int {
	return len(b.buf)
}

func (b *byteBuffer) String() string {
	return string(b.buf)
}

type nonFlushingResponseCapture struct {
	rw            http.ResponseWriter
	buffer        *byteBuffer
	captureBody   bool
	bodyBytesLeft int
	statusCode    int
	writeError    error
}

type flushingResponseCapture struct {
	nonFlushingResponseCapture
	f http.Flusher
}

// Unwrap is used by http.ResponseController to get access to original http.ResponseWriter.
func (writer *nonFlushingResponseCapture) Unwrap() http.ResponseWriter {
	return writer.rw
}

// Header returns the header map that will be sent by WriteHeader.
func (writer *nonFlushingResponseCapture) Header() http.Header {
	return writer.rw.Header()
}

// WriteHeader writes the HTTP response header.
func (writer *nonFlushingResponseCapture) WriteHeader(statusCode int) {
	writer.statusCode = statusCode
	if statusCode >= 400 {
		writer.captureBody = true
	}

	writer.rw.WriteHeader(statusCode)
}

// Write writes HTTP response data.
func (writer *nonFlushingResponseCapture) Write(data []byte) (int, error) {
	if writer.statusCode == 0 {
		writer.WriteHeader(http.StatusOK)
	}

	if writer.statusCode == 204 {
		return 0, nil
	}

	n, err := writer.rw.Write(data)
	if writer.captureBody {
		writer.captureResponseBody(data)
	}

	if err != nil {
		writer.writeError = err
	}

	return n, err
}

// Hijack hijacks the first response writer that is a Hijacker.
func (writer *nonFlushingResponseCapture) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	hj, ok := writer.rw.(http.Hijacker)
	if ok {
		return hj.Hijack()
	}

	return nil, nil, errors.NewInternalf(errors.CodeInternal, "cannot cast underlying response writer to Hijacker")
}

func (writer *nonFlushingResponseCapture) StatusCode() int {
	return writer.statusCode
}

func (writer *nonFlushingResponseCapture) WriteError() error {
	return writer.writeError
}

func (writer *nonFlushingResponseCapture) BodyBytes() []byte {
	return writer.buffer.Bytes()
}

func (writer *flushingResponseCapture) Flush() {
	writer.f.Flush()
}

func (writer *nonFlushingResponseCapture) captureResponseBody(data []byte) {
	if len(data) > writer.bodyBytesLeft {
		_, _ = writer.buffer.Write(data[:writer.bodyBytesLeft])
		_, _ = writer.buffer.WriteString("...")
		writer.bodyBytesLeft = 0
		writer.captureBody = false
	} else {
		_, _ = writer.buffer.Write(data)
		writer.bodyBytesLeft -= len(data)
	}
}
