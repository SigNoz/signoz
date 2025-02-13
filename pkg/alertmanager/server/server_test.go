package server

import (
	"bytes"
	"context"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"testing"
	"time"

	"github.com/go-openapi/strfmt"
	"github.com/prometheus/alertmanager/api/v2/models"
	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/client_golang/prometheus"
	commoncfg "github.com/prometheus/common/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/types/alertmanagertypes"
	"go.signoz.io/signoz/pkg/types/alertmanagertypes/alertmanagertypestest"
)

func TestServerSetConfigAndStop(t *testing.T) {
	server, err := New(context.Background(), slog.New(slog.NewTextHandler(io.Discard, nil)), prometheus.NewRegistry(), NewConfig(), "1", alertmanagertypestest.NewStateStore())
	require.NoError(t, err)

	amConfig, err := alertmanagertypes.NewDefaultConfig(alertmanagertypes.GlobalConfig{}, alertmanagertypes.RouteConfig{}, "1")
	require.NoError(t, err)

	assert.NoError(t, server.SetConfig(context.Background(), amConfig))
	assert.NoError(t, server.Stop(context.Background()))
}

func TestServerTestReceiverTypeWebhook(t *testing.T) {
	server, err := New(context.Background(), slog.New(slog.NewTextHandler(io.Discard, nil)), prometheus.NewRegistry(), NewConfig(), "1", alertmanagertypestest.NewStateStore())
	require.NoError(t, err)

	amConfig, err := alertmanagertypes.NewDefaultConfig(alertmanagertypes.GlobalConfig{}, alertmanagertypes.RouteConfig{}, "1")
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

	require.NoError(t, server.SetConfig(context.Background(), amConfig))
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

	assert.NoError(t, err)
	assert.Contains(t, requestBody.String(), "test-receiver")
	assert.Contains(t, requestBody.String(), "firing")
}

func TestServerPutAlerts(t *testing.T) {
	stateStore := alertmanagertypestest.NewStateStore()
	srvCfg := NewConfig()
	srvCfg.Route.GroupInterval = 1 * time.Second
	server, err := New(context.Background(), slog.New(slog.NewTextHandler(io.Discard, nil)), prometheus.NewRegistry(), srvCfg, "1", stateStore)
	require.NoError(t, err)

	amConfig, err := alertmanagertypes.NewDefaultConfig(srvCfg.Global, srvCfg.Route, "1")
	require.NoError(t, err)

	require.NoError(t, amConfig.CreateReceiver(&config.Route{Receiver: "test-receiver", Continue: true}, alertmanagertypes.Receiver{
		Name: "test-receiver",
		WebhookConfigs: []*config.WebhookConfig{
			{
				HTTPConfig: &commoncfg.HTTPClientConfig{},
				URL:        &config.SecretURL{URL: &url.URL{Host: "localhost", Path: "/test-receiver"}},
			},
		},
	}))

	require.NoError(t, server.SetConfig(context.Background(), amConfig))

	require.NoError(t, server.PutAlerts(context.Background(), alertmanagertypes.PostableAlerts{
		{
			Annotations: models.LabelSet{"alertname": "test-alert"},
			StartsAt:    strfmt.DateTime(time.Now().Add(-time.Hour)),
			EndsAt:      strfmt.DateTime(time.Now().Add(time.Hour)),
			Alert: models.Alert{
				GeneratorURL: "http://localhost:8080/test-alert",
				Labels:       models.LabelSet{"alertname": "test-alert"},
			},
		},
	}))
	require.NotEmpty(t, server.alerts)

	dummyRequest, err := http.NewRequest(http.MethodGet, "/alerts", nil)
	require.NoError(t, err)

	params, err := alertmanagertypes.NewGettableAlertsParams(dummyRequest)
	require.NoError(t, err)
	gettableAlerts, err := server.GetAlerts(context.Background(), params)
	require.NoError(t, err)

	assert.Equal(t, 1, len(gettableAlerts))
	assert.Equal(t, gettableAlerts[0].Alert.Labels["alertname"], "test-alert")
	assert.NoError(t, server.Stop(context.Background()))
}
