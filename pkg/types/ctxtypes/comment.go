package ctxtypes

import (
	"context"
	"encoding/json"
	"net/http"
	"net/url"
	"regexp"
	"sync"
)

var (
	logsExplorerRegex    = regexp.MustCompile(`/logs/logs-explorer(?:\?.*)?$`)
	traceExplorerRegex   = regexp.MustCompile(`/traces-explorer(?:\?.*)?$`)
	metricsExplorerRegex = regexp.MustCompile(`/metrics-explorer/explorer(?:\?.*)?$`)
	meterRegex           = regexp.MustCompile(`/meter(?:/.*)?(?:\?.*)?$`)
	dashboardOpenRegex   = regexp.MustCompile(`/dashboard/[a-zA-Z0-9\-]+(?:\?.*)?$`)
	dashboardEditRegex   = regexp.MustCompile(`/dashboard/[a-zA-Z0-9\-]+/(new|edit)(?:\?.*)?$`)
	dashboardIDRegex     = regexp.MustCompile(`/dashboard/([a-zA-Z0-9\-]+)`)
	widgetIDRegex        = regexp.MustCompile(`widgetId=([a-zA-Z0-9\-]+)`)
	ruleRegex            = regexp.MustCompile(`/alerts/(new|edit)(?:\?.*)?$`)
	ruleIDRegex          = regexp.MustCompile(`ruleId=(\d+)`)
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

	// Return a deep copy of the comment to prevent mutations from affecting the original
	copy := NewComment()
	copy.Merge(comment.Map())
	return copy
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

	logsExplorerMatched := logsExplorerRegex.MatchString(referrer)
	traceExplorerMatched := traceExplorerRegex.MatchString(referrer)
	metricsExplorerMatched := metricsExplorerRegex.MatchString(referrer)
	meterMatched := meterRegex.MatchString(referrer)
	dashboardViewMatched := dashboardOpenRegex.MatchString(referrer)
	dashboardEditMatched := dashboardEditRegex.MatchString(referrer)
	ruleMatched := ruleRegex.MatchString(referrer)

	switch {
	case dashboardViewMatched, dashboardEditMatched:
		comments["module_name"] = "dashboard"
	case ruleMatched:
		comments["module_name"] = "rule"
	case metricsExplorerMatched:
		comments["module_name"] = "metrics-explorer"
	case logsExplorerMatched:
		comments["module_name"] = "logs-explorer"
	case traceExplorerMatched:
		comments["module_name"] = "traces-explorer"
	case meterMatched:
		comments["module_name"] = "meter"
	default:
		return comments
	}

	if dashboardViewMatched || dashboardEditMatched {
		if matches := dashboardIDRegex.FindStringSubmatch(referrer); len(matches) > 1 {
			comments["dashboard_id"] = matches[1]
		}

		if matches := widgetIDRegex.FindStringSubmatch(referrer); len(matches) > 1 {
			comments["widget_id"] = matches[1]
		}
	}

	if ruleMatched {
		if matches := ruleIDRegex.FindStringSubmatch(referrer); len(matches) > 1 {
			comments["rule_id"] = matches[1]
		}
	}

	comments["http_path"] = referrerURL.Path

	return comments
}

// NewComment creates a new Comment with an empty map. It is safe to use concurrently.
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

	// If vals is nil, do nothing. Comment should not panic.
	if vals == nil {
		return
	}

	for key, value := range vals {
		comment.vals[key] = value
	}
}

func (comment *Comment) Map() map[string]string {
	comment.mtx.RLock()
	defer comment.mtx.RUnlock()

	copyOfVals := make(map[string]string)
	for key, value := range comment.vals {
		copyOfVals[key] = value
	}

	return copyOfVals
}

func (comment *Comment) String() string {
	comment.mtx.RLock()
	defer comment.mtx.RUnlock()

	commentJSON, err := json.Marshal(comment.vals)
	if err != nil {
		return "{}"
	}

	return string(commentJSON)
}

func (comment *Comment) Equal(other *Comment) bool {
	if len(comment.vals) != len(other.vals) {
		return false
	}

	for key, value := range comment.vals {
		if val, ok := other.vals[key]; !ok || val != value {
			return false
		}
	}

	return true
}
