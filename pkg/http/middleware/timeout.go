package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

const (
	headerName string = "timeout"
)

type Timeout struct {
	logger   *slog.Logger
	excluded map[string]struct{}
	// The default timeout
	defaultTimeout time.Duration
	// The max allowed timeout
	maxTimeout time.Duration
}

func NewTimeout(logger *slog.Logger, excludedRoutes []string, defaultTimeout time.Duration, maxTimeout time.Duration) *Timeout {
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
		logger:         logger.With("pkg", pkgname),
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
					middleware.logger.WarnContext(req.Context(), "cannot parse timeout in header, using default timeout", "timeout", incoming, "error", err)
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
