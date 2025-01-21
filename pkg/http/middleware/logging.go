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
	// staticFields are additional fields that will be included in every log entry
	staticFields []zap.Field
}

func NewLogging(logger *zap.Logger, staticFields ...zap.Field) *Logging {
	if logger == nil {
		panic("cannot build logging, logger is empty")
	}

	return &Logging{
		logger:       logger.Named(pkgname),
		staticFields: staticFields,
	}
}

func (middleware *Logging) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		start := time.Now()
		host, port, _ := net.SplitHostPort(req.Host)
		path, err := mux.CurrentRoute(req).GetPathTemplate()
		if err != nil {
			path = req.URL.Path
		}

		fields := []zap.Field{
			zap.String(string(semconv.ClientAddressKey), req.RemoteAddr),
			zap.String(string(semconv.UserAgentOriginalKey), req.UserAgent()),
			zap.String(string(semconv.ServerAddressKey), host),
			zap.String(string(semconv.ServerPortKey), port),
			zap.Int64(string(semconv.HTTPRequestSizeKey), req.ContentLength),
			zap.String(string(semconv.HTTPRouteKey), path),
		}
		fields = append(fields, middleware.staticFields...)

		badResponseBuffer := new(bytes.Buffer)
		writer := newBadResponseLoggingWriter(rw, badResponseBuffer)
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
			// when there is no response body, we don't want to log it
			if badResponseBuffer.Len() != 0 {
				fields = append(fields, zap.String("response.body", badResponseBuffer.String()))
			}

			middleware.logger.Info(logMessage, fields...)
		}
	})
}
