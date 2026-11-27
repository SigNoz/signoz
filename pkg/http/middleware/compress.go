package middleware

import (
	"net/http"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/klauspost/compress/gzhttp"
)

type Compress struct {
	wrap func(http.Handler) http.HandlerFunc
}

// NewCompress gzips responses on the fly at the given compress/gzip level, and
// passes them through untouched when disabled. Responses that already carry a
// Content-Encoding or a Content-Range, and bodies under 1 KiB, are left as they are.
func NewCompress(enabled bool, level int) (*Compress, error) {
	if !enabled {
		return &Compress{}, nil
	}

	wrap, err := gzhttp.NewWrapper(
		gzhttp.CompressionLevel(level),
		gzhttp.EnableZstd(false),
		gzhttp.ContentTypeFilter(compressibleContentType),
	)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "cannot create compress middleware")
	}

	return &Compress{wrap: wrap}, nil
}

func (middleware *Compress) Wrap(next http.Handler) http.Handler {
	if middleware.wrap == nil {
		return next
	}

	compressed := middleware.wrap(next)

	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		// gzhttp sends no headers until the first body byte, which stalls event streams.
		if acceptsEventStream(req) {
			next.ServeHTTP(rw, req)
			return
		}

		compressed.ServeHTTP(rw, req)
	})
}

func acceptsEventStream(req *http.Request) bool {
	for _, accept := range req.Header.Values("Accept") {
		for _, mediaRange := range strings.Split(accept, ",") {
			mediaType, _, _ := strings.Cut(mediaRange, ";")
			if strings.EqualFold(strings.TrimSpace(mediaType), "text/event-stream") {
				return true
			}
		}
	}

	return false
}

// Raster images and woff fonts are already compressed and gain nothing from gzip.
func compressibleContentType(contentType string) bool {
	if !gzhttp.DefaultContentTypeFilter(contentType) {
		return false
	}

	contentType = strings.ToLower(contentType)
	if strings.HasPrefix(contentType, "image/") {
		return strings.HasPrefix(contentType, "image/svg") || strings.HasPrefix(contentType, "image/x-icon") || strings.HasPrefix(contentType, "image/vnd.microsoft.icon")
	}

	return !strings.HasPrefix(contentType, "font/woff")
}
