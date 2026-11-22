package routerweb

import (
	"encoding/binary"
	"io"
	"mime"
	"net/http"
	"os"
	"path"
	"slices"
	"strconv"
	"strings"
)

// precompressedHandler serves "<file>.gz" in place of "<file>" when the client
// accepts gzip, and defers to next (http.FileServer) otherwise.
type precompressedHandler struct {
	dir   http.Dir
	index string
	next  http.Handler
}

func newPrecompressedHandler(dir http.Dir, index string) http.Handler {
	return &precompressedHandler{dir: dir, index: index, next: http.FileServer(dir)}
}

func (handler *precompressedHandler) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	name := path.Clean("/" + req.URL.Path)

	// FileServer redirects non-canonical paths and the index (always
	// "/index.html"), and the configured index is templated in memory. Twins
	// are sent whole, so Range requests get the identity file.
	if (req.Method != http.MethodGet && req.Method != http.MethodHead) ||
		name != req.URL.Path ||
		strings.HasSuffix(name, "/"+handler.index) ||
		strings.HasSuffix(name, "/index.html") ||
		req.Header.Get("Range") != "" {
		handler.next.ServeHTTP(rw, req)
		return
	}

	file, err := handler.dir.Open(name + ".gz")
	if err != nil {
		handler.next.ServeHTTP(rw, req)
		return
	}
	defer func() { _ = file.Close() }()

	info, err := file.Stat()
	if err != nil || info.IsDir() {
		handler.next.ServeHTTP(rw, req)
		return
	}

	// A twin whose trailer records another size was not regenerated after its file changed.
	plainInfo, err := handler.stat(name)
	if err != nil || !gzipSizeEquals(file, info.Size(), plainInfo.Size()) {
		handler.next.ServeHTTP(rw, req)
		return
	}

	// ServeContent sniffs the twin's bytes when the extension has no type.
	if mime.TypeByExtension(path.Ext(name)) == "" {
		handler.next.ServeHTTP(rw, req)
		return
	}

	if !slices.Contains(rw.Header().Values("Vary"), "Accept-Encoding") {
		rw.Header().Add("Vary", "Accept-Encoding")
	}

	if !acceptsGzip(req.Header.Get("Accept-Encoding")) {
		handler.next.ServeHTTP(rw, req)
		return
	}

	http.ServeContent(&twinWriter{ResponseWriter: rw}, req, name, info.ModTime(), file)
}

func (handler *precompressedHandler) stat(name string) (os.FileInfo, error) {
	file, err := handler.dir.Open(name)
	if err != nil {
		return nil, err
	}
	defer func() { _ = file.Close() }()

	return file.Stat()
}

// gzipSizeEquals compares want with the uncompressed size, modulo 2^32, that
// the gzip trailer records.
func gzipSizeEquals(file http.File, size int64, want int64) bool {
	if size < 18 {
		return false
	}

	if _, err := file.Seek(size-4, io.SeekStart); err != nil {
		return false
	}

	var trailer [4]byte
	if _, err := io.ReadFull(file, trailer[:]); err != nil {
		return false
	}

	return binary.LittleEndian.Uint32(trailer[:]) == uint32(want)
}

// twinWriter marks only a 200 as the gzip twin: ServeContent's 304 and 412
// carry no body. Content-Encoding stays unset until then so ServeContent
// writes the twin's Content-Length.
type twinWriter struct {
	http.ResponseWriter
}

func (writer *twinWriter) WriteHeader(code int) {
	if code == http.StatusOK {
		writer.Header().Set("Content-Encoding", "gzip")
		writer.Header().Set("Accept-Ranges", "none")
	}

	writer.ResponseWriter.WriteHeader(code)
}

func (writer *twinWriter) Unwrap() http.ResponseWriter {
	return writer.ResponseWriter
}

// acceptsGzip reports whether an Accept-Encoding value allows gzip, honouring
// q=0 and falling back to the "*" entry when gzip is not listed.
func acceptsGzip(header string) bool {
	star, gzip := -1.0, -1.0
	for _, part := range strings.Split(header, ",") {
		token, params, _ := strings.Cut(strings.TrimSpace(part), ";")
		token = strings.ToLower(strings.TrimSpace(token))
		if token != "gzip" && token != "*" {
			continue
		}

		q := 1.0
		for _, param := range strings.Split(params, ";") {
			key, value, ok := strings.Cut(strings.TrimSpace(param), "=")
			if !ok || !strings.EqualFold(strings.TrimSpace(key), "q") {
				continue
			}

			if parsed, err := strconv.ParseFloat(strings.TrimSpace(value), 64); err == nil {
				q = parsed
			}
		}

		if token == "gzip" {
			gzip = q
		} else {
			star = q
		}
	}

	if gzip >= 0 {
		return gzip > 0
	}

	return star > 0
}
