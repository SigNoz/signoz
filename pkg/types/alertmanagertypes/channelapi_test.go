package alertmanagertypes

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/util/validation"
)

func TestPostableChannelUnmarshalJSONRejectsBadInput(t *testing.T) {
	testCases := []struct {
		description string
		body        string
	}{
		{
			description: "empty kind",
			body:        `{"name":"x","config":{"spec":{"to":"a@b.c"}}}`,
		},
		{
			description: "missing spec",
			body:        `{"name":"x","config":{"kind":"slack"}}`,
		},
		{
			// A custom UnmarshalJSON receives raw bytes, so the request body's own
			// DisallowUnknownFields never reaches inside config.
			description: "unknown field alongside kind and spec",
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
		description string
		postable    PostableNotificationChannel
	}{
		{
			description: "webhook password without username",
			postable: PostableNotificationChannel{
				Name:        "hook",
				DisplayName: "hook",
				Config:      ChannelConfig{Kind: ChannelKindWebhook, Spec: &ChannelWebhookConfig{URL: "https://a", Password: "p"}},
			},
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
		},
		{
			description: "nil spec",
			postable: PostableNotificationChannel{
				Name:        "oncall",
				DisplayName: "oncall",
				Config:      ChannelConfig{Kind: ChannelKindSlack},
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.description, func(t *testing.T) {
			assert.Error(t, testCase.postable.Validate())
		})
	}
}

// A display name that slugifies to nothing still has to yield a DNS1123 label,
// because the generated name is what every other resource references.
func TestPostableChannelUnmarshalJSONGeneratesANameFromAnUnslugifiableDisplayName(t *testing.T) {
	var postable PostableNotificationChannel
	require.NoError(t, json.Unmarshal([]byte(`{"generateName":true,"displayName":"###","config":{"kind":"slack","spec":{"apiUrl":"https://a","channel":"#c","title":"slack title","text":"slack text"}}}`), &postable))

	assert.Equal(t, "###", postable.DisplayName)
	assert.Empty(t, validation.IsDNS1123Label(postable.Name))
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
