package gateway

import (
	"net/http"
	"net/http/httputil"
	"net/url"
	"path"
	"strings"
)

var (
	RoutePrefix   string   = "/api/gateway"
	AllowedPrefix []string = []string{"/v1/workspaces/me", "/v2/profiles/me", "/v2/deployments/me"}
)

type proxy struct {
	url       *url.URL
	stripPath string
}

func NewProxy(u string, stripPath string) (*httputil.ReverseProxy, error) {
	url, err := url.Parse(u)
	if err != nil {
		return nil, err
	}

	proxy := &proxy{url: url, stripPath: stripPath}

	return &httputil.ReverseProxy{
		Rewrite:        proxy.rewrite,
		ModifyResponse: proxy.modifyResponse,
		ErrorHandler:   proxy.errorHandler,
	}, nil
}

func (p *proxy) rewrite(pr *httputil.ProxyRequest) {
	pr.SetURL(p.url)
	pr.SetXForwarded()
	pr.Out.URL.Path = cleanPath(strings.ReplaceAll(pr.Out.URL.Path, p.stripPath, ""))
}

func (p *proxy) modifyResponse(res *http.Response) error {
	return nil
}

func (p *proxy) errorHandler(rw http.ResponseWriter, req *http.Request, err error) {
	rw.WriteHeader(http.StatusBadGateway)
}

func cleanPath(p string) string {
	if p == "" {
		return "/"
	}
	if p[0] != '/' {
		p = "/" + p
	}
	np := path.Clean(p)
	if p[len(p)-1] == '/' && np != "/" {
		if len(p) == len(np)+1 && strings.HasPrefix(p, np) {
			np = p
		} else {
			np += "/"
		}
	}
	return np
}
