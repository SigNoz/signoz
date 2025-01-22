package middleware

import (
	"context"
	"net/http"
	"net/url"
	"strings"

	"go.signoz.io/signoz/pkg/query-service/auth"
	"go.signoz.io/signoz/pkg/query-service/common"
)

type LogCommentEnricher struct {
}

func NewLogCommentEnricher() *LogCommentEnricher {

	return &LogCommentEnricher{}
}

func (l *LogCommentEnricher) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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

		email, _ := auth.GetEmailFromJwt(r.Context())

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

		r = r.WithContext(context.WithValue(r.Context(), common.LogCommentKey, kvs))
		next.ServeHTTP(w, r)
	})
}
