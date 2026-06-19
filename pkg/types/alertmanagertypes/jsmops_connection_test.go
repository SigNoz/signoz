package alertmanagertypes

import (
	"testing"
	"time"

	"github.com/prometheus/alertmanager/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestSetJsmOpsOrgID verifies that the runtime OrgID is stamped onto every JSM Ops config at load time.
func TestSetJsmOpsOrgID(t *testing.T) {
	cfg, err := NewDefaultConfig(
		GlobalConfig{SMTPSmarthost: config.HostPort{Host: "localhost", Port: "25"}, SMTPFrom: "test@example.com"},
		RouteConfig{GroupInterval: time.Minute, GroupWait: time.Minute, RepeatInterval: time.Minute},
		"org-1",
	)
	require.NoError(t, err)

	receiver, err := NewReceiver(`{"name":"jcc","jsmops_configs":[{"connection_id":"conn-1","message":"m"}]}`)
	require.NoError(t, err)
	require.NoError(t, cfg.CreateReceiver(receiver))

	got, err := cfg.GetReceiver("jcc")
	require.NoError(t, err)
	require.Len(t, got.JsmOpsConfigs, 1)
	assert.Empty(t, got.JsmOpsConfigs[0].OrgID)

	assert.Contains(t, cfg.StoreableConfig().Config, "conn-1")

	cfg.SetJsmOpsOrgID("org-1")

	got, err = cfg.GetReceiver("jcc")
	require.NoError(t, err)
	assert.Equal(t, "org-1", got.JsmOpsConfigs[0].OrgID)

	require.NoError(t, cfg.SetRouteConfig(RouteConfig{GroupInterval: time.Minute, GroupWait: time.Minute, RepeatInterval: time.Minute}))
	assert.NotContains(t, cfg.StoreableConfig().Config, "org-1")
}
