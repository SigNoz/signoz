package alertmanagertypes

import (
	"encoding/json"
	"testing"

	"github.com/prometheus/alertmanager/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestExtractReceiverConfigList(t *testing.T) {
	rawData := map[string]interface{}{
		"name": "jsmops-receiver",
		"jsmops_configs": []interface{}{
			map[string]interface{}{
				"email":         "ops@example.com",
				"api_token":     "token",
				"cloud_id":      "cloud",
				"responders":    []interface{}{"team-1"},
				"message":       "Alert",
				"description":   "Body",
				"send_resolved": true,
			},
		},
	}

	configs := extractReceiverConfigList[JsmOpsReceiverConfig](rawData, receiverFieldJsmOpsConfigs)
	require.Len(t, configs, 1)
	assert.Equal(t, "ops@example.com", configs[0].Email)

	_, exists := rawData[receiverFieldJsmOpsConfigs]
	assert.False(t, exists)
}

func TestExtractReceiverConfigListSkipsInvalidShape(t *testing.T) {
	rawData := map[string]interface{}{
		"name":           "jsmops-receiver",
		"jsmops_configs": "invalid",
	}

	configs := extractReceiverConfigList[JsmOpsReceiverConfig](rawData, receiverFieldJsmOpsConfigs)
	assert.Empty(t, configs)

	_, exists := rawData[receiverFieldJsmOpsConfigs]
	assert.False(t, exists)
}

func TestMarshalReceiverWithCustomConfigs(t *testing.T) {
	receiver := &Receiver{
		Receiver: &config.Receiver{Name: "jsmops-receiver"},
		JsmOpsConfigs: []*JsmOpsReceiverConfig{
			{
				Email:             "ops@example.com",
				APIToken:          "token",
				CloudID:           "cloud",
				Responders:        []string{"team-1"},
				Message:           "Alert",
				Description:       "Body",
				SendResolvedValue: true,
			},
		},
	}

	baseJSON, err := json.Marshal(receiver.Receiver)
	require.NoError(t, err)

	channelType, data, hasCustom, err := marshalReceiverWithCustomConfigs(receiver, baseJSON)
	require.NoError(t, err)
	assert.True(t, hasCustom)
	assert.Equal(t, channelTypeJsmOps, channelType)
	assert.JSONEq(t, `{"name":"jsmops-receiver","jsmops_configs":[{"email":"ops@example.com","api_token":"token","cloud_id":"cloud","responders":["team-1"],"message":"Alert","description":"Body","send_resolved":true}]}`, string(data))
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
