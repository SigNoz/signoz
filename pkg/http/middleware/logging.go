package middleware

import (
	"bytes"
	"context"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gorilla/mux"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
	"go.signoz.io/signoz/pkg/query-service/common"
	"go.signoz.io/signoz/pkg/types/authtypes"
	"go.uber.org/zap"
)

const (
	logMessage string = "::RECEIVED-REQUEST::"
)

type Logging struct {
	logger         *zap.Logger
	excludedRoutes map[string]struct{}
}

func NewLogging(logger *zap.Logger, excludedRoutes []string) *Logging {
	if logger == nil {
		panic("cannot build logging, logger is empty")
	}

	excludedRoutesMap := make(map[string]struct{})
	for _, route := range excludedRoutes {
		excludedRoutesMap[route] = struct{}{}
	}

	return &Logging{
		logger:         logger.Named(pkgname),
		excludedRoutes: excludedRoutesMap,
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

		logCommentKVs := middleware.getLogCommentKVs(req)
		req = req.WithContext(context.WithValue(req.Context(), common.LogCommentKey, logCommentKVs))

		badResponseBuffer := new(bytes.Buffer)
		writer := newBadResponseLoggingWriter(rw, badResponseBuffer)
		next.ServeHTTP(writer, req)

		// if the path is in the excludedRoutes map, don't log
		if _, ok := middleware.excludedRoutes[path]; ok {
			return
		}

		statusCode, err := writer.StatusCode(), writer.WriteError()
		fields = append(fields,
			zap.Int(string(semconv.HTTPResponseStatusCodeKey), statusCode),
			zap.Duration(string(semconv.HTTPServerRequestDurationName), time.Since(start)),
		)
		if err != nil {
			fields = append(fields, zap.Error(err))
			middleware.logger.Error(logMessage, fields...)
		} else {
			// when the status code is 400 or >=500, and the response body is not empty.
			if badResponseBuffer.Len() != 0 {
				fields = append(fields, zap.String("response.body", badResponseBuffer.String()))
			}

			middleware.logger.Info(logMessage, fields...)
		}
	})
}

func (middleware *Logging) getLogCommentKVs(r *http.Request) map[string]string {
	referrer := r.Header.Get("Referer")

	var path, dashboardID, alertID, page, client, viewName, tab string

	if referrer != "" {
		referrerURL, _ := url.Parse(referrer)
		client = "browser"
		path = referrerURL.Path

		if strings.Contains(path, "/dashboard") {
			// Split the path into segments
			pathSegments := strings.Split(referrerURL.Path, "/")
			// The dashboard ID should be the segment after "/dashboard/"
			// Loop through pathSegments to find "dashboard" and then take the next segment as the ID
			for i, segment := range pathSegments {
				if segment == "dashboard" && i < len(pathSegments)-1 {
					// Return the next segment, which should be the dashboard ID
					dashboardID = pathSegments[i+1]
				}
			}
			page = "dashboards"
		} else if strings.Contains(path, "/alerts") {
			urlParams := referrerURL.Query()
			alertID = urlParams.Get("ruleId")
			page = "alerts"
		} else if strings.Contains(path, "logs") && strings.Contains(path, "explorer") {
			page = "logs-explorer"
			viewName = referrerURL.Query().Get("viewName")
		} else if strings.Contains(path, "/trace") || strings.Contains(path, "traces-explorer") {
			page = "traces-explorer"
			viewName = referrerURL.Query().Get("viewName")
		} else if strings.Contains(path, "/services") {
			page = "services"
			tab = referrerURL.Query().Get("tab")
			if tab == "" {
				tab = "OVER_METRICS"
			}
		}
	} else {
		client = "api"
	}

	var email string
	claims, ok := authtypes.ClaimsFromContext(r.Context())
	if ok {
		email = claims.Email
	}

	kvs := map[string]string{
		"path":        path,
		"dashboardID": dashboardID,
		"alertID":     alertID,
		"source":      page,
		"client":      client,
		"viewName":    viewName,
		"servicesTab": tab,
		"email":       email,
	}
	return kvs
}
