package middleware

import (
	"bytes"
	"net"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
	"go.uber.org/zap"
)

const (
	logMessage string = "::RECEIVED-REQUEST::"
)

type Logging struct {
	logger *zap.Logger
}

func NewLogging(logger *zap.Logger) *Logging {
	if logger == nil {
		panic("cannot build logging, logger is empty")
	}

	return &Logging{
		logger: logger.Named(pkgname),
	}
}

func (middleware *Logging) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		ctx := req.Context()
		start := time.Now()
		host, port, _ := net.SplitHostPort(req.Host)
		path, err := mux.CurrentRoute(req).GetPathTemplate()
		if err != nil {
			path = req.URL.Path
		}

		fields := []zap.Field{
			zap.Any("context", ctx),
			zap.String(string(semconv.ClientAddressKey), req.RemoteAddr),
			zap.String(string(semconv.UserAgentOriginalKey), req.UserAgent()),
			zap.String(string(semconv.ServerAddressKey), host),
			zap.String(string(semconv.ServerPortKey), port),
			zap.Int64(string(semconv.HTTPRequestSizeKey), req.ContentLength),
			zap.String(string(semconv.HTTPRouteKey), path),
		}

		buf := new(bytes.Buffer)
		writer := newBadResponseLoggingWriter(rw, buf)
		next.ServeHTTP(writer, req)

		statusCode, err := writer.StatusCode(), writer.WriteError()
		fields = append(fields,
			zap.Int(string(semconv.HTTPResponseStatusCodeKey), statusCode),
			zap.Duration(string(semconv.HTTPServerRequestDurationName), time.Since(start)),
		)
		if err != nil {
			fields = append(fields, zap.Error(err))
			middleware.logger.Error(logMessage, fields...)
		} else {
			if buf.Len() != 0 {
				fields = append(fields, zap.String("response.body", buf.String()))
			}

			middleware.logger.Info(logMessage, fields...)
		}
	})
}
