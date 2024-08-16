package http

import (
	"bufio"
	"errors"
	"net"
	"net/http"
)

type writer struct {
	http.ResponseWriter
	statusCode int
}

func NewWriter(rw http.ResponseWriter) *writer {
	// WriteHeader(int) is not called if our response implicitly returns 200 OK, so
	// we default to that status code.
	return &writer{rw, http.StatusOK}
}

func (w *writer) WriteHeader(code int) {
	w.statusCode = code
	w.ResponseWriter.WriteHeader(code)
}

// Flush implements the http.Flush interface.
func (w *writer) Flush() {
	w.ResponseWriter.(http.Flusher).Flush()
}

func (w *writer) Status() int {
	return w.statusCode
}

// Support websockets
func (w *writer) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	h, ok := w.ResponseWriter.(http.Hijacker)
	if !ok {
		return nil, nil, errors.New("hijack not supported")
	}
	return h.Hijack()
}
