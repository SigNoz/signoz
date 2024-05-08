package gateway

import (
	"net/http"
	"net/http/httputil"
	"net/url"

	_ "go.signoz.io/signoz/pkg/query-service/model"
)

const (
	GatewayRoutePrefix string = "/api/v1/gateway"
)

type Gateway interface {
	Proxy(http.ResponseWriter, *http.Request)
}

type gateway struct {
	proxy *httputil.ReverseProxy
}

func NewGateway(u string) (*gateway, error) {
	url, err := url.Parse(u)
	if err != nil {
		return nil, err
	}

	pr := newProxy(GatewayRoutePrefix, url)
	proxy := &httputil.ReverseProxy{
		Rewrite:        pr.rewrite,
		ModifyResponse: pr.modifyResponse,
		ErrorHandler:   pr.errorHandler,
	}

	return &gateway{
		proxy: proxy,
	}, nil
}

func (gateway *gateway) Proxy(rw http.ResponseWriter, req *http.Request) {
	gateway.proxy.ServeHTTP(rw, req)
}
