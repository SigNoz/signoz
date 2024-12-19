package gateway

import (
	"context"
	"net/http"
	"net/http/httputil"
	"net/url"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestProxyRewrite(t *testing.T) {
	testCases := []struct {
		name      string
		url       *url.URL
		stripPath string
		in        *url.URL
		expected  *url.URL
	}{
		{
			name:      "SamePathAdded",
			url:       &url.URL{Scheme: "http", Host: "backend", Path: "/path1"},
			stripPath: "/strip",
			in:        &url.URL{Scheme: "http", Host: "localhost", Path: "/strip/path1"},
			expected:  &url.URL{Scheme: "http", Host: "backend", Path: "/path1/path1"},
		},
		{
			name:      "NoStripPathInput",
			url:       &url.URL{Scheme: "http", Host: "backend"},
			stripPath: "",
			in:        &url.URL{Scheme: "http", Host: "localhost", Path: "/strip/path1"},
			expected:  &url.URL{Scheme: "http", Host: "backend", Path: "/strip/path1"},
		},
		{
			name:      "NoStripPathPresentInReq",
			url:       &url.URL{Scheme: "http", Host: "backend"},
			stripPath: "/not-found",
			in:        &url.URL{Scheme: "http", Host: "localhost", Path: "/strip/path1"},
			expected:  &url.URL{Scheme: "http", Host: "backend", Path: "/strip/path1"},
		},
	}

	for _, tc := range testCases {
		proxy, err := NewProxy(tc.url.String(), tc.stripPath)
		require.NoError(t, err)
		inReq, err := http.NewRequest(http.MethodGet, tc.in.String(), nil)
		require.NoError(t, err)
		proxyReq := &httputil.ProxyRequest{
			In:  inReq,
			Out: inReq.Clone(context.Background()),
		}
		proxy.Rewrite(proxyReq)

		assert.Equal(t, tc.expected.Host, proxyReq.Out.URL.Host)
		assert.Equal(t, tc.expected.Scheme, proxyReq.Out.URL.Scheme)
		assert.Equal(t, tc.expected.Path, proxyReq.Out.URL.Path)
		assert.Equal(t, tc.expected.Query(), proxyReq.Out.URL.Query())
	}
}
