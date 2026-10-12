package sqlmigration

import (
	"encoding/json"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// The migration duplicates the current defaults (migrations stay import-free);
// this pins the copies to the shipped consts.
func TestChannelDefaultTemplatesMatchShippedDefaults(t *testing.T) {
	assert.Equal(t, alertmanagertypes.DefaultJSMOpsDescriptionTemplate, markdownDefaultDescriptionCurrent)
	assert.Equal(t, alertmanagertypes.DefaultIncidentIODescriptionTemplate, markdownDefaultDescriptionCurrent)
}

func TestUpgradeReceiverDefaultTemplates(t *testing.T) {
	testCases := []struct {
		name        string
		receiver    map[string]any
		wantChanged bool
		wantText    string
	}{
		{
			name:        "SlackSeededDefault2026_Upgraded",
			receiver:    map[string]any{"name": "slack-prod", "slack_configs": []any{map[string]any{"api_url": "https://hooks.slack.com/services/x", "text": slackDefaultText2026}}},
			wantChanged: true,
			wantText:    slackDefaultTextCurrent,
		},
		{
			name:        "SlackSeededDefault2024_Upgraded",
			receiver:    map[string]any{"name": "slack-staging", "slack_configs": []any{map[string]any{"text": slackDefaultText2024}}},
			wantChanged: true,
			wantText:    slackDefaultTextCurrent,
		},
		{
			name:        "SlackSeededDefaultPre2024_Upgraded",
			receiver:    map[string]any{"name": "slack-oldest", "slack_configs": []any{map[string]any{"text": slackDefaultTextPre2024}}},
			wantChanged: true,
			wantText:    slackDefaultTextCurrent,
		},
		{
			name:        "CustomizedText_Untouched",
			receiver:    map[string]any{"name": "slack-custom", "slack_configs": []any{map[string]any{"text": "my own template {{ .Annotations.summary }}"}}},
			wantChanged: false,
			wantText:    "my own template {{ .Annotations.summary }}",
		},
		{
			name:        "MSTeamsSharesSlackDefault_Upgraded",
			receiver:    map[string]any{"name": "teams-prod", "msteamsv2_configs": []any{map[string]any{"text": slackDefaultText2026}}},
			wantChanged: true,
			wantText:    slackDefaultTextCurrent,
		},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			data, err := marshalJSONNoHTMLEscape(testCase.receiver)
			require.NoError(t, err)

			upgraded, changed, err := upgradeReceiverDefaultTemplates(data)
			require.NoError(t, err)
			assert.Equal(t, testCase.wantChanged, changed)

			parsed := map[string]any{}
			require.NoError(t, json.Unmarshal([]byte(upgraded), &parsed))
			for _, key := range []string{"slack_configs", "msteamsv2_configs"} {
				configs, ok := parsed[key].([]any)
				if !ok {
					continue
				}
				assert.Equal(t, testCase.wantText, configs[0].(map[string]any)["text"])
			}
			assert.Equal(t, testCase.receiver["name"], parsed["name"])
		})
	}
}

func TestUpgradeReceiverDefaultTemplates_MarkdownDescription(t *testing.T) {
	data, err := marshalJSONNoHTMLEscape(map[string]any{"name": "incidentio-prod", "incidentio_configs": []any{map[string]any{"url": "https://api.incident.io/v2/alert_events/http/x", "description": markdownDefaultDescription2026}}})
	require.NoError(t, err)

	upgraded, changed, err := upgradeReceiverDefaultTemplates(data)
	require.NoError(t, err)
	assert.True(t, changed)

	parsed := map[string]any{}
	require.NoError(t, json.Unmarshal([]byte(upgraded), &parsed))
	config := parsed["incidentio_configs"].([]any)[0].(map[string]any)
	assert.Equal(t, markdownDefaultDescriptionCurrent, config["description"])
	assert.Equal(t, "https://api.incident.io/v2/alert_events/http/x", config["url"])
}

func TestUpgradeSpecDefaultTemplate(t *testing.T) {
	testCases := []struct {
		name        string
		rowType     string
		spec        map[string]any
		wantChanged bool
		wantField   string
		wantValue   string
	}{
		{
			name:        "SlackSpecSeededDefault_Upgraded",
			rowType:     "slack",
			spec:        map[string]any{"send_resolved": true, "text": slackDefaultText2026},
			wantChanged: true,
			wantField:   "text",
			wantValue:   slackDefaultTextCurrent,
		},
		{
			name:        "JSMOpsSpecSeededDefault_Upgraded",
			rowType:     "jsmops",
			spec:        map[string]any{"description": markdownDefaultDescription2026},
			wantChanged: true,
			wantField:   "description",
			wantValue:   markdownDefaultDescriptionCurrent,
		},
		{
			name:        "CustomizedSpec_Untouched",
			rowType:     "slack",
			spec:        map[string]any{"text": "mine"},
			wantChanged: false,
			wantField:   "text",
			wantValue:   "mine",
		},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			spec, err := marshalJSONNoHTMLEscape(testCase.spec)
			require.NoError(t, err)

			upgraded, changed, err := upgradeSpecDefaultTemplate(testCase.rowType, spec)
			require.NoError(t, err)
			assert.Equal(t, testCase.wantChanged, changed)

			parsed := map[string]any{}
			require.NoError(t, json.Unmarshal([]byte(upgraded), &parsed))
			assert.Equal(t, testCase.wantValue, parsed[testCase.wantField])
		})
	}
}

func TestUpgradeSpecDefaultTemplate_EmptySpec(t *testing.T) {
	upgraded, changed, err := upgradeSpecDefaultTemplate("slack", "")
	require.NoError(t, err)
	assert.False(t, changed)
	assert.Empty(t, upgraded)
}
