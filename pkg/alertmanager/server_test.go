package alertmanager

import (
	"bytes"
	"context"
	"net"
	"net/http"
	"net/url"
	"testing"

	"github.com/prometheus/alertmanager/config"
	commoncfg "github.com/prometheus/common/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/alertmanager/alertmanagerstore"
	"go.signoz.io/signoz/pkg/alertmanager/alertmanagerstore/alertmanagerstoretest"
	"go.signoz.io/signoz/pkg/factory/factorytest"
	"go.signoz.io/signoz/pkg/factory/providertest"
	"go.signoz.io/signoz/pkg/types/alertmanagertypes"
)

func TestServerStartStop(t *testing.T) {
	store, err := alertmanagerstoretest.New(context.Background(), providertest.NewSettings(), alertmanagerstore.NewConfig().(alertmanagerstore.Config), []uint64{1})
	require.NoError(t, err)
	server, err := NewForOrg(context.Background(), factorytest.NewSettings(), NewConfig().(Config), 1, store)
	require.NoError(t, err)

	require.NoError(t, server.Start(context.Background()))
	require.NoError(t, server.Stop(context.Background()))
}

func TestServerWithDefaultConfig(t *testing.T) {
	store, err := alertmanagerstoretest.New(context.Background(), providertest.NewSettings(), alertmanagerstore.NewConfig().(alertmanagerstore.Config), []uint64{1})
	require.NoError(t, err)
	server, err := NewForOrg(context.Background(), factorytest.NewSettings(), NewConfig().(Config), 1, store)
	require.NoError(t, err)

	require.NoError(t, server.Start(context.Background()))
	defer require.NoError(t, server.Stop(context.Background()))

	assert.Equal(t, `{"global":{"resolve_timeout":"5m","http_config":{"tls_config":{"insecure_skip_verify":false},"follow_redirects":true,"enable_http2":true,"proxy_url":null},"smtp_from":"alertmanager@signoz.io","smtp_hello":"localhost","smtp_smarthost":"localhost:25","smtp_require_tls":true,"smtp_tls_config":{"insecure_skip_verify":false},"pagerduty_url":"https://events.pagerduty.com/v2/enqueue","opsgenie_api_url":"https://api.opsgenie.com/","wechat_api_url":"https://qyapi.weixin.qq.com/cgi-bin/","victorops_api_url":"https://alert.victorops.com/integrations/generic/20131114/alert/","telegram_api_url":"https://api.telegram.org","webex_api_url":"https://webexapis.com/v1/messages","rocketchat_api_url":"https://open.rocket.chat/"},"route":{"receiver":"default-receiver","group_by":["alertname"],"group_wait":"30s","group_interval":"5m","repeat_interval":"4h"},"receivers":[{"name":"default-receiver"}],"templates":null}`, string(server.alertmanagerConfigRaw))
}

func TestServerTestReceiverWebhook(t *testing.T) {
	store, err := alertmanagerstoretest.New(context.Background(), providertest.NewSettings(), alertmanagerstore.NewConfig().(alertmanagerstore.Config), []uint64{1})
	require.NoError(t, err)
	server, err := NewForOrg(context.Background(), factorytest.NewSettings(), NewConfig().(Config), 1, store)
	require.NoError(t, err)

	webhookListener, err := net.Listen("tcp", "localhost:0")
	require.NoError(t, err)

	requestBody := new(bytes.Buffer)
	webhookServer := &http.Server{
		Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			_, err := requestBody.ReadFrom(r.Body)
			require.NoError(t, err)
			w.WriteHeader(http.StatusOK)
		}),
	}

	go func() {
		require.NoError(t, webhookServer.Serve(webhookListener))
	}()

	require.NoError(t, server.Start(context.Background()))
	defer require.NoError(t, server.Stop(context.Background()))

	webhookURL, err := url.Parse("http://" + webhookListener.Addr().String() + "/webhook")
	require.NoError(t, err)

	err = server.TestReceiver(context.Background(), alertmanagertypes.Receiver{
		Name: "test-receiver",
		WebhookConfigs: []*config.WebhookConfig{
			{
				HTTPConfig: &commoncfg.HTTPClientConfig{},
				URL:        &config.SecretURL{URL: webhookURL},
			},
		},
	})
	require.NoError(t, err)
	require.Contains(t, requestBody.String(), "test-receiver")
	require.Contains(t, requestBody.String(), "firing")
}
