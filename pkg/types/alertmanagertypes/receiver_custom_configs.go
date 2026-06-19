package alertmanagertypes

import (
	"encoding/json"
	"strings"
)

const (
	channelTypeJsmOps          = "jsmops"
	receiverFieldJsmOpsConfigs = "jsmops_configs"
)

// JsmOpsReceiverConfig represents a JSM Ops notification configuration.
type JsmOpsReceiverConfig struct {
	ConnectionID      string   `json:"connection_id,omitempty" yaml:"connection_id,omitempty"`
	OrgID             string   `json:"-" yaml:"-"`
	Responders        []string `json:"responders,omitempty" yaml:"responders,omitempty"`
	Message           string   `json:"message" yaml:"message"`
	Description       string   `json:"description" yaml:"description"`
	Tags              []string `json:"tags,omitempty" yaml:"tags,omitempty"`
	Priority          string   `json:"priority,omitempty" yaml:"priority,omitempty"`
	SendResolvedValue bool     `json:"send_resolved" yaml:"send_resolved"`
}

// SendResolved returns whether resolved notifications should be sent.
func (c *JsmOpsReceiverConfig) SendResolved() bool {
	return c != nil && c.SendResolvedValue
}

var customReceiverFields = map[string]struct{}{
	receiverFieldJsmOpsConfigs: {},
}

type customReceiverConfigAdapter struct {
	field      string
	hasConfigs func(*Receiver) bool
	getConfigs func(*Receiver) interface{}
}

var customReceiverConfigAdapters = []customReceiverConfigAdapter{
	{
		field: receiverFieldJsmOpsConfigs,
		hasConfigs: func(receiver *Receiver) bool {
			return len(receiver.JsmOpsConfigs) > 0
		},
		getConfigs: func(receiver *Receiver) interface{} {
			return receiver.JsmOpsConfigs
		},
	},
}

func isCustomReceiverField(field string) bool {
	_, ok := customReceiverFields[field]
	return ok
}

func extractReceiverConfigList[T any](rawData map[string]interface{}, key string) []*T {
	var configs []*T

	rawConfigs, exists := rawData[key]
	if !exists || rawConfigs == nil {
		return configs
	}

	configList, ok := rawConfigs.([]interface{})
	if !ok {
		delete(rawData, key)
		return configs
	}

	for _, cfg := range configList {
		cfgMap, ok := cfg.(map[string]interface{})
		if !ok {
			continue
		}

		data, err := json.Marshal(cfgMap)
		if err != nil {
			continue
		}

		var parsed T
		if err := json.Unmarshal(data, &parsed); err != nil {
			continue
		}

		configs = append(configs, &parsed)
	}

	delete(rawData, key)
	return configs
}

func marshalReceiverWithCustomConfigs(receiver *Receiver, baseReceiverJSON []byte) (string, []byte, bool, error) {
	var receiverData map[string]interface{}
	if err := json.Unmarshal(baseReceiverJSON, &receiverData); err != nil {
		return "", nil, false, err
	}

	customChannelType := ""
	hasCustomConfigs := false

	for _, adapter := range customReceiverConfigAdapters {
		if !adapter.hasConfigs(receiver) {
			continue
		}

		if customChannelType == "" {
			customChannelType = strings.TrimSuffix(adapter.field, "_configs")
		}

		receiverData[adapter.field] = adapter.getConfigs(receiver)
		hasCustomConfigs = true
	}

	if !hasCustomConfigs {
		return "", nil, false, nil
	}

	dataWithCustomConfigs, err := json.Marshal(receiverData)
	if err != nil {
		return "", nil, false, err
	}

	return customChannelType, dataWithCustomConfigs, true, nil
}
