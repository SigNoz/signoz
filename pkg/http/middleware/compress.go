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

// NewCompress gzips responses on the fly. Responses that already carry a
// Content-Encoding or a Content-Range, and bodies under 1 KiB, are left as they are.
func NewCompress() (*Compress, error) {
	wrap, err := gzhttp.NewWrapper(
		gzhttp.EnableZstd(false),
		gzhttp.ContentTypeFilter(compressibleContentType),
	)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "cannot create compress middleware")
	}

	return &Compress{wrap: wrap}, nil
}

func (middleware *Compress) Wrap(next http.Handler) http.Handler {
	return middleware.wrap(next)
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
