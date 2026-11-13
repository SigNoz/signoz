package middleware

import (
	"net/http"
)

const versionHeader = "X-Signoz-Version"

type Version struct {
	version string
}

func NewVersion(version string) *Version {
	return &Version{version: version}
}

func (middleware *Version) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		rw.Header().Set(versionHeader, middleware.version)
		next.ServeHTTP(rw, req)
	})
}
