package alertmanagertypes

import (
	"encoding/json"
	"net/url"
	"testing"

	"github.com/prometheus/alertmanager/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestExtractReceiverConfigList(t *testing.T) {
	rawData := map[string]interface{}{
		"name": "googlechat-receiver",
		"googlechat_configs": []interface{}{
			map[string]interface{}{
				"webhook_url":  "https://chat.googleapis.com/v1/spaces/test/messages",
				"title":        "Alert",
				"text":         "Body",
				"send_resolved": true,
			},
		},
	}

	configs := extractReceiverConfigList[GoogleChatReceiverConfig](rawData, receiverFieldGoogleChatConfigs)
	require.Len(t, configs, 1)
	assert.Equal(t, "Alert", configs[0].Title)

	_, exists := rawData[receiverFieldGoogleChatConfigs]
	assert.False(t, exists)
}

func TestExtractReceiverConfigListSkipsInvalidShape(t *testing.T) {
	rawData := map[string]interface{}{
		"name":                "googlechat-receiver",
		"googlechat_configs": "invalid",
	}

	configs := extractReceiverConfigList[GoogleChatReceiverConfig](rawData, receiverFieldGoogleChatConfigs)
	assert.Empty(t, configs)

	_, exists := rawData[receiverFieldGoogleChatConfigs]
	assert.False(t, exists)
}

func TestMarshalReceiverWithCustomConfigs(t *testing.T) {
	webhookURL, err := url.Parse("https://chat.googleapis.com/v1/spaces/test/messages")
	require.NoError(t, err)

	receiver := &Receiver{
		Receiver: &config.Receiver{Name: "googlechat-receiver"},
		GoogleChatConfigs: []*GoogleChatReceiverConfig{
			{
				WebhookURL:        &config.SecretURL{URL: webhookURL},
				Title:             "Alert",
				Text:              "Body",
				SendResolvedValue: true,
			},
		},
	}

	baseJSON, err := json.Marshal(receiver.Receiver)
	require.NoError(t, err)

	channelType, data, hasCustom, err := marshalReceiverWithCustomConfigs(receiver, baseJSON)
	require.NoError(t, err)
	assert.True(t, hasCustom)
	assert.Equal(t, channelTypeGoogleChat, channelType)
	assert.JSONEq(t, `{"name":"googlechat-receiver","googlechat_configs":[{"webhook_url":"https://chat.googleapis.com/v1/spaces/test/messages","title":"Alert","text":"Body","send_resolved":true}]}`, string(data))
}

func TestMarshalReceiverWithCustomConfigsSkipsEmpty(t *testing.T) {
	receiver := &Receiver{Receiver: &config.Receiver{Name: "slack-receiver"}}

	baseJSON, err := json.Marshal(receiver.Receiver)
	require.NoError(t, err)

	channelType, data, hasCustom, err := marshalReceiverWithCustomConfigs(receiver, baseJSON)
	require.NoError(t, err)
	assert.False(t, hasCustom)
	assert.Empty(t, channelType)
	assert.Nil(t, data)
}
