package client

import (
	"time"

	"github.com/gojek/heimdall/v7"
)

type Retriable = heimdall.Retriable

type options struct {
	retryCount         int
	requestResponseLog bool
	timeout            time.Duration
	retriable          Retriable
}

type Option func(*options)

func WithRetryCount(i int) Option {
	return func(o *options) {
		o.retryCount = i
	}
}

func WithTimeout(i time.Duration) Option {
	return func(o *options) {
		o.timeout = i
	}
}

func WithRequestResponseLog(b bool) Option {
	return func(o *options) {
		o.requestResponseLog = b
	}
}

func WithRetriable(retriable Retriable) Option {
	return func(o *options) {
		o.retriable = retriable
	}
}
