package middleware

import (
	"net/http"
	"strconv"
	"time"
)

type Cache struct {
	maxAge time.Duration
}

func NewCache(maxAge time.Duration) *Cache {
	if maxAge == 0 {
		maxAge = 7 * 24 * time.Hour
	}

	return &Cache{
		maxAge: maxAge,
	}
}

func (middleware *Cache) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		rw.Header().Set("Cache-Control", "max-age="+strconv.Itoa(int(middleware.maxAge.Seconds())))
		next.ServeHTTP(rw, req)
	})
}
