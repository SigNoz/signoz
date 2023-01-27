package otelconfig

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/confmap"
	"go.opentelemetry.io/collector/receiver/otlpreceiver"
)

func TestConfigUpdaterFromExistingConfig(t *testing.T) {

	config := readYAMLFile(t, "testdata/updater/simple_grpc.yaml")
	cfg, err := Parse(config)
	if err != nil {
		t.Errorf("failed to parse config: %v", err)
	}
	assert.NotNil(t, cfg)

	cfgUpdater, err := NewConfigUpdaterFromYAMLBytes(config)
	assert.Nil(t, err)
	assert.NotNil(t, cfgUpdater)
	componentConfig, exists := cfgUpdater.ReceiverConfig(component.NewID("otlp"))
	assert.True(t, exists)
	assert.NotNil(t, componentConfig)
	otlpConfig := &otlpreceiver.Config{}
	cnf := confmap.New()
	err = cnf.Marshal(componentConfig)
	assert.Nil(t, err)
	otlpConfig.Unmarshal(cnf)
	assert.Equal(t, "http://localhost:6969", otlpConfig.GRPC.NetAddr.Endpoint)

	// Assert that original config is not changed yet
	componentConfig, exists = cfgUpdater.ReceiverConfig(component.NewID("otlp"))
	assert.True(t, exists)
	assert.NotNil(t, componentConfig)
	otlpConfig = &otlpreceiver.Config{}
	cnf = confmap.New()
	err = cnf.Marshal(componentConfig)
	assert.Nil(t, err)
	otlpConfig.Unmarshal(cnf)
	assert.Equal(t, "http://localhost:6969", otlpConfig.GRPC.NetAddr.Endpoint)

	// Actually update the config

	otlpConfig.GRPC.NetAddr.Endpoint = "http://localhost:8080"
	cfgUpdater.SetReceiverConfig(component.NewID("otlp"), otlpConfig)

	componentConfig, exists = cfgUpdater.ReceiverConfig(component.NewID("otlp"))
	assert.True(t, exists)
	assert.NotNil(t, componentConfig)
	otlpConfig = &otlpreceiver.Config{}
	cnf = confmap.New()
	err = cnf.Marshal(componentConfig)
	assert.Nil(t, err)
	otlpConfig.Unmarshal(cnf)
	assert.Equal(t, "http://localhost:8080", otlpConfig.GRPC.NetAddr.Endpoint)
}
