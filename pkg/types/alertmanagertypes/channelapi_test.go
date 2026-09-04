package alertmanagertypes

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/util/validation"
)

func TestPostableChannelUnmarshalJSONDecodesSpecByType(t *testing.T) {
	testCases := []struct {
		description  string
		body         string
		expectedKind ChannelKind
		expectedSpec ChannelSpec
	}{
		{
			description:  "slack",
			body:         `{"name":"oncall","config":{"kind":"slack","spec":{"apiUrl":"https://hooks.slack.com/services/T/B/X","channel":"#alerts","title":"slack title","text":"slack text"}}}`,
			expectedKind: ChannelKindSlack,
			expectedSpec: &ChannelSlackConfig{APIURL: "https://hooks.slack.com/services/T/B/X", Channel: "#alerts", Title: "slack title", Text: "slack text"},
		},
		{
			description:  "email",
			body:         `{"name":"team","config":{"kind":"email","spec":{"to":"team@example.com","html":"<p>body</p>"}}}`,
			expectedKind: ChannelKindEmail,
			expectedSpec: &ChannelEmailConfig{To: "team@example.com", HTML: "<p>body</p>"},
		},
		{
			description:  "webhook with basic auth",
			body:         `{"name":"hook","config":{"kind":"webhook","spec":{"url":"https://example.com/hook","username":"u","password":"p"}}}`,
			expectedKind: ChannelKindWebhook,
			expectedSpec: &ChannelWebhookConfig{URL: "https://example.com/hook", Username: "u", Password: "p"},
		},
		{
			description:  "webhook with bearer token",
			body:         `{"name":"hook","config":{"kind":"webhook","spec":{"url":"https://example.com/hook","bearerToken":"tok"}}}`,
			expectedKind: ChannelKindWebhook,
			expectedSpec: &ChannelWebhookConfig{URL: "https://example.com/hook", BearerToken: "tok"},
		},
		{
			description:  "pagerduty",
			body:         `{"name":"pd","config":{"kind":"pagerduty","spec":{"routingKey":"abc","severity":"critical","description":"pd description"}}}`,
			expectedKind: ChannelKindPagerduty,
			expectedSpec: &ChannelPagerdutyConfig{RoutingKey: "abc", Severity: "critical", Description: "pd description"},
		},
		{
			description:  "opsgenie",
			body:         `{"name":"og","config":{"kind":"opsgenie","spec":{"apiKey":"key","priority":"P1","apiUrl":"https://api.eu.opsgenie.com","message":"og message","description":"og description"}}}`,
			expectedKind: ChannelKindOpsgenie,
			expectedSpec: &ChannelOpsgenieConfig{APIKey: "key", Priority: "P1", APIURL: "https://api.eu.opsgenie.com", Message: "og message", Description: "og description"},
		},
		{
			description:  "msteams",
			body:         `{"name":"teams","config":{"kind":"msteams","spec":{"webhookUrl":"https://teams.example.com/hook","title":"teams title","text":"teams text"}}}`,
			expectedKind: ChannelKindMSTeams,
			expectedSpec: &ChannelMSTeamsConfig{WebhookURL: "https://teams.example.com/hook", Title: "teams title", Text: "teams text"},
		},
		{
			description:  "googlechat",
			body:         `{"name":"chat","config":{"kind":"googlechat","spec":{"webhookUrl":"https://chat.example.com/hook","title":"chat title","text":"chat text"}}}`,
			expectedKind: ChannelKindGoogleChat,
			expectedSpec: &ChannelGoogleChatConfig{WebhookURL: "https://chat.example.com/hook", Title: "chat title", Text: "chat text"},
		},
		{
			description:  "jira",
			body:         `{"name":"jira","config":{"kind":"jira","spec":{"site":"https://acme.atlassian.net","project":"OPS","issueType":"Bug","email":"oncall@acme.com","apiToken":"api-token","summary":"jira summary","description":"jira description","reopenDuration":"3d","customFields":{"customfield_10010":"Ops"}}}}`,
			expectedKind: ChannelKindJira,
			expectedSpec: &ChannelJiraConfig{
				Site: "https://acme.atlassian.net", Project: "OPS", IssueType: "Bug",
				Email: "oncall@acme.com", APIToken: "api-token",
				Summary: "jira summary", Description: "jira description", ReopenDuration: "3d",
				CustomFields: map[string]any{"customfield_10010": "Ops"},
			},
		},
		{
			description:  "jsmops",
			body:         `{"name":"jsm","config":{"kind":"jsmops","spec":{"apiKey":"api-key","message":"jsmops message","description":"jsmops description","tags":"signoz"}}}`,
			expectedKind: ChannelKindJSMOps,
			expectedSpec: &ChannelJSMOpsConfig{APIKey: "api-key", Message: "jsmops message", Description: "jsmops description", Tags: "signoz"},
		},
		{
			description:  "incidentio",
			body:         `{"name":"io","config":{"kind":"incidentio","spec":{"url":"https://api.incident.io/v2/alert_events/http/01ABC","token":"token","title":"incidentio title","description":"incidentio description"}}}`,
			expectedKind: ChannelKindIncidentIO,
			expectedSpec: &ChannelIncidentIOConfig{
				URL: "https://api.incident.io/v2/alert_events/http/01ABC", Token: "token",
				Title: "incidentio title", Description: "incidentio description",
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.description, func(t *testing.T) {
			var postable PostableNotificationChannel
			require.NoError(t, json.Unmarshal([]byte(testCase.body), &postable))

			assert.Equal(t, testCase.expectedKind, postable.Config.Kind)
			assert.Equal(t, testCase.expectedSpec, postable.Config.Spec)
			assert.NoError(t, postable.Validate())
		})
	}
}

func TestPostableChannelUnmarshalJSONRejectsBadInput(t *testing.T) {
	testCases := []struct {
		description string
		body        string
	}{
		{
			description: "unknown type",
			body:        `{"name":"x","config":{"kind":"telegram","spec":{"chatId":"1"}}}`,
		},
		{
			description: "empty type",
			body:        `{"name":"x","config":{"spec":{"to":"a@b.c"}}}`,
		},
		{
			description: "missing spec",
			body:        `{"name":"x","config":{"kind":"slack"}}`,
		},
		{
			description: "spec field belonging to another type",
			body:        `{"name":"x","config":{"kind":"slack","spec":{"apiUrl":"https://a","channel":"#c","title":"slack title","text":"slack text","to":"a@b.c"}}}`,
		},
		{
			description: "spec field misspelled",
			body:        `{"name":"x","config":{"kind":"email","spec":{"too":"a@b.c"}}}`,
		},
		{
			description: "unknown field alongside type and spec",
			body:        `{"name":"x","config":{"kind":"slack","bogus":1,"spec":{"apiUrl":"https://a","channel":"#c","title":"slack title","text":"slack text"}}}`,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.description, func(t *testing.T) {
			var postable PostableNotificationChannel
			assert.Error(t, json.Unmarshal([]byte(testCase.body), &postable))
		})
	}
}

func TestPostableChannelValidate(t *testing.T) {
	testCases := []struct {
		description   string
		postable      PostableNotificationChannel
		expectedError bool
	}{
		{
			description: "valid",
			postable: PostableNotificationChannel{
				Name:        "oncall",
				DisplayName: "oncall",
				Config:      ChannelConfig{Kind: ChannelKindSlack, Spec: &ChannelSlackConfig{APIURL: "https://a", Channel: "#c", Title: "slack title", Text: "slack text"}},
			},
			expectedError: false,
		},
		{
			description: "missing name",
			postable: PostableNotificationChannel{
				Config: ChannelConfig{Kind: ChannelKindSlack, Spec: &ChannelSlackConfig{APIURL: "https://a", Channel: "#c", Title: "slack title", Text: "slack text"}},
			},
			expectedError: true,
		},
		{
			description: "reserved name",
			postable: PostableNotificationChannel{
				Name:        DefaultReceiverName,
				DisplayName: DefaultReceiverName,
				Config:      ChannelConfig{Kind: ChannelKindSlack, Spec: &ChannelSlackConfig{APIURL: "https://a", Channel: "#c", Title: "slack title", Text: "slack text"}},
			},
			expectedError: true,
		},
		{
			description: "slack without a channel",
			postable: PostableNotificationChannel{
				Name:        "oncall",
				DisplayName: "oncall",
				Config:      ChannelConfig{Kind: ChannelKindSlack, Spec: &ChannelSlackConfig{APIURL: "https://a", Title: "slack title", Text: "slack text"}},
			},
			expectedError: false,
		},
		{
			description: "email missing recipient",
			postable: PostableNotificationChannel{
				Name:        "team",
				DisplayName: "team",
				Config:      ChannelConfig{Kind: ChannelKindEmail, Spec: &ChannelEmailConfig{}},
			},
			expectedError: true,
		},
		{
			description: "webhook password without username",
			postable: PostableNotificationChannel{
				Name:        "hook",
				DisplayName: "hook",
				Config:      ChannelConfig{Kind: ChannelKindWebhook, Spec: &ChannelWebhookConfig{URL: "https://a", Password: "p"}},
			},
			expectedError: true,
		},
		{
			description: "webhook bearer token combined with basic auth",
			postable: PostableNotificationChannel{
				Name:        "hook",
				DisplayName: "hook",
				Config:      ChannelConfig{Kind: ChannelKindWebhook, Spec: &ChannelWebhookConfig{URL: "https://a", Username: "u", Password: "p", BearerToken: "tok"}},
			},
			expectedError: true,
		},
		{
			description: "jira without an api token",
			postable: PostableNotificationChannel{
				Name:        "jira",
				DisplayName: "jira",
				Config: ChannelConfig{Kind: ChannelKindJira, Spec: &ChannelJiraConfig{
					Site: "https://acme.atlassian.net", Project: "OPS", IssueType: "Bug",
					Email: "oncall@acme.com", Summary: "jira summary", Description: "jira description",
				}},
			},
			expectedError: true,
		},
		{
			description: "jira with an unparseable reopen duration",
			postable: PostableNotificationChannel{
				Name:        "jira",
				DisplayName: "jira",
				Config: ChannelConfig{Kind: ChannelKindJira, Spec: &ChannelJiraConfig{
					Site: "https://acme.atlassian.net", Project: "OPS", IssueType: "Bug",
					Email: "oncall@acme.com", APIToken: "api-token",
					Summary: "jira summary", Description: "jira description", ReopenDuration: "three days",
				}},
			},
			expectedError: true,
		},
		{
			description: "jsmops without an api key",
			postable: PostableNotificationChannel{
				Name:        "jsm",
				DisplayName: "jsm",
				Config:      ChannelConfig{Kind: ChannelKindJSMOps, Spec: &ChannelJSMOpsConfig{Message: "jsmops message", Description: "jsmops description"}},
			},
			expectedError: true,
		},
		{
			description: "incidentio without a token",
			postable: PostableNotificationChannel{
				Name:        "io",
				DisplayName: "io",
				Config: ChannelConfig{Kind: ChannelKindIncidentIO, Spec: &ChannelIncidentIOConfig{
					URL: "https://api.incident.io/v2/alert_events/http/01ABC", Title: "incidentio title", Description: "incidentio description",
				}},
			},
			expectedError: true,
		},
		{
			description: "nil spec",
			postable: PostableNotificationChannel{
				Name:        "oncall",
				DisplayName: "oncall",
				Config:      ChannelConfig{Kind: ChannelKindSlack},
			},
			expectedError: true,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.description, func(t *testing.T) {
			err := testCase.postable.Validate()
			if testCase.expectedError {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
		})
	}
}

// Binding resolves both names, so nothing downstream has to know whether the
// caller supplied an internal name or asked for one to be generated.
func TestPostableChannelUnmarshalJSONResolvesNames(t *testing.T) {
	testCases := []struct {
		description         string
		body                string
		expectedName        string
		expectedNamePrefix  string
		expectedDisplayName string
	}{
		{
			description:         "display name defaults to the internal name",
			body:                `{"name":"oncall","config":{"kind":"slack","spec":{"apiUrl":"https://a","channel":"#c","title":"slack title","text":"slack text"}}}`,
			expectedName:        "oncall",
			expectedDisplayName: "oncall",
		},
		{
			description:         "both names kept when both are sent",
			body:                `{"name":"staging-alerts","displayName":"#staging alerts","config":{"kind":"slack","spec":{"apiUrl":"https://a","channel":"#c","title":"slack title","text":"slack text"}}}`,
			expectedName:        "staging-alerts",
			expectedDisplayName: "#staging alerts",
		},
		{
			description:         "generateName slugifies the display name",
			body:                `{"generateName":true,"displayName":"#staging alerts","config":{"kind":"slack","spec":{"apiUrl":"https://a","channel":"#c","title":"slack title","text":"slack text"}}}`,
			expectedNamePrefix:  "staging-alerts-",
			expectedDisplayName: "#staging alerts",
		},
		{
			description:         "generateName falls back to a bare suffix when the display name slugifies to nothing",
			body:                `{"generateName":true,"displayName":"###","config":{"kind":"slack","spec":{"apiUrl":"https://a","channel":"#c","title":"slack title","text":"slack text"}}}`,
			expectedDisplayName: "###",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.description, func(t *testing.T) {
			var postable PostableNotificationChannel
			require.NoError(t, json.Unmarshal([]byte(testCase.body), &postable))

			assert.Equal(t, testCase.expectedDisplayName, postable.DisplayName)
			assert.Empty(t, validation.IsDNS1123Label(postable.Name))

			if testCase.expectedName != "" {
				assert.Equal(t, testCase.expectedName, postable.Name)
			}
			if testCase.expectedNamePrefix != "" {
				assert.True(t, strings.HasPrefix(postable.Name, testCase.expectedNamePrefix),
					"expected %q to start with %q", postable.Name, testCase.expectedNamePrefix)
			}
		})
	}
}

func TestPostableChannelUnmarshalJSONRejectsInvalidNames(t *testing.T) {
	testCases := []struct {
		description string
		body        string
	}{
		{
			description: "name is not a DNS1123 label",
			body:        `{"name":"#staging-alerts","config":{"kind":"slack","spec":{"apiUrl":"https://a","channel":"#c","title":"slack title","text":"slack text"}}}`,
		},
		{
			description: "name carries uppercase and spaces",
			body:        `{"name":"On Call","config":{"kind":"slack","spec":{"apiUrl":"https://a","channel":"#c","title":"slack title","text":"slack text"}}}`,
		},
		{
			description: "no name and no generateName",
			body:        `{"displayName":"#staging alerts","config":{"kind":"slack","spec":{"apiUrl":"https://a","channel":"#c","title":"slack title","text":"slack text"}}}`,
		},
		{
			description: "generateName alongside an explicit name",
			body:        `{"generateName":true,"name":"staging-alerts","displayName":"#staging alerts","config":{"kind":"slack","spec":{"apiUrl":"https://a","channel":"#c","title":"slack title","text":"slack text"}}}`,
		},
		{
			description: "generateName without a display name to derive from",
			body:        `{"generateName":true,"config":{"kind":"slack","spec":{"apiUrl":"https://a","channel":"#c","title":"slack title","text":"slack text"}}}`,
		},
		{
			description: "display name is the reserved receiver name",
			body:        `{"name":"staging-alerts","displayName":"default-receiver","config":{"kind":"slack","spec":{"apiUrl":"https://a","channel":"#c","title":"slack title","text":"slack text"}}}`,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.description, func(t *testing.T) {
			var postable PostableNotificationChannel
			assert.Error(t, json.Unmarshal([]byte(testCase.body), &postable))
		})
	}
}

// A GettableNotificationChannel must marshal to the PostableNotificationChannel shape plus the
// server-owned fields, so a client can read one and post it back.
func TestGettableChannelMarshalsAsPostablePlusServerFields(t *testing.T) {
	gettable := GettableNotificationChannel{
		Name:        "oncall",
		DisplayName: "#oncall",
		Config:      ChannelConfig{Kind: ChannelKindSlack, Spec: &ChannelSlackConfig{APIURL: "https://a", Channel: "#c", Title: "slack title", Text: "slack text"}},
	}

	raw, err := json.Marshal(gettable)
	require.NoError(t, err)

	var decoded map[string]any
	require.NoError(t, json.Unmarshal(raw, &decoded))

	assert.ElementsMatch(t, []string{"name", "displayName", "config", "id", "createdAt", "updatedAt"}, channelKeysOf(decoded))

	config, ok := decoded["config"].(map[string]any)
	require.True(t, ok)
	assert.ElementsMatch(t, []string{"kind", "spec"}, channelKeysOf(config))
	assert.Equal(t, "slack", config["kind"])
}

// Only a caller assembling the struct can pair a kind with another kind's spec;
// a decoded config builds the spec from the kind. Left unchecked the conversion
// to a receiver, which switches on the spec's type, would write a channel of the
// spec's kind under the declared one.
func TestChannelConfigValidateRejectsSpecOfAnotherKind(t *testing.T) {
	config := ChannelConfig{
		Kind: ChannelKindSlack,
		Spec: &ChannelEmailConfig{To: "team@example.com", HTML: "<p>body</p>"},
	}

	err := config.Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "does not match kind")
}

func channelKeysOf(m map[string]any) []string {
	keys := make([]string, 0, len(m))
	for key := range m {
		keys = append(keys, key)
	}
	return keys
}
