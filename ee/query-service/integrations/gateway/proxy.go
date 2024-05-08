package gateway

import (
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
)

type proxy struct {
	rmpath string
	url    *url.URL
}

func newProxy(rmpath string, url *url.URL) *proxy {
	return &proxy{
		rmpath: rmpath,
		url:    url,
	}
}

func (p *proxy) rewrite(pr *httputil.ProxyRequest) {
	pr.SetXForwarded()
	p.setUrl(pr.Out, pr.In)
}

func (p *proxy) setUrl(out *http.Request, in *http.Request) {
	out.URL.Scheme = p.url.Scheme
	out.URL.Host = p.url.Host
	out.URL.Path = strings.ReplaceAll(in.URL.Path, p.rmpath, "")
	out.URL.RawQuery = in.URL.RawQuery
}

func (p *proxy) modifyResponse(res *http.Response) error {
	return nil
}

func (p *proxy) errorHandler(rw http.ResponseWriter, req *http.Request, err error) {
	rw.WriteHeader(http.StatusBadGateway)
}
