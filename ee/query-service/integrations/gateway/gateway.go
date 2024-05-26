package gateway

import (
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	_ "go.signoz.io/signoz/pkg/query-service/model"
)

const (
	RoutePrefix   string = "/api/v1/gateway"
	allowedPrefix string = "/v1/workspaces/me"
)

type Gateway interface {
	ServeHTTP(http.ResponseWriter, *http.Request)
}

type gateway struct {
	proxy *httputil.ReverseProxy
}

func NewGateway(u string) (*gateway, error) {
	url, err := url.Parse(u)
	if err != nil {
		return nil, err
	}

	return &gateway{
		proxy: newProxy(url, RoutePrefix),
	}, nil
}

func (gateway *gateway) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	fmt.Printf("%v", req.URL.Path)
	if !strings.HasPrefix(req.URL.Path, RoutePrefix+allowedPrefix) {
		rw.WriteHeader(http.StatusNotFound)
		return
	}

	gateway.proxy.ServeHTTP(rw, req)
}
