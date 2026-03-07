package ctxtypes

import (
	"context"
	"fmt"
	"net/http"
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCommentFromHTTPRequest(t *testing.T) {
	testCases := []struct {
		name     string
		req      *http.Request
		expected map[string]string
	}{
		{
			name:     "EmptyReferer",
			req:      &http.Request{Header: http.Header{"Referer": {""}}},
			expected: map[string]string{},
		},
		{
			name:     "ControlCharacterInReferer",
			req:      &http.Request{Header: http.Header{"Referer": {"https://signoz.io/logs/logs-explorer\x00"}}},
			expected: map[string]string{},
		},
		{
			name:     "LogsExplorer",
			req:      &http.Request{Header: http.Header{"Referer": {"https://signoz.io/logs/logs-explorer"}}},
			expected: map[string]string{"http_path": "/logs/logs-explorer", "module_name": "logs-explorer"},
		},
		{
			name:     "TracesExplorer",
			req:      &http.Request{Header: http.Header{"Referer": {"https://signoz.io/traces-explorer"}}},
			expected: map[string]string{"http_path": "/traces-explorer", "module_name": "traces-explorer"},
		},
		{
			name:     "MetricsExplorer",
			req:      &http.Request{Header: http.Header{"Referer": {"https://signoz.io/metrics-explorer/explorer"}}},
			expected: map[string]string{"http_path": "/metrics-explorer/explorer", "module_name": "metrics-explorer"},
		},
		{
			name:     "DashboardWithID",
			req:      &http.Request{Header: http.Header{"Referer": {"https://signoz.io/dashboard/123/new"}}},
			expected: map[string]string{"http_path": "/dashboard/123/new", "module_name": "dashboard", "dashboard_id": "123"},
		},
		{
			name:     "DashboardLandingPage",
			req:      &http.Request{Header: http.Header{"Referer": {"https://signoz.io/dashboard/01982be0-d67e-7326-8955-2e99720a9f72?relativeTime=30m"}}},
			expected: map[string]string{"http_path": "/dashboard/01982be0-d67e-7326-8955-2e99720a9f72", "module_name": "dashboard", "dashboard_id": "01982be0-d67e-7326-8955-2e99720a9f72"},
		},
		{
			name:     "Rule",
			req:      &http.Request{Header: http.Header{"Referer": {"https://signoz.io/alerts/new"}}},
			expected: map[string]string{"http_path": "/alerts/new", "module_name": "rule"},
		},
		{
			name:     "RuleWithID",
			req:      &http.Request{Header: http.Header{"Referer": {"https://signoz.io/alerts/edit?ruleId=123"}}},
			expected: map[string]string{"http_path": "/alerts/edit", "module_name": "rule", "rule_id": "123"},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			actual := CommentFromHTTPRequest(tc.req)

			assert.True(t, (&Comment{vals: tc.expected}).Equal(&Comment{vals: actual}))
		})
	}
}

func TestCommentFromContext(t *testing.T) {
	ctx := context.Background()
	comment1 := CommentFromContext(ctx)
	assert.True(t, NewComment().Equal(comment1))

	comment1.Set("k1", "v1")
	ctx = NewContextWithComment(ctx, comment1)
	actual1 := CommentFromContext(ctx)
	assert.True(t, comment1.Equal(actual1))

	// Get the comment from the context, mutate it, but this time do not set it back in the context
	comment2 := CommentFromContext(ctx)
	comment2.Set("k2", "v2")

	actual2 := CommentFromContext(ctx)
	// Since comment2 was not set back in the context, it should not affect the original comment1
	assert.True(t, comment1.Equal(actual2))
	assert.False(t, comment2.Equal(actual2))
	assert.False(t, comment1.Equal(comment2))
}

func TestCommentFromContextConcurrent(t *testing.T) {
	comment := NewComment()
	comment.Set("k1", "v1")

	ctx := context.Background()
	ctx = NewContextWithComment(ctx, comment)

	var wg sync.WaitGroup
	ctxs := make([]context.Context, 10)
	var mtx sync.Mutex
	wg.Add(10)

	for i := 0; i < 10; i++ {
		go func(i int) {
			defer wg.Done()
			comment := CommentFromContext(ctx)
			comment.Set("k2", fmt.Sprintf("v%d", i))
			newCtx := NewContextWithComment(ctx, comment)
			mtx.Lock()
			ctxs[i] = newCtx
			mtx.Unlock()
		}(i)
	}

	wg.Wait()

	for i, ctx := range ctxs {
		comment := CommentFromContext(ctx)
		assert.Equal(t, len(comment.vals), 2)
		assert.Equal(t, comment.vals["k1"], "v1")
		assert.Equal(t, comment.vals["k2"], fmt.Sprintf("v%d", i))
	}
}
