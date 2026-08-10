package alertmanagertypes

import (
	"fmt"
	"testing"

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
		{"missing project", jiraReceiverJSON("https://acme.atlassian.net", "", "Task", true)},
		{"missing issue_type", jiraReceiverJSON("https://acme.atlassian.net", "KAN", "", true)},
		{"missing basic auth", jiraReceiverJSON("https://acme.atlassian.net", "KAN", "Task", false)},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			_, err := NewReceiver(c.json)
			assert.Error(t, err)
		})
	}
}
