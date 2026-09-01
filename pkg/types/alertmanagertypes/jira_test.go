package alertmanagertypes

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	commoncfg "github.com/prometheus/common/config"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func jiraReceiverJSON(site, project, issueType string, withAuth bool) string {
	auth := ""
	if withAuth {
		auth = `,"http_config":{"basic_auth":{"username":"me@acme.com","password":"token"}}`
	}
	return fmt.Sprintf(
		`{"name":"jira","jira_configs":[{"site":%q,"project":%q,"issue_type":%q%s}]}`,
		site, project, issueType, auth,
	)
}

func TestJiraReceiverConfigDefaults(t *testing.T) {
	r, err := NewReceiver(jiraReceiverJSON("https://acme.atlassian.net", "KAN", "Task", true))
	require.NoError(t, err)
	require.Len(t, r.JiraConfigs, 1)

	jc := r.JiraConfigs[0]
	assert.Equal(t, "https://acme.atlassian.net", jc.Site)
	assert.Equal(t, "https://acme.atlassian.net/rest/api/3", jc.APIBaseURL())
	assert.False(t, jc.SendResolved()) // default off when omitted, like other channels
	assert.Equal(t, defaultJiraReopenDuration, jc.ReopenDuration)
	assert.Equal(t, DefaultJiraSummaryTemplate, jc.Summary)
	assert.Equal(t, DefaultJiraDescriptionTemplate, jc.Description)

	ch, err := NewChannelFromReceiver(r, "org-1")
	require.NoError(t, err)
	assert.Equal(t, "jira", ch.Type)
}

func TestJiraReceiverConfigSendResolved(t *testing.T) {
	withSendResolved := func(v bool) string {
		return fmt.Sprintf(
			`{"name":"j","jira_configs":[{"site":"https://acme.atlassian.net","project":"KAN","issue_type":"Task","send_resolved":%t,"http_config":{"basic_auth":{"username":"e","password":"t"}}}]}`,
			v,
		)
	}
	on, err := NewReceiver(withSendResolved(true))
	require.NoError(t, err)
	assert.True(t, on.JiraConfigs[0].SendResolved())

	off, err := NewReceiver(withSendResolved(false))
	require.NoError(t, err)
	assert.False(t, off.JiraConfigs[0].SendResolved())
}

func TestJiraReceiverConfigReopenDurationMinimum(t *testing.T) {
	withReopen := func(v string) string {
		return fmt.Sprintf(
			`{"name":"j","jira_configs":[{"site":"https://acme.atlassian.net","project":"KAN","issue_type":"Task","reopen_duration":%q,"http_config":{"basic_auth":{"username":"e","password":"t"}}}]}`,
			v,
		)
	}
	r, err := NewReceiver(withReopen("1m"))
	require.NoError(t, err)
	assert.Equal(t, model.Duration(time.Minute), r.JiraConfigs[0].ReopenDuration)

	_, err = NewReceiver(withReopen("30s"))
	assert.Error(t, err)
}

func TestJiraAPIBaseURL(t *testing.T) {
	c := &JiraReceiverConfig{Site: "https://acme.atlassian.net"}
	assert.Equal(t, "https://acme.atlassian.net/rest/api/3", c.APIBaseURL())

	c.CloudID = "09851b38-1a40-4c01-a36a-0a9336293200"
	assert.Equal(t, "https://api.atlassian.com/ex/jira/09851b38-1a40-4c01-a36a-0a9336293200/rest/api/3", c.APIBaseURL())
}

func TestJiraIsServiceAccount(t *testing.T) {
	withUser := func(username string) *JiraReceiverConfig {
		return &JiraReceiverConfig{HTTPConfig: &commoncfg.HTTPClientConfig{BasicAuth: &commoncfg.BasicAuth{Username: username}}}
	}
	assert.True(t, withUser("bot@serviceaccount.atlassian.com").IsServiceAccount())
	assert.True(t, withUser("Bot@ServiceAccount.Atlassian.Com").IsServiceAccount())
	assert.False(t, withUser("temp@signoz.io").IsServiceAccount())
	assert.False(t, (&JiraReceiverConfig{}).IsServiceAccount())
}

func TestJiraReceiverConfigTrailingSlashSite(t *testing.T) {
	r, err := NewReceiver(jiraReceiverJSON("https://acme.atlassian.net/", "KAN", "Task", true))
	require.NoError(t, err)
	assert.Equal(t, "https://acme.atlassian.net", r.JiraConfigs[0].Site)
	assert.Equal(t, "https://acme.atlassian.net/rest/api/3", r.JiraConfigs[0].APIBaseURL())
}

func TestJiraReceiverConfigValidation(t *testing.T) {
	cases := []struct {
		name string
		json string
	}{
		{"missing site", `{"name":"j","jira_configs":[{"project":"KAN","issue_type":"Task","http_config":{"basic_auth":{"username":"e","password":"t"}}}]}`},
		{"http site", jiraReceiverJSON("http://acme.atlassian.net", "KAN", "Task", true)},
		{"non-cloud host", jiraReceiverJSON("https://jira.acme.com", "KAN", "Task", true)},
		{"lookalike host suffix", jiraReceiverJSON("https://www.iamnotatlassian.net", "KAN", "Task", true)},
		{"bare atlassian.net", jiraReceiverJSON("https://atlassian.net", "KAN", "Task", true)},
		{"missing project", jiraReceiverJSON("https://acme.atlassian.net", "", "Task", true)},
		{"missing issue_type", jiraReceiverJSON("https://acme.atlassian.net", "KAN", "", true)},
		{"missing basic auth", jiraReceiverJSON("https://acme.atlassian.net", "KAN", "Task", false)},
		{"invalid reopen_duration format", `{"name":"j","jira_configs":[{"site":"https://acme.atlassian.net","project":"KAN","issue_type":"Task","reopen_duration":"3days","http_config":{"basic_auth":{"username":"e","password":"t"}}}]}`},
		{"sub-minute reopen_duration", `{"name":"j","jira_configs":[{"site":"https://acme.atlassian.net","project":"KAN","issue_type":"Task","reopen_duration":"30s","http_config":{"basic_auth":{"username":"e","password":"t"}}}]}`},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			_, err := NewReceiver(c.json)
			assert.Error(t, err)
		})
	}
}

func TestResolveJiraCloudIDsIgnoresClientSuppliedValues(t *testing.T) {
	cases := []struct {
		name         string
		username     string
		clientSent   string
		serverStatus int
		wantCloudID  string
		wantErr      bool
		wantHits     int32
	}{
		{
			name:         "service_account_bogus_cloud_id_is_replaced",
			username:     "bot@serviceaccount.atlassian.com",
			clientSent:   "bogus",
			serverStatus: http.StatusOK,
			wantCloudID:  "resolved-123",
			wantHits:     1,
		},
		{
			name:        "personal_token_cloud_id_is_cleared_without_resolving",
			username:    "user@signoz.io",
			clientSent:  "bogus",
			wantCloudID: "",
			wantHits:    0,
		},
		{
			name:         "service_account_resolve_error_fails_save",
			username:     "bot@serviceaccount.atlassian.com",
			serverStatus: http.StatusInternalServerError,
			wantErr:      true,
			wantHits:     1,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var hits atomic.Int32
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				hits.Add(1)
				w.WriteHeader(tc.serverStatus)
				_, _ = w.Write([]byte(`{"cloudId":"resolved-123"}`))
			}))
			defer srv.Close()

			receiver := &Receiver{
				JiraConfigs: []*JiraReceiverConfig{{
					Site:    srv.URL,
					CloudID: tc.clientSent,
					HTTPConfig: &commoncfg.HTTPClientConfig{
						BasicAuth: &commoncfg.BasicAuth{Username: tc.username},
					},
				}},
			}

			err := receiver.ResolveJiraCloudIDs(context.Background())
			if tc.wantErr {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tc.wantCloudID, receiver.JiraConfigs[0].CloudID)
			}
			assert.Equal(t, tc.wantHits, hits.Load())
		})
	}
}

func TestResolveCloudID(t *testing.T) {
	cases := []struct {
		name    string
		handler http.HandlerFunc
		want    string
		wantErr bool
	}{
		{
			name: "success",
			handler: func(w http.ResponseWriter, r *http.Request) {
				assert.Equal(t, "/_edge/tenant_info", r.URL.Path)
				_, _ = w.Write([]byte(`{"cloudId":"abc-123"}`))
			},
			want: "abc-123",
		},
		{
			name:    "non-200",
			handler: func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusNotFound) },
			wantErr: true,
		},
		{
			name:    "empty cloud id",
			handler: func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write([]byte(`{"cloudId":""}`)) },
			wantErr: true,
		},
		{
			name:    "bad json",
			handler: func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write([]byte(`not json`)) },
			wantErr: true,
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			srv := httptest.NewServer(c.handler)
			defer srv.Close()

			got, err := ResolveCloudID(context.Background(), srv.Client(), srv.URL)
			if c.wantErr {
				assert.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, c.want, got)
		})
	}
}
