package jsmops

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	commoncfg "github.com/prometheus/common/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestToOpsGenieConfig(t *testing.T) {
	c := &alertmanagertypes.JSMOpsReceiverConfig{
		APIKey:      "key-123",
		Message:     "msg",
		Description: "desc",
		Priority:    "P1",
		Tags:        "signoz",
		HTTPConfig:  &commoncfg.HTTPClientConfig{},
	}

	og, err := toOpsGenieConfig(c)
	require.NoError(t, err)

	// Trailing slash is required: the Opsgenie notifier appends "v2/alerts..."
	// with no separator, yielding /jsm/ops/integration/v2/alerts.
	assert.Equal(t, "https://api.atlassian.com/jsm/ops/integration/", og.APIURL.String())
	assert.Equal(t, "key-123", string(og.APIKey))
	assert.Equal(t, "msg", og.Message)
	assert.Equal(t, "desc", og.Description)
	assert.Equal(t, "P1", og.Priority)
	assert.Equal(t, "signoz", og.Tags)
	assert.Equal(t, source, og.Source)
	assert.Same(t, c.HTTPConfig, og.HTTPConfig)
}

func TestToOpsGenieConfigNilHTTPConfig(t *testing.T) {
	og, err := toOpsGenieConfig(&alertmanagertypes.JSMOpsReceiverConfig{APIKey: "k"})
	require.NoError(t, err)
	assert.NotNil(t, og.HTTPConfig)
}
