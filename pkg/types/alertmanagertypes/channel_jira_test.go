package alertmanagertypes

import (
	"encoding/json"
	"fmt"
	"testing"
	"time"

	commoncfg "github.com/prometheus/common/config"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/swaggest/jsonschema-go"
)

func jiraReceiverJSON(project, issueType string, withAuth bool) string {
	auth := ""
	if withAuth {
		auth = `,"http_config":{"basic_auth":{"username":"me@acme.com","password":"token"}}`
	}
	return fmt.Sprintf(
		`{"name":"jira","jira_configs":[{"site":"https://acme.atlassian.net","project":%q,"issue_type":%q%s}]}`,
		project, issueType, auth,
	)
}

func jiraSelfHostedReceiverJSON(httpConfig string) string {
	return fmt.Sprintf(
		`{"name":"jira","jira_configs":[{"deployment":"selfhosted","site":"https://jira.acme.com","project":"OPS","issue_type":"Task"%s}]}`,
		httpConfig,
	)
}

func TestJiraReceiverConfigDefaults(t *testing.T) {
	r, err := NewReceiver(jiraReceiverJSON("KAN", "Task", true))
	require.NoError(t, err)
	require.Len(t, r.JiraConfigs, 1)

	jc := r.JiraConfigs[0]
	assert.Equal(t, JiraDeploymentCloud, jc.Deployment)
	assert.Equal(t, "https://acme.atlassian.net", jc.Site)
	assert.Equal(t, "https://acme.atlassian.net/rest/api/3", jc.APIBaseURL(""))
	assert.False(t, jc.SendResolved()) // default off when omitted, like other channels
	assert.Equal(t, defaultJiraReopenDuration, jc.ReopenDuration)
	assert.Equal(t, DefaultJiraSummaryTemplate, jc.Summary)
	assert.Equal(t, DefaultJiraDescriptionTemplate, jc.Description)

	ch, err := NewChannelFromReceiver(r, "org-1")
	require.NoError(t, err)
	assert.Equal(t, "jira", ch.Type)
}

func TestJiraReceiverConfigSelfHosted(t *testing.T) {
	r, err := NewReceiver(jiraSelfHostedReceiverJSON(`,"http_config":{"authorization":{"type":"Bearer","credentials":"pat-1"}}`))
	require.NoError(t, err)
	require.Len(t, r.JiraConfigs, 1)

	jc := r.JiraConfigs[0]
	assert.Equal(t, JiraDeploymentSelfHosted, jc.Deployment)
	assert.True(t, jc.IsSelfHosted())
	assert.Equal(t, "https://jira.acme.com/rest/api/2", jc.APIBaseURL(""))
	assert.Equal(t, "https://jira.acme.com/rest/api/2", jc.APIBaseURL("ignored-cloud-id"))
	assert.Equal(t, "/search", jc.SearchPath())
	assert.False(t, jc.IsCloudServiceAccount())
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
	testCases := []struct {
		name       string
		config     *JiraReceiverConfig
		cloudID    string
		expected   string
		searchPath string
	}{
		{"Cloud_SiteHost", &JiraReceiverConfig{Site: "https://acme.atlassian.net"}, "", "https://acme.atlassian.net/rest/api/3", "/search/jql"},
		{"Cloud_Gateway", &JiraReceiverConfig{Site: "https://acme.atlassian.net"}, "09851b38-1a40-4c01-a36a-0a9336293200", "https://api.atlassian.com/ex/jira/09851b38-1a40-4c01-a36a-0a9336293200/rest/api/3", "/search/jql"},
		{"SelfHosted_SiteHostV2", &JiraReceiverConfig{Deployment: JiraDeploymentSelfHosted, Site: "https://jira.acme.com"}, "", "https://jira.acme.com/rest/api/2", "/search"},
		{"SelfHosted_IgnoresCloudID", &JiraReceiverConfig{Deployment: JiraDeploymentSelfHosted, Site: "https://jira.acme.com"}, "09851b38-1a40-4c01-a36a-0a9336293200", "https://jira.acme.com/rest/api/2", "/search"},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.expected, testCase.config.APIBaseURL(testCase.cloudID))
			assert.Equal(t, testCase.searchPath, testCase.config.SearchPath())
		})
	}
}

func TestJiraIsCloudServiceAccount(t *testing.T) {
	withUser := func(deployment JiraDeployment, username string) *JiraReceiverConfig {
		return &JiraReceiverConfig{Deployment: deployment, HTTPConfig: &commoncfg.HTTPClientConfig{BasicAuth: &commoncfg.BasicAuth{Username: username}}}
	}
	testCases := []struct {
		name     string
		config   *JiraReceiverConfig
		expected bool
	}{
		{"Cloud_ServiceAccountDomain", withUser(JiraDeploymentCloud, "bot@serviceaccount.atlassian.com"), true},
		{"Cloud_ServiceAccountDomain_CaseInsensitive", withUser(JiraDeploymentCloud, "Bot@ServiceAccount.Atlassian.Com"), true},
		{"Cloud_PersonalEmail", withUser(JiraDeploymentCloud, "temp@signoz.io"), false},
		{"Cloud_NoAuth", &JiraReceiverConfig{}, false},
		{"SelfHosted_ServiceAccountEmail_NotCloud", withUser(JiraDeploymentSelfHosted, "bot@serviceaccount.atlassian.com"), false},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.expected, testCase.config.IsCloudServiceAccount())
		})
	}
}

func TestJiraReceiverConfigValidation(t *testing.T) {
	testCases := []struct {
		name string
		json string
	}{
		{"MissingSite", `{"name":"j","jira_configs":[{"project":"KAN","issue_type":"Task","http_config":{"basic_auth":{"username":"e","password":"t"}}}]}`},
		{"MissingProject", jiraReceiverJSON("", "Task", true)},
		{"MissingIssueType", jiraReceiverJSON("KAN", "", true)},
		{"Cloud_MissingBasicAuth", jiraReceiverJSON("KAN", "Task", false)},
		{"InvalidReopenDurationFormat", `{"name":"j","jira_configs":[{"site":"https://acme.atlassian.net","project":"KAN","issue_type":"Task","reopen_duration":"3days","http_config":{"basic_auth":{"username":"e","password":"t"}}}]}`},
		{"SelfHosted_MissingAuthorization", jiraSelfHostedReceiverJSON(``)},
		{"SelfHosted_BasicAuthOnly", jiraSelfHostedReceiverJSON(`,"http_config":{"basic_auth":{"username":"e","password":"t"}}`)},
		{"SelfHosted_BasicAuthNextToBearer", jiraSelfHostedReceiverJSON(`,"http_config":{"basic_auth":{"username":"e","password":"t"},"authorization":{"type":"Bearer","credentials":"p"}}`)},
		{"SelfHosted_EmptyCredentials", jiraSelfHostedReceiverJSON(`,"http_config":{"authorization":{"type":"Bearer"}}`)},
		{"UnknownDeployment", `{"name":"j","jira_configs":[{"deployment":"onprem","site":"https://jira.acme.com","project":"KAN","issue_type":"Task","http_config":{"authorization":{"type":"Bearer","credentials":"p"}}}]}`},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			_, err := NewReceiver(testCase.json)
			assert.Error(t, err)
		})
	}
}

func TestChannelJiraConfigUnmarshal(t *testing.T) {
	testCases := []struct {
		name             string
		json             string
		expectErr        string
		expectDeployment JiraDeployment
	}{
		{"Cloud_Explicit", `{"deployment":"cloud","site":"https://acme.atlassian.net","project":"OPS","issueType":"Task","auth":{"email":"e","apiToken":"t"}}`, "", JiraDeploymentCloud},
		{"SelfHosted_WithPAT", `{"deployment":"selfhosted","site":"https://jira.acme.com","project":"OPS","issueType":"Task","auth":{"pat":"p"}}`, "", JiraDeploymentSelfHosted},
		{"MissingDeployment_Rejected", `{"site":"https://acme.atlassian.net","project":"OPS","issueType":"Task","auth":{"email":"e","apiToken":"t"}}`, "config.spec.deployment is required for a jira channel", JiraDeployment{}},
		{"MissingAuth_Rejected", `{"deployment":"cloud","site":"https://acme.atlassian.net","project":"OPS","issueType":"Task"}`, "config.spec.auth is required for a jira channel", JiraDeploymentCloud},
		{"AuthUnknownField_Rejected", `{"deployment":"cloud","site":"https://acme.atlassian.net","project":"OPS","issueType":"Task","auth":{"email":"e","apiToken":"t","token":"x"}}`, `unknown field "token"`, JiraDeploymentCloud},
		{"AuthNotObject_Rejected", `{"deployment":"cloud","site":"https://acme.atlassian.net","project":"OPS","issueType":"Task","auth":"e:t"}`, "cannot unmarshal string", JiraDeploymentCloud},
		{"RootCredentials_Rejected", `{"deployment":"cloud","site":"https://acme.atlassian.net","project":"OPS","issueType":"Task","email":"e","apiToken":"t"}`, `unknown field "email"`, JiraDeploymentCloud},
		{"Cloud_MissingEmail", `{"deployment":"cloud","site":"https://acme.atlassian.net","project":"OPS","issueType":"Task","auth":{"apiToken":"t"}}`, "config.spec.auth.email is required for a jira cloud channel", JiraDeploymentCloud},
		{"Cloud_MissingAPIToken", `{"deployment":"cloud","site":"https://acme.atlassian.net","project":"OPS","issueType":"Task","auth":{"email":"e"}}`, "config.spec.auth.apiToken is required for a jira cloud channel", JiraDeploymentCloud},
		{"Cloud_WithPAT_Rejected", `{"deployment":"cloud","site":"https://acme.atlassian.net","project":"OPS","issueType":"Task","auth":{"email":"e","apiToken":"t","pat":"p"}}`, `unknown field "pat"`, JiraDeploymentCloud},
		{"SelfHosted_MissingPAT", `{"deployment":"selfhosted","site":"https://jira.acme.com","project":"OPS","issueType":"Task","auth":{}}`, "config.spec.auth.pat is required for a self-hosted jira channel", JiraDeploymentSelfHosted},
		{"SelfHosted_WithEmail_Rejected", `{"deployment":"selfhosted","site":"https://jira.acme.com","project":"OPS","issueType":"Task","auth":{"pat":"p","email":"e"}}`, `unknown field "email"`, JiraDeploymentSelfHosted},
		{"UnknownDeployment", `{"deployment":"onprem","site":"https://jira.acme.com","project":"OPS","issueType":"Task","auth":{"pat":"p"}}`, `config.spec.deployment "onprem" is not supported`, JiraDeployment{}},
		{"EmptyDeployment_Rejected", `{"deployment":"","site":"https://jira.acme.com","project":"OPS","issueType":"Task","auth":{"pat":"p"}}`, "string must not be empty", JiraDeployment{}},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			var spec ChannelJiraConfig
			err := json.Unmarshal([]byte(testCase.json), &spec)
			if testCase.expectErr != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), testCase.expectErr)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, testCase.expectDeployment, spec.Deployment)
		})
	}
}

func TestChannelJiraConfigReceiverAuth(t *testing.T) {
	testCases := []struct {
		name          string
		spec          ChannelJiraConfig
		expectBasic   *commoncfg.BasicAuth
		expectBearer  string
		expectJSONKey string
	}{
		{
			name:          "Cloud_BasicAuth",
			spec:          ChannelJiraConfig{Deployment: JiraDeploymentCloud, Site: "https://acme.atlassian.net", Project: "OPS", IssueType: "Task", Auth: ChannelJiraAuth{JiraAuth: ChannelJiraCloudAuth{Email: "e@acme.com", APIToken: "t"}}},
			expectBasic:   &commoncfg.BasicAuth{Username: "e@acme.com", Password: "t"},
			expectJSONKey: `"basic_auth"`,
		},
		{
			name:          "SelfHosted_BearerAuthorization",
			spec:          ChannelJiraConfig{Deployment: JiraDeploymentSelfHosted, Site: "https://jira.acme.com", Project: "OPS", IssueType: "Task", Auth: ChannelJiraAuth{JiraAuth: ChannelJiraSelfHostedAuth{PAT: "p"}}},
			expectBearer:  "p",
			expectJSONKey: `"deployment":"selfhosted"`,
		},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			receiver, err := testCase.spec.toUndefaultedReceiver("jira")
			require.NoError(t, err)
			require.Len(t, receiver.JiraConfigs, 1)
			httpConfig := receiver.JiraConfigs[0].HTTPConfig
			require.NotNil(t, httpConfig)

			assert.Equal(t, testCase.spec.Deployment, receiver.JiraConfigs[0].Deployment)
			assert.Equal(t, testCase.expectBasic, httpConfig.BasicAuth)
			if testCase.expectBearer == "" {
				assert.Nil(t, httpConfig.Authorization)
			} else {
				require.NotNil(t, httpConfig.Authorization)
				assert.Equal(t, "Bearer", httpConfig.Authorization.Type)
				assert.Equal(t, commoncfg.Secret(testCase.expectBearer), httpConfig.Authorization.Credentials)
			}

			encoded, err := json.Marshal(receiver)
			require.NoError(t, err)
			assert.Contains(t, string(encoded), testCase.expectJSONKey)
		})
	}
}

func TestChannelJiraAuthJSONSchema(t *testing.T) {
	reflector := jsonschema.Reflector{}
	schema, err := reflector.Reflect(ChannelJiraAuth{})
	require.NoError(t, err)

	assert.Empty(t, schema.OneOf)
	assert.Empty(t, schema.Required)
	require.Len(t, schema.Properties, 3)

	testCases := []struct {
		name     string
		property string
		format   string
	}{
		{name: "Email_Optional_PlainString", property: "email"},
		{name: "APIToken_Optional_Password", property: "apiToken", format: "password"},
		{name: "PAT_Optional_Password", property: "pat", format: "password"},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			property, ok := schema.Properties[testCase.property]
			require.True(t, ok)
			require.NotNil(t, property.TypeObject)

			raw, err := json.Marshal(property.TypeObject)
			require.NoError(t, err)

			var got struct {
				Type        string `json:"type"`
				Format      string `json:"format"`
				Description string `json:"description"`
			}
			require.NoError(t, json.Unmarshal(raw, &got))

			assert.Equal(t, "string", got.Type)
			assert.Equal(t, testCase.format, got.Format)
			assert.NotEmpty(t, got.Description)
		})
	}
}
