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
				"connection_id": "conn-123",
				"responders":    []interface{}{"team-1"},
				"message":       "Alert",
				"description":   "Body",
				"send_resolved": true,
			},
		},
	}

	configs := extractReceiverConfigList[JsmOpsReceiverConfig](rawData, receiverFieldJsmOpsConfigs)
	require.Len(t, configs, 1)
	assert.Equal(t, "conn-123", configs[0].ConnectionID)

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
				ConnectionID:      "conn-123",
				OrgID:             "org-1",
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
	assert.JSONEq(t, `{"name":"jsmops-receiver","jsmops_configs":[{"connection_id":"conn-123","responders":["team-1"],"message":"Alert","description":"Body","send_resolved":true}]}`, string(data))
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
