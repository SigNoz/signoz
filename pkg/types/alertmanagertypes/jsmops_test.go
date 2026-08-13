package alertmanagertypes

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestJSMOpsReceiverConfigDefaults(t *testing.T) {
	r, err := NewReceiver(`{"name":"jsm","jsmops_configs":[{"api_key":"key-123"}]}`)
	require.NoError(t, err)
	require.Len(t, r.JSMOpsConfigs, 1)

	c := r.JSMOpsConfigs[0]
	assert.Equal(t, "key-123", string(c.APIKey))
	assert.Equal(t, DefaultJSMOpsMessageTemplate, c.Message)
	assert.Equal(t, DefaultJSMOpsDescriptionTemplate, c.Description)
	assert.Equal(t, "signoz", c.Tags)
	assert.False(t, c.SendResolved()) // default off when omitted, like other channels

	ch, err := NewChannelFromReceiver(r, "org-1")
	require.NoError(t, err)
	assert.Equal(t, "jsmops", ch.Type)
}

func TestJSMOpsReceiverConfigOverrides(t *testing.T) {
	r, err := NewReceiver(`{"name":"jsm","jsmops_configs":[{"api_key":"k","message":"m","description":"d","priority":"P1","tags":"a,b","send_resolved":true}]}`)
	require.NoError(t, err)
	require.Len(t, r.JSMOpsConfigs, 1)

	c := r.JSMOpsConfigs[0]
	assert.Equal(t, "m", c.Message)
	assert.Equal(t, "d", c.Description)
	assert.Equal(t, "P1", c.Priority)
	assert.Equal(t, "a,b", c.Tags)
	assert.True(t, c.SendResolved())
}

func TestJSMOpsReceiverConfigSendResolved(t *testing.T) {
	withSendResolved := func(v bool) string {
		return fmt.Sprintf(`{"name":"jsm","jsmops_configs":[{"api_key":"k","send_resolved":%t}]}`, v)
	}
	on, err := NewReceiver(withSendResolved(true))
	require.NoError(t, err)
	assert.True(t, on.JSMOpsConfigs[0].SendResolved())

	off, err := NewReceiver(withSendResolved(false))
	require.NoError(t, err)
	assert.False(t, off.JSMOpsConfigs[0].SendResolved())
}

func TestJSMOpsReceiverConfigValidation(t *testing.T) {
	cases := []struct {
		name string
		json string
	}{
		{"missing api_key", `{"name":"jsm","jsmops_configs":[{"message":"m"}]}`},
		{"empty api_key", `{"name":"jsm","jsmops_configs":[{"api_key":""}]}`},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			_, err := NewReceiver(c.json)
			assert.Error(t, err)
		})
	}
}
