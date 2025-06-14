package plugin

import (
	"bytes"
	"io"
	"log/slog"
	"net"
	"net/http"

	"github.com/gojek/heimdall/v7"
	semconv "go.opentelemetry.io/otel/semconv/v1.27.0"
)

type reqResLog struct {
	logger *slog.Logger
}

func NewLog(logger *slog.Logger) heimdall.Plugin {
	return &reqResLog{
		logger: logger,
	}
}

func (plugin *reqResLog) OnRequestStart(request *http.Request) {
	host, port, _ := net.SplitHostPort(request.Host)
	fields := []any{
		string(semconv.HTTPRequestMethodKey), request.Method,
		string(semconv.URLPathKey), request.URL.Path,
		string(semconv.URLSchemeKey), request.URL.Scheme,
		string(semconv.UserAgentOriginalKey), request.UserAgent(),
		string(semconv.ServerAddressKey), host,
		string(semconv.ServerPortKey), port,
		string(semconv.HTTPRequestSizeKey), request.ContentLength,
		"http.request.headers", request.Header,
	}

	plugin.logger.InfoContext(request.Context(), "::SENT-REQUEST::", fields...)
}

func (plugin *reqResLog) OnRequestEnd(request *http.Request, response *http.Response) {
	fields := []any{
		string(semconv.HTTPResponseStatusCodeKey), response.StatusCode,
		string(semconv.HTTPResponseBodySizeKey), response.ContentLength,
	}

	bodybytes, err := io.ReadAll(response.Body)
	if err != nil {
		plugin.logger.DebugContext(request.Context(), "::UNABLE-TO-LOG-RESPONSE-BODY::", "error", err)
	} else {
		_ = response.Body.Close()
		response.Body = io.NopCloser(bytes.NewBuffer(bodybytes))

		if len(bodybytes) > 0 {
			fields = append(fields, "http.response.body", string(bodybytes))
		} else {
			fields = append(fields, "http.response.body", "(empty)")
		}
	}

	plugin.logger.InfoContext(request.Context(), "::RECEIVED-RESPONSE::", fields...)
}

func (plugin *reqResLog) OnError(request *http.Request, err error) {
	host, port, _ := net.SplitHostPort(request.Host)
	fields := []any{
		"error", err,
		string(semconv.HTTPRequestMethodKey), request.Method,
		string(semconv.URLPathKey), request.URL.Path,
		string(semconv.URLSchemeKey), request.URL.Scheme,
		string(semconv.UserAgentOriginalKey), request.UserAgent(),
		string(semconv.ServerAddressKey), host,
		string(semconv.ServerPortKey), port,
		string(semconv.HTTPRequestSizeKey), request.ContentLength,
	}

	plugin.logger.ErrorContext(request.Context(), "::UNABLE-TO-SEND-REQUEST::", fields...)
}
