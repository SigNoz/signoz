package alertmanagerserver

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/alertmanager"
	"go.signoz.io/signoz/pkg/alertmanager/alertmanagerstore/memoryalertmanagerstore"
	"go.signoz.io/signoz/pkg/factory/providertest"
)

func TestServerStartStop(t *testing.T) {
	server, err := New(context.Background(), providertest.NewSettings(), alertmanager.NewConfig().(alertmanager.Config), "org", memoryalertmanagerstore.New())
	require.NoError(t, err)

	require.NoError(t, server.Start(context.Background()))
	require.NoError(t, server.Stop(context.Background()))
}

func TestServerWithDefaultConfig(t *testing.T) {
	server, err := New(context.Background(), providertest.NewSettings(), alertmanager.NewConfig().(alertmanager.Config), "org", memoryalertmanagerstore.New())
	require.NoError(t, err)

	require.NoError(t, server.Start(context.Background()))
	defer require.NoError(t, server.Stop(context.Background()))

	assert.Equal(t, `{"global":{"resolve_timeout":"5m","http_config":{"tls_config":{"insecure_skip_verify":false},"follow_redirects":true,"enable_http2":true,"proxy_url":null},"smtp_from":"alertmanager@signoz.io","smtp_hello":"localhost","smtp_smarthost":"localhost:25","smtp_require_tls":true,"smtp_tls_config":{"insecure_skip_verify":false},"pagerduty_url":"https://events.pagerduty.com/v2/enqueue","opsgenie_api_url":"https://api.opsgenie.com/","wechat_api_url":"https://qyapi.weixin.qq.com/cgi-bin/","victorops_api_url":"https://alert.victorops.com/integrations/generic/20131114/alert/","telegram_api_url":"https://api.telegram.org","webex_api_url":"https://webexapis.com/v1/messages","rocketchat_api_url":"https://open.rocket.chat/"},"route":{"receiver":"default-receiver","group_by":["alertname"],"group_wait":"30s","group_interval":"5m","repeat_interval":"4h"},"receivers":[{"name":"default-receiver"}],"templates":null}`, string(server.alertmanagerConfigRaw))
}
