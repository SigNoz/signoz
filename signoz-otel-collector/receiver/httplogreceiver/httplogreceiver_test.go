package httplogreceiver

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.opentelemetry.io/collector/component/componenttest"
	"go.opentelemetry.io/collector/consumer/consumertest"
	"go.opentelemetry.io/collector/receiver/receivertest"
)

func TestCreateDefaultConfig(t *testing.T) {
	factory := NewFactory()
	cfg := factory.CreateDefaultConfig()
	assert.NotNil(t, cfg, "failed to create default config")
	assert.NoError(t, componenttest.CheckConfigStruct(cfg))
}

func TestCreateReceiverLogsFirst(t *testing.T) {
	factory := NewFactory()
	cfg := factory.CreateDefaultConfig().(*Config)
	cfg.Endpoint = "localhost:1" // Endpoint is required, not going to be used here.

	lReceiver, err := factory.CreateLogsReceiver(context.Background(), receivertest.NewNopCreateSettings(), cfg, consumertest.NewNop())
	assert.Nil(t, err, "receiver creation failed")
	assert.NotNil(t, lReceiver, "receiver creation failed")
}
