package middleware

import (
	"bufio"
	"fmt"
	"io"
	"net"
	"net/http"
)

const (
	maxResponseBodyInLogs = 4096 // At most 4k bytes from response bodies in our logs.
)

type badResponseLoggingWriter interface {
	http.ResponseWriter
	// Get the status code.
	StatusCode() int
	// Get the error while writing.
	WriteError() error
}

func newBadResponseLoggingWriter(rw http.ResponseWriter, buffer io.Writer) badResponseLoggingWriter {
	b := nonFlushingBadResponseLoggingWriter{
		rw:            rw,
		buffer:        buffer,
		logBody:       false,
		bodyBytesLeft: maxResponseBodyInLogs,
		statusCode:    http.StatusOK,
	}

	if f, ok := rw.(http.Flusher); ok {
		return &flushingBadResponseLoggingWriter{b, f}
	}

	return &b
}

type nonFlushingBadResponseLoggingWriter struct {
	rw            http.ResponseWriter
	buffer        io.Writer
	logBody       bool
	bodyBytesLeft int
	statusCode    int
	writeError    error // The error returned when downstream Write() fails.
}

// Extends nonFlushingBadResponseLoggingWriter that implements http.Flusher
type flushingBadResponseLoggingWriter struct {
	nonFlushingBadResponseLoggingWriter
	f http.Flusher
}

// Unwrap method is used by http.ResponseController to get access to original http.ResponseWriter.
func (writer *nonFlushingBadResponseLoggingWriter) Unwrap() http.ResponseWriter {
	return writer.rw
}

// Header returns the header map that will be sent by WriteHeader.
// Implements ResponseWriter.
func (writer *nonFlushingBadResponseLoggingWriter) Header() http.Header {
	return writer.rw.Header()
}

// WriteHeader writes the HTTP response header.
func (writer *nonFlushingBadResponseLoggingWriter) WriteHeader(statusCode int) {
	writer.statusCode = statusCode
	if statusCode >= 500 || statusCode == 400 {
		writer.logBody = true
	}
	writer.rw.WriteHeader(statusCode)
}

// Writes HTTP response data.
func (writer *nonFlushingBadResponseLoggingWriter) Write(data []byte) (int, error) {
	if writer.statusCode == 0 {
		// WriteHeader has (probably) not been called, so we need to call it with StatusOK to fulfill the interface contract.
		// https://godoc.org/net/http#ResponseWriter
		writer.WriteHeader(http.StatusOK)
	}
	n, err := writer.rw.Write(data)
	if writer.logBody {
		writer.captureResponseBody(data)
	}
	if err != nil {
		writer.writeError = err
	}
	return n, err
}

// Hijack hijacks the first response writer that is a Hijacker.
func (writer *nonFlushingBadResponseLoggingWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	hj, ok := writer.rw.(http.Hijacker)
	if ok {
		return hj.Hijack()
	}
	return nil, nil, fmt.Errorf("cannot cast underlying response writer to Hijacker")
}

func (writer *nonFlushingBadResponseLoggingWriter) StatusCode() int {
	return writer.statusCode
}

func (writer *nonFlushingBadResponseLoggingWriter) WriteError() error {
	return writer.writeError
}

func (writer *flushingBadResponseLoggingWriter) Flush() {
	writer.f.Flush()
}

func (writer *nonFlushingBadResponseLoggingWriter) captureResponseBody(data []byte) {
	if len(data) > writer.bodyBytesLeft {
		_, _ = writer.buffer.Write(data[:writer.bodyBytesLeft])
		_, _ = io.WriteString(writer.buffer, "...")
		writer.bodyBytesLeft = 0
		writer.logBody = false
	} else {
		_, _ = writer.buffer.Write(data)
		writer.bodyBytesLeft -= len(data)
	}
}
