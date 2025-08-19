package ctxtypes

import (
	"context"
	"encoding/json"
	"net/http"
	"net/url"
	"regexp"
	"sync"
)

type commentCtxKey struct{}

type Comment struct {
	vals map[string]string
	mtx  sync.RWMutex
}

func NewContextWithComment(ctx context.Context, comment *Comment) context.Context {
	return context.WithValue(ctx, commentCtxKey{}, comment)
}

func CommentFromContext(ctx context.Context) *Comment {
	comment, ok := ctx.Value(commentCtxKey{}).(*Comment)
	if !ok {
		return NewComment()
	}

	return comment
}

func CommentFromHTTPRequest(req *http.Request) map[string]string {
	comments := map[string]string{}

	referrer := req.Header.Get("Referer")
	if referrer == "" {
		return comments
	}

	referrerURL, err := url.Parse(referrer)
	if err != nil {
		return comments
	}

	logsExplorerMatched, _ := regexp.MatchString(`/logs/logs-explorer(?:\?.*)?$`, referrer)
	traceExplorerMatched, _ := regexp.MatchString(`/traces-explorer(?:\?.*)?$`, referrer)
	metricsExplorerMatched, _ := regexp.MatchString(`/metrics-explorer/explorer(?:\?.*)?$`, referrer)
	dashboardMatched, _ := regexp.MatchString(`/dashboard/[a-zA-Z0-9\-]+/(new|edit)(?:\?.*)?$`, referrer)
	alertMatched, _ := regexp.MatchString(`/alerts/(new|edit)(?:\?.*)?$`, referrer)

	switch {
	case dashboardMatched:
		comments["module_name"] = "dashboard"
	case alertMatched:
		comments["module_name"] = "rule"
	case metricsExplorerMatched:
		comments["module_name"] = "metrics-explorer"
	case logsExplorerMatched:
		comments["module_name"] = "logs-explorer"
	case traceExplorerMatched:
		comments["module_name"] = "traces-explorer"
	default:
		return comments
	}

	if dashboardMatched {
		if dashboardIDRegex, err := regexp.Compile(`/dashboard/([a-f0-9\-]+)/`); err == nil {
			if matches := dashboardIDRegex.FindStringSubmatch(referrer); len(matches) > 1 {
				comments["dashboard_id"] = matches[1]
			}
		}

		if widgetIDRegex, err := regexp.Compile(`widgetId=([a-f0-9\-]+)`); err == nil {
			if matches := widgetIDRegex.FindStringSubmatch(referrer); len(matches) > 1 {
				comments["widget_id"] = matches[1]
			}
		}
	}

	if alertMatched {
		if alertIDRegex, err := regexp.Compile(`ruleId=(\d+)`); err == nil {
			if matches := alertIDRegex.FindStringSubmatch(referrer); len(matches) > 1 {
				comments["rule_id"] = matches[1]
			}
		}
	}

	comments["http_path"] = referrerURL.Path
	comments["http_query"] = referrerURL.RawQuery
	comments["http_referrer"] = referrer

	return comments
}

func NewComment() *Comment {
	return &Comment{vals: map[string]string{}}
}

func (comment *Comment) Set(key, value string) {
	comment.mtx.Lock()
	defer comment.mtx.Unlock()
	comment.vals[key] = value
}

func (comment *Comment) Merge(vals map[string]string) {
	comment.mtx.Lock()
	defer comment.mtx.Unlock()
	for key, value := range vals {
		comment.vals[key] = value
	}
}

func (comment *Comment) Map() map[string]string {
	comment.mtx.RLock()
	defer comment.mtx.RUnlock()
	return comment.vals
}

func (comment *Comment) String() string {
	commentJSON, err := json.Marshal(comment.vals)
	if err != nil {
		return "{}"
	}

	return string(commentJSON)
}
