package gateway

import (
	"net/http/httputil"
)

func NewNoopProxy() (*httputil.ReverseProxy, error) {
	return &httputil.ReverseProxy{}, nil
}
