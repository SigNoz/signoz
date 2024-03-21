package opamp

import (
	"os"
	"testing"

	"github.com/open-telemetry/opamp-go/protobufs"
	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
)

func newLogger(t *testing.T) *zap.Logger {
	t.Helper()
	logger, err := zap.NewDevelopment()
	if err != nil {
		t.Fatalf("failed to create logger: %v", err)
	}
	return logger
}

func TestNewDynamicConfigInvalidPath(t *testing.T) {
	cnt := 0
	reloadFunc := func(contents []byte) error {
		cnt++
		return nil
	}

	_, err := NewDynamicConfig("./testdata/collector.yaml", reloadFunc, nil)
	assert.ErrorContains(t, err, "no such file or directory")
}

func TestNewDynamicConfig(t *testing.T) {
	cnt := 0
	reloadFunc := func(contents []byte) error {
		cnt++
		return nil
	}

	_, err := NewDynamicConfig("./testdata/coll-config-path.yaml", reloadFunc, nil)
	assert.NoError(t, err)
	assert.Equal(t, 0, cnt)
}

func TestNewAgentConfigManager(t *testing.T) {
	logger := newLogger(t)
	mgr := NewAgentConfigManager(logger)
	assert.NotNil(t, mgr)
}

func TestNewAgentConfigManagerEffectiveConfig(t *testing.T) {
	logger := newLogger(t)
	mgr := NewAgentConfigManager(logger)
	assert.NotNil(t, mgr)

	cnt := 0
	reloadFunc := func(contents []byte) error {
		cnt++
		return nil
	}

	cfg, err := NewDynamicConfig("./testdata/coll-config-path.yaml", reloadFunc, nil)
	assert.NoError(t, err)
	assert.Equal(t, 0, cnt)

	mgr.Set(cfg)
	effCfg, err := mgr.CreateEffectiveConfigMsg()
	assert.NoError(t, err)
	assert.NotNil(t, effCfg)
	bytes, err := os.ReadFile("./testdata/coll-config-path.yaml")
	assert.NoError(t, err)
	assert.Equal(t, effCfg.GetConfigMap().ConfigMap["collector.yaml"].GetContentType(), "text/yaml")
	assert.Equal(t, effCfg.GetConfigMap().ConfigMap["collector.yaml"].Body, bytes)
}

func TestNewDynamicConfigAddsInstanceId(t *testing.T) {
	// make a copy of the original file
	func() {
		copy("./testdata/service-instance-id.yaml", "./testdata/service-instance-id-copy.yaml")
	}()

	// restore the original file
	defer func() {
		copy("./testdata/service-instance-id-copy.yaml", "./testdata/service-instance-id.yaml")
		os.Remove("./testdata/service-instance-id-copy.yaml")
	}()

	_, err := NewDynamicConfig("./testdata/service-instance-id.yaml", func(contents []byte) error { return nil }, nil)
	assert.NoError(t, err)

	bytes, err := os.ReadFile("./testdata/service-instance-id.yaml")
	assert.NoError(t, err)
	assert.Contains(t, string(bytes), "service.instance.id: ")
}

func TestNewAgentConfigManagerApply(t *testing.T) {
	// make a copy of the original file
	func() {
		copy("./testdata/coll-config-path.yaml", "./testdata/coll-config-path-copy.yaml")
		copy("./testdata/coll-config-path-changed.yaml", "./testdata/coll-config-path-changed-copy.yaml")
	}()

	// restore the original file
	defer func() {
		copy("./testdata/coll-config-path-copy.yaml", "./testdata/coll-config-path.yaml")
		copy("./testdata/coll-config-path-changed-copy.yaml", "./testdata/coll-config-path-changed.yaml")
		os.Remove("./testdata/coll-config-path-copy.yaml")
		os.Remove("./testdata/coll-config-path-changed-copy.yaml")
	}()

	logger := newLogger(t)
	mgr := NewAgentConfigManager(logger)
	assert.NotNil(t, mgr)
	mgr.initialConfigReceived = true

	cnt := 0
	reloadFunc := func(contents []byte) error {
		cnt++
		return nil
	}

	cfg, err := NewDynamicConfig("./testdata/coll-config-path.yaml", reloadFunc, nil)
	assert.NoError(t, err)
	assert.Equal(t, 0, cnt)

	mgr.Set(cfg)
	effCfg, err := mgr.CreateEffectiveConfigMsg()
	assert.NoError(t, err)
	assert.NotNil(t, effCfg)

	// Apply the same config again
	changed, err := mgr.Apply(&protobufs.AgentRemoteConfig{
		Config: &protobufs.AgentConfigMap{
			ConfigMap: effCfg.GetConfigMap().ConfigMap,
		},
	})
	assert.NoError(t, err)
	assert.Equal(t, false, changed)
	assert.Equal(t, 0, cnt)

	newContent, err := os.ReadFile("./testdata/coll-config-path-changed.yaml")
	assert.NoError(t, err)
	newEffCfg := &protobufs.AgentRemoteConfig{
		Config: &protobufs.AgentConfigMap{
			ConfigMap: map[string]*protobufs.AgentConfigFile{
				"collector.yaml": {
					ContentType: "text/yaml",
					Body:        newContent,
				},
			},
		},
	}

	// Apply a different config
	changed, err = mgr.Apply(newEffCfg)
	assert.NoError(t, err)
	assert.Equal(t, true, changed)
	assert.Equal(t, 1, cnt)
}
