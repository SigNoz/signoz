package routerweb

import (
	"mime"
	"net/http"
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

	// The index is templated in memory and FileServer redirects it. Range
	// requests address the identity representation, so they skip the twin.
	if (req.Method != http.MethodGet && req.Method != http.MethodHead) ||
		strings.HasSuffix(name, "/"+handler.index) ||
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

	rw.Header().Set("Content-Encoding", "gzip")
	rw.Header().Set("Content-Length", strconv.FormatInt(info.Size(), 10))
	http.ServeContent(rw, req, name, info.ModTime(), file)
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
		if key, value, ok := strings.Cut(strings.TrimSpace(params), "="); ok && strings.EqualFold(strings.TrimSpace(key), "q") {
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
