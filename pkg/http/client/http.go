package client

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/http/client/plugin"
	"github.com/gojek/heimdall/v7"
	"github.com/gojek/heimdall/v7/httpclient"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/trace"
)

type Client struct {
	c    *httpclient.Client
	netc *http.Client
}

func New(logger *slog.Logger, tracerProvider trace.TracerProvider, meterProvider metric.MeterProvider, opts ...Option) (*Client, error) {
	clientOpts := options{
		retryCount:         3,
		requestResponseLog: false,
		timeout:            5 * time.Second,
	}

	for _, opt := range opts {
		opt(&clientOpts)
	}

	netc := &http.Client{
		Timeout:   clientOpts.timeout,
		Transport: otelhttp.NewTransport(http.DefaultTransport, otelhttp.WithTracerProvider(tracerProvider), otelhttp.WithMeterProvider(meterProvider)),
	}

	if clientOpts.retriable == nil {
		clientOpts.retriable = heimdall.NewRetrier(
			heimdall.NewConstantBackoff(
				2*time.Second,
				100*time.Millisecond,
			),
		)
	}

	c := httpclient.NewClient(
		httpclient.WithHTTPClient(netc),
		httpclient.WithRetrier(clientOpts.retriable),
		httpclient.WithRetryCount(clientOpts.retryCount),
	)

	if clientOpts.requestResponseLog {
		c.AddPlugin(plugin.NewLog(logger))
	}

	return &Client{
		netc: netc,
		c:    c,
	}, nil
}

func (c *Client) Do(request *http.Request) (*http.Response, error) {
	return c.c.Do(request)
}

func (c *Client) Client() *http.Client {
	return c.netc
}
