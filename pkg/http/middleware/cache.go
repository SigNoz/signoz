package middleware

import (
	"net/http"
	"strconv"
	"strings"
	"time"
)

type Cache struct {
	maxAge time.Duration
}

func NewCache(maxAge time.Duration) *Cache {
	return &Cache{
		maxAge: maxAge,
	}
}

func (middleware *Cache) Wrap(next http.Handler) http.Handler {
	// Cache-Control: no-cache is equivalent to Cache-Control: max-age=0, must-revalidate as most HTTP/1.0 caches don't support no-cache directives
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		directives := []string{
			"max-age=" + strconv.Itoa(int(middleware.maxAge.Seconds())),
			"no-cache",        // Note that no-cache does not mean "don't cache". no-cache allows caches to store a response but requires them to revalidate it before reuse.
			"private",         //If you forget to add private to a response with personalized content, then that response can be stored in a shared cache and end up being reused for multiple users, which can cause personal information to leak.
			"must-revalidate", // HTTP allows caches to reuse stale responses when they are disconnected from the origin server. must-revalidate is a way to prevent this from happening - either the stored response is revalidated with the origin server or a 504 (Gateway Timeout) response is generated.
		}
		rw.Header().Set("Cache-Control", strings.Join(directives, ","))
		next.ServeHTTP(rw, req)
	})
}
