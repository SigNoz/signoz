package alertmanagerserver

import (
	"bytes"
	"context"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager/nfmanagertest"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes/alertmanagertypestest"
	"github.com/go-openapi/strfmt"
	"github.com/prometheus/alertmanager/api/v2/models"
	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/client_golang/prometheus"
	commoncfg "github.com/prometheus/common/config"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestServerSetConfigAndStop(t *testing.T) {
	notificationManager := nfmanagertest.NewMock()
	server, err := New(context.Background(), slog.New(slog.DiscardHandler), prometheus.NewRegistry(), NewConfig(), "1", alertmanagertypestest.NewStateStore(), notificationManager)
	require.NoError(t, err)

	amConfig, err := alertmanagertypes.NewDefaultConfig(alertmanagertypes.GlobalConfig{}, alertmanagertypes.RouteConfig{GroupInterval: 1 * time.Minute, RepeatInterval: 1 * time.Minute, GroupWait: 1 * time.Minute}, "1")
	require.NoError(t, err)

	assert.NoError(t, server.SetConfig(context.Background(), amConfig))
	assert.NoError(t, server.Stop(context.Background()))
}

func TestServerTestReceiverTypeWebhook(t *testing.T) {
	notificationManager := nfmanagertest.NewMock()
	server, err := New(context.Background(), slog.New(slog.DiscardHandler), prometheus.NewRegistry(), NewConfig(), "1", alertmanagertypestest.NewStateStore(), notificationManager)
	require.NoError(t, err)

	amConfig, err := alertmanagertypes.NewDefaultConfig(alertmanagertypes.GlobalConfig{}, alertmanagertypes.RouteConfig{GroupInterval: 1 * time.Minute, RepeatInterval: 1 * time.Minute, GroupWait: 1 * time.Minute}, "1")
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
	notificationManager := nfmanagertest.NewMock()
	server, err := New(context.Background(), slog.New(slog.DiscardHandler), prometheus.NewRegistry(), srvCfg, "1", stateStore, notificationManager)
	require.NoError(t, err)

	amConfig, err := alertmanagertypes.NewDefaultConfig(srvCfg.Global, srvCfg.Route, "1")
	require.NoError(t, err)

	require.NoError(t, amConfig.CreateReceiver(alertmanagertypes.Receiver{
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

func TestServerTestAlert(t *testing.T) {
	stateStore := alertmanagertypestest.NewStateStore()
	srvCfg := NewConfig()
	srvCfg.Route.GroupInterval = 1 * time.Second
	notificationManager := nfmanagertest.NewMock()
	server, err := New(context.Background(), slog.New(slog.DiscardHandler), prometheus.NewRegistry(), srvCfg, "1", stateStore, notificationManager)
	require.NoError(t, err)

	amConfig, err := alertmanagertypes.NewDefaultConfig(srvCfg.Global, srvCfg.Route, "1")
	require.NoError(t, err)

	webhook1Listener, err := net.Listen("tcp", "localhost:0")
	require.NoError(t, err)
	webhook2Listener, err := net.Listen("tcp", "localhost:0")
	require.NoError(t, err)

	requestCount1 := 0
	requestCount2 := 0
	webhook1Server := &http.Server{
		Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			requestCount1++
			w.WriteHeader(http.StatusOK)
		}),
	}
	webhook2Server := &http.Server{
		Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			requestCount2++
			w.WriteHeader(http.StatusOK)
		}),
	}

	go func() {
		_ = webhook1Server.Serve(webhook1Listener)
	}()
	go func() {
		_ = webhook2Server.Serve(webhook2Listener)
	}()

	webhook1URL, err := url.Parse("http://" + webhook1Listener.Addr().String() + "/webhook")
	require.NoError(t, err)
	webhook2URL, err := url.Parse("http://" + webhook2Listener.Addr().String() + "/webhook")
	require.NoError(t, err)

	require.NoError(t, amConfig.CreateReceiver(alertmanagertypes.Receiver{
		Name: "receiver-1",
		WebhookConfigs: []*config.WebhookConfig{
			{
				HTTPConfig: &commoncfg.HTTPClientConfig{},
				URL:        &config.SecretURL{URL: webhook1URL},
			},
		},
	}))

	require.NoError(t, amConfig.CreateReceiver(alertmanagertypes.Receiver{
		Name: "receiver-2",
		WebhookConfigs: []*config.WebhookConfig{
			{
				HTTPConfig: &commoncfg.HTTPClientConfig{},
				URL:        &config.SecretURL{URL: webhook2URL},
			},
		},
	}))

	require.NoError(t, server.SetConfig(context.Background(), amConfig))
	defer func() {
		_ = server.Stop(context.Background())
		_ = webhook1Server.Close()
		_ = webhook2Server.Close()
	}()

	// Test with multiple alerts going to different receivers
	alert1 := &alertmanagertypes.PostableAlert{
		Annotations: models.LabelSet{"alertname": "test-alert-1"},
		StartsAt:    strfmt.DateTime(time.Now()),
		Alert: models.Alert{
			Labels: models.LabelSet{"alertname": "test-alert-1", "severity": "critical"},
		},
	}
	alert2 := &alertmanagertypes.PostableAlert{
		Annotations: models.LabelSet{"alertname": "test-alert-2"},
		StartsAt:    strfmt.DateTime(time.Now()),
		Alert: models.Alert{
			Labels: models.LabelSet{"alertname": "test-alert-2", "severity": "warning"},
		},
	}

	receiversMap := map[*alertmanagertypes.PostableAlert][]string{
		alert1: {"receiver-1", "receiver-2"},
		alert2: {"receiver-2"},
	}

	config := &alertmanagertypes.NotificationConfig{
		NotificationGroup: make(map[model.LabelName]struct{}),
		GroupByAll:        false,
	}

	err = server.TestAlert(context.Background(), receiversMap, config)
	require.NoError(t, err)

	time.Sleep(100 * time.Millisecond)

	assert.Greater(t, requestCount1, 0, "receiver-1 should have received at least one request")
	assert.Greater(t, requestCount2, 0, "receiver-2 should have received at least one request")
}

func TestServerTestAlertContinuesOnFailure(t *testing.T) {
	stateStore := alertmanagertypestest.NewStateStore()
	srvCfg := NewConfig()
	srvCfg.Route.GroupInterval = 1 * time.Second
	notificationManager := nfmanagertest.NewMock()
	server, err := New(context.Background(), slog.New(slog.DiscardHandler), prometheus.NewRegistry(), srvCfg, "1", stateStore, notificationManager)
	require.NoError(t, err)

	amConfig, err := alertmanagertypes.NewDefaultConfig(srvCfg.Global, srvCfg.Route, "1")
	require.NoError(t, err)

	// Create one working webhook and one failing receiver (non-existent)
	webhookListener, err := net.Listen("tcp", "localhost:0")
	require.NoError(t, err)

	requestCount := 0
	webhookServer := &http.Server{
		Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			requestCount++
			w.WriteHeader(http.StatusOK)
		}),
	}

	go func() {
		_ = webhookServer.Serve(webhookListener)
	}()

	webhookURL, err := url.Parse("http://" + webhookListener.Addr().String() + "/webhook")
	require.NoError(t, err)

	require.NoError(t, amConfig.CreateReceiver(alertmanagertypes.Receiver{
		Name: "working-receiver",
		WebhookConfigs: []*config.WebhookConfig{
			{
				HTTPConfig: &commoncfg.HTTPClientConfig{},
				URL:        &config.SecretURL{URL: webhookURL},
			},
		},
	}))

	require.NoError(t, amConfig.CreateReceiver(alertmanagertypes.Receiver{
		Name: "failing-receiver",
		WebhookConfigs: []*config.WebhookConfig{
			{
				HTTPConfig: &commoncfg.HTTPClientConfig{},
				URL:        &config.SecretURL{URL: &url.URL{Scheme: "http", Host: "localhost:1", Path: "/webhook"}},
			},
		},
	}))

	require.NoError(t, server.SetConfig(context.Background(), amConfig))
	defer func() {
		_ = server.Stop(context.Background())
		_ = webhookServer.Close()
	}()

	alert := &alertmanagertypes.PostableAlert{
		Annotations: models.LabelSet{"alertname": "test-alert"},
		StartsAt:    strfmt.DateTime(time.Now()),
		Alert: models.Alert{
			Labels: models.LabelSet{"alertname": "test-alert"},
		},
	}

	receiversMap := map[*alertmanagertypes.PostableAlert][]string{
		alert: {"working-receiver", "failing-receiver"},
	}

	config := &alertmanagertypes.NotificationConfig{
		NotificationGroup: make(map[model.LabelName]struct{}),
		GroupByAll:        false,
	}

	err = server.TestAlert(context.Background(), receiversMap, config)
	assert.Error(t, err)

	time.Sleep(100 * time.Millisecond)

	assert.Greater(t, requestCount, 0, "working-receiver should have received at least one request even though failing-receiver failed")
}
