package middleware

import (
	"context"
	"net/http"
	"strings"
	"time"

	"go.uber.org/zap"
)

const (
	headerName string = "timeout"
)

type Timeout struct {
	logger   *zap.Logger
	excluded map[string]struct{}
	// The default timeout
	defaultTimeout time.Duration
	// The max allowed timeout
	maxTimeout time.Duration
}

func NewTimeout(logger *zap.Logger, excludedRoutes []string, defaultTimeout time.Duration, maxTimeout time.Duration) *Timeout {
	if logger == nil {
		panic("cannot build timeout, logger is empty")
	}

	excluded := make(map[string]struct{}, len(excludedRoutes))
	for _, route := range excludedRoutes {
		excluded[route] = struct{}{}
	}

	if defaultTimeout.Seconds() == 0 {
		defaultTimeout = 60 * time.Second
	}

	if maxTimeout == 0 {
		maxTimeout = 600 * time.Second
	}

	return &Timeout{
		logger:         logger.Named(pkgname),
		excluded:       excluded,
		defaultTimeout: defaultTimeout,
		maxTimeout:     maxTimeout,
	}
}

func (middleware *Timeout) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		if _, ok := middleware.excluded[req.URL.Path]; !ok {
			actual := middleware.defaultTimeout
			incoming := req.Header.Get(headerName)
			if incoming != "" {
				parsed, err := time.ParseDuration(strings.TrimSpace(incoming) + "s")
				if err != nil {
					middleware.logger.Warn("cannot parse timeout in header, using default timeout", zap.String("timeout", incoming), zap.Error(err), zap.Any("context", req.Context()))
				} else {
					if parsed > middleware.maxTimeout {
						actual = middleware.maxTimeout
					} else {
						actual = parsed
					}
				}
			}

			ctx, cancel := context.WithTimeout(req.Context(), actual)
			defer cancel()

			req = req.WithContext(ctx)
			next.ServeHTTP(rw, req)
			return
		}

		next.ServeHTTP(rw, req)
	})
}
